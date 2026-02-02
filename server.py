import os
import base64
import torch
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline, AutoProcessor, BitsAndBytesConfig
from qwen_vl_utils import process_vision_info

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- إعداد الموديلات الخفيفة والسريعة ---
# نستخدم 3B للدردشة و 2B للرؤية لضمان سرعة استجابة هائلة
CHAT_MODEL_ID = "Qwen/Qwen2.5-3B-Instruct"
VISION_MODEL_ID = "Qwen/Qwen2-VL-2B-Instruct"

# إعدادات الضغط (Quantization) لجعل الموديلات "ريشة" على كرت الشاشة
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True
)

print(f"--- جاري تشغيل النسخة الخفيفة والسريعة (Turbo Mode) ---")

# 1. تحميل موديل الدردشة (Qwen 3B)
print(f"جاري تحميل موديل الدردشة: {CHAT_MODEL_ID}...")
chat_tokenizer = AutoTokenizer.from_pretrained(CHAT_MODEL_ID)
chat_model = AutoModelForCausalLM.from_pretrained(
    CHAT_MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto"
)
chat_pipe = pipeline("text-generation", model=chat_model, tokenizer=chat_tokenizer)

# 2. تحميل موديل الرؤية (Qwen VL 2B)
print(f"جاري تحميل موديل الرؤية: {VISION_MODEL_ID}...")
vision_model = AutoModelForCausalLM.from_pretrained(
    VISION_MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto"
)
vision_processor = AutoProcessor.from_pretrained(VISION_MODEL_ID)

@app.get("/")
async def read_index(): return FileResponse("index.html")

@app.get("/styles.css")
async def get_css(): return FileResponse("styles.css")

@app.get("/app.js")
async def get_js(): return FileResponse("app.js")

@app.get("/logo.png")
async def get_logo():
    if os.path.exists("logo.png"): return FileResponse("logo.png")
    return JSONResponse({"error": "not found"}, status_code=404)

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    system_prompt = "أنت 'دليل'، مساعد ذكي للمكفوفين، تتحدث باللهجة السعودية البيضاء العفوية. كن ودوداً جداً ومرحاً."
    formatted_messages = [{"role": "system", "content": system_prompt}] + messages

    # توليد الرد بسرعة
    prompt = chat_tokenizer.apply_chat_template(formatted_messages, tokenize=False, add_generation_prompt=True)
    outputs = chat_pipe(prompt, max_new_tokens=256, do_sample=True, temperature=0.7)
    
    generated_text = outputs[0]["generated_text"].split("<|im_start|>assistant\n")[-1].replace("<|im_end|>", "").strip()
    return {"choices": [{"message": {"role": "assistant", "content": generated_text}}]}

@app.post("/v1/vision/analyze")
async def vision_analyze(request: Request):
    body = await request.json()
    image_base64 = body.get("image")
    prompt_text = body.get("prompt", "وصف لي الصورة باللهجة السعودية العفوية كأنك تشرح لمكفوف، ركز على التفاصيل المهمة.")

    if not image_base64:
        raise HTTPException(status_code=400, detail="Image is required")

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": f"data:image/jpeg;base64,{image_base64}"},
                {"type": "text", "text": prompt_text},
            ],
        }
    ]

    text = vision_processor.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    image_inputs, video_inputs = process_vision_info(messages)
    inputs = vision_processor(
        text=[text],
        images=image_inputs,
        videos=video_inputs,
        padding=True,
        return_tensors="pt",
    ).to(vision_model.device)

    # توليد الوصف بسرعة
    generated_ids = vision_model.generate(**inputs, max_new_tokens=256)
    generated_ids_trimmed = [
        out_ids[len(in_ids) :] for in_ids, out_ids in zip(inputs.input_ids, generated_ids)
    ]
    output_text = vision_processor.batch_decode(
        generated_ids_trimmed, skip_special_tokens=True, clean_up_tokenization_spaces=False
    )[0]

    return {"content": output_text}

if __name__ == "__main__":
    print("--- تم تشغيل محرك 'دليل Turbo' المحلي! رشة عطر وجاهزين ---")
    uvicorn.run(app, host="0.0.0.0", port=8888)
