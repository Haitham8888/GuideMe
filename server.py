import os
import base64
import httpx
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# إعداد التطبيق
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# عرض الملفات الثابتة
@app.get("/styles.css")
async def get_css():
    return FileResponse("styles.css")

@app.get("/app.js")
async def get_js():
    return FileResponse("app.js")

@app.get("/logo.png")
async def get_logo():
    if os.path.exists("logo.png"):
        return FileResponse("logo.png")
    return JSONResponse({"error": "Logo not found"}, status_code=404)

@app.get("/")
async def read_index():
    return FileResponse("index.html")

# --- إعدادات OpenRouter ---
OPENROUTER_API_KEY = "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# قائمة الموديلات (الأكثر استقراراً حالياً في OpenRouter)
VISION_MODELS = [
    "google/gemini-2.0-flash-001",
    "qwen/qwen-vl-plus",
    "google/gemma-3-27b-it:free",
    "qwen/qwen2.5-vl-7b-instruct:free",
    "mistralai/pixtral-12b"
]
CHAT_MODEL = "qwen/qwen-2.5-72b-instruct:free"

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    
    system_instruction = {
        "role": "system", 
        "content": "أنت 'دليل'، مساعد ذكي للمكفوفين، تتحدث باللهجة السعودية البيضاء العفوية. كن ودوداً جداً ومرحاً."
    }
    full_messages = [system_instruction] + messages

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "http://localhost:8888",
                    "X-Title": "GuideMe App",
                },
                json={
                    "model": CHAT_MODEL,
                    "messages": full_messages,
                },
                timeout=30.0
            )
            return JSONResponse(content=response.json())
        except Exception as e:
            return {"choices": [{"message": {"role": "assistant", "content": "يا هلا بك، فيه مشكلة بسيطة في الاتصال، جرب مرة ثانية."}}]}

@app.post("/v1/vision/analyze")
async def vision_analyze(request: Request):
    """
    تحليل الصور مع محاولات متعددة لموديلات مختلفة
    """
    body = await request.json()
    image_base64 = body.get("image")
    prompt_text = body.get("prompt", "وصف لي الصورة باللهجة السعودية العفوية كأنك تشرح لمكفوف، ركز على التفاصيل المهمة.")

    if not image_base64:
        raise HTTPException(status_code=400, detail="Image is required")

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt_text},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_base64}"
                    }
                }
            ]
        }
    ]

    async with httpx.AsyncClient() as client:
        for model in VISION_MODELS:
            try:
                print(f"--- محاولة استخدام الموديل: {model} ---")
                response = await client.post(
                    OPENROUTER_URL,
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "HTTP-Referer": "http://localhost:8888",
                        "X-Title": "GuideMe App",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                    },
                    timeout=60.0
                )
                
                res_data = response.json()
                
                if response.status_code == 200 and "choices" in res_data:
                    content = res_data["choices"][0]["message"]["content"]
                    print(f"--- نجح التحليل باستخدام: {model} ---")
                    return {"content": content}
                else:
                    err = res_data.get('error', {}).get('message', 'خطأ مجهول')
                    print(f"فشل {model}: {err}")
                    continue
                    
            except Exception as e:
                print(f"Exception مع {model}: {e}")
                continue

        return {"content": "عذراً، واجهت مشكلة في تحليل الصورة حالياً. يرجى المحاولة مرة أخرى بعد قليل."}

if __name__ == "__main__":
    print("--- تشغيل سيرفر GuideMe (النسخة الأكثر استقراراً) ---")
    uvicorn.run(app, host="0.0.0.0", port=8888)
