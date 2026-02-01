import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoProcessor, BitsAndBytesConfig, Qwen2_5_VLForConditionalGeneration
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import base64
from io import BytesIO
from PIL import Image
import os

# إعداد التطبيق
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# مسارات الموديلات المحلية
CHAT_MODEL_ID = "./models/Qwen2.5-14B-Instruct"
VISION_MODEL_ID = "./models/Qwen2.5-VL-7B-Instruct"

# إعدادات الضغط (4-bit) لتناسب 16GB VRAM
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
)

print("--- جاري تحميل موديل الدردشة (14B) ---")
chat_tokenizer = AutoTokenizer.from_pretrained(CHAT_MODEL_ID)
chat_model = AutoModelForCausalLM.from_pretrained(
    CHAT_MODEL_ID,
    quantization_config=quantization_config,
    device_map="auto",
    trust_remote_code=True
)

print("--- جاري تحميل موديل الرؤية (VL 7B) ---")
# موديل الرؤية يحتاج Processor بدلاً من Tokenizer فقط
vl_processor = AutoProcessor.from_pretrained(VISION_MODEL_ID)
vl_model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    VISION_MODEL_ID,
    quantization_config=quantization_config,
    device_map="auto",
    trust_remote_code=True
)

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    
    # تحويل الرسائل لتنسيق الموديل مع بصمة سعودية
    system_instruction = {
        "role": "system", 
        "content": "أنت 'دليل'، مساعد ذكي يتحدث باللهجة السعودية البيضاء العفوية. تفاعل بمرح وأدب."
    }
    full_messages = [system_instruction] + messages
    
    text = chat_tokenizer.apply_chat_template(full_messages, tokenize=False, add_generation_prompt=True)
    model_inputs = chat_tokenizer([text], return_tensors="pt").to(chat_model.device)

    with torch.no_grad():
        generated_ids = chat_model.generate(**model_inputs, max_new_tokens=512)
    
    generated_ids = [output_ids[len(input_ids):] for input_ids, output_ids in zip(model_inputs.input_ids, generated_ids)]
    response_text = chat_tokenizer.batch_decode(generated_ids, skip_special_tokens=True)[0]

    return {
        "choices": [{"message": {"role": "assistant", "content": response_text}}]
    }

@app.post("/v1/vision/analyze")
async def vision_analyze(request: Request):
    body = await request.json()
    image_base64 = body.get("image") # Base64 string
    prompt_text = body.get("prompt", "ماذا ترى في هذه الصورة؟ صفها بدقة لمكفوف باللغة العربية بأسلوب دليل (باللهجة السعودية).")

    if not image_base64:
        raise HTTPException(status_code=400, detail="Image is required")

    # معالجة الصورة
    image_data = base64.b64decode(image_base64)
    image = Image.open(BytesIO(image_data)).convert("RGB")

    # إعداد الرسالة لموديل الرؤية
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt_text},
            ],
        }
    ]

    # تحويل الرسائل لتنسيق VL
    text = vl_processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = vl_processor(text=[text], images=[image], padding=True, return_tensors="pt").to(vl_model.device)

    with torch.no_grad():
        generated_ids = vl_model.generate(**inputs, max_new_tokens=512)
    
    generated_ids_trimmed = [
        out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    response_text = vl_processor.batch_decode(generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]

    return {"content": response_text}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=6000)
