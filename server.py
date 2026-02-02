import torch
from transformers import AutoProcessor, Qwen2_5_VLForConditionalGeneration, BitsAndBytesConfig
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import base64
from io import BytesIO
from PIL import Image
import os
import httpx

# إعداد التطبيق
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- إعدادات OpenRouter للدردشة المجانية ---
OPENROUTER_API_KEY = "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" # يمكنك تغييره لاحقاً
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
# سنستخدم موديل Qwen 2.5 72B المجاني من OpenRouter للحصول على أفضل جودة عربية
CHAT_MODEL_EXTERNAL = "qwen/qwen-2.5-72b-instruct:free" 

# --- إعدادات الموديل المحلي للرؤية والبث ---
VISION_MODEL_ID = "./models/Qwen2.5-VL-7B-Instruct"

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
)

print("--- جاري تحميل موديل الرؤية (VL 7B) محلياً للبث المباشر ---")
# تحميل موديل الرؤية فقط لتوفير الـ VRAM للبث
vl_processor = AutoProcessor.from_pretrained(VISION_MODEL_ID)
vl_model = Qwen2_5_VLForConditionalGeneration.from_pretrained(
    VISION_MODEL_ID,
    quantization_config=quantization_config,
    device_map="auto",
    trust_remote_code=True
)

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    """
    هذا المسار يرسل الدردشة النصية إلى API خارجي مجاني لتوفير موارد الجهاز
    """
    body = await request.json()
    messages = body.get("messages", [])
    
    # إضافة لمسة سعودية
    system_instruction = {
        "role": "system", 
        "content": "أنت 'دليل'، مساعد ذكي يتحدث باللهجة السعودية البيضاء العفوية. تفاعل بمرح وأدب."
    }
    full_messages = [system_instruction] + messages

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "http://localhost:6000", # اختياري
                    "X-Title": "GuideMe App",
                },
                json={
                    "model": CHAT_MODEL_EXTERNAL,
                    "messages": full_messages,
                },
                timeout=60.0
            )
            
            if response.status_code != 200:
                print(f"OpenRouter Error: {response.text}")
                return {"choices": [{"message": {"role": "assistant", "content": "عذراً يا غالي، يبدو فيه مشكلة في الاتصال بالسيرفر الخارجي. جرب مرة ثانية."}}]}
            
            return response.json()
        except Exception as e:
            print(f"API Error: {e}")
            return {"choices": [{"message": {"role": "assistant", "content": "والله يا خوي الـ API الخارجي فيه مشكلة حالياً."}}]}

@app.post("/v1/vision/analyze")
async def vision_analyze(request: Request):
    """
    هذا المسار يستخدم الموديل المحلي للتحليل اللحظي للكاميرا (بث مباشر)
    """
    body = await request.json()
    image_base64 = body.get("image")
    prompt_text = body.get("prompt", "ماذا ترى في هذه الصورة؟ صفها بدقة لمكفوف باللغة العربية بأسلوب دليل (باللهجة السعودية).")

    if not image_base64:
        raise HTTPException(status_code=400, detail="Image is required")

    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_data)).convert("RGB")

        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": prompt_text},
                ],
            }
        ]

        text = vl_processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
        inputs = vl_processor(text=[text], images=[image], padding=True, return_tensors="pt").to(vl_model.device)

        with torch.no_grad():
            generated_ids = vl_model.generate(**inputs, max_new_tokens=512)
        
        generated_ids_trimmed = [
            out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
        ]
        response_text = vl_processor.batch_decode(generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]

        return {"content": response_text}
    except Exception as e:
        print(f"Local Vision Error: {e}")
        return {"content": "واجهت مشكلة في قراءة الكاميرا محلياً."}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=6000)
