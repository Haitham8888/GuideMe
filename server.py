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

# عرض الملفات الثابتة بشكل صريح لضمان عمل الـ CSS و الـ JS
@app.get("/styles.css")
async def get_css():
    return FileResponse("styles.css")

@app.get("/app.js")
async def get_js():
    return FileResponse("app.js")

@app.get("/logo.png")
async def get_logo():
    return FileResponse("logo.png")

@app.get("/")
async def read_index():
    return FileResponse("index.html")

# --- إعدادات OpenRouter ---
OPENROUTER_API_KEY = "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"
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# الموديلات المستخدمة (مجانية وسريعة)
CHAT_MODEL = "qwen/qwen-2.5-72b-instruct:free"
VISION_MODEL = "google/gemini-2.0-flash-exp:free" 

@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    
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
            print(f"Chat Error: {e}")
            return {"choices": [{"message": {"role": "assistant", "content": "عذراً، المتحدث الآلي متعطل حالياً."}}]}

@app.post("/v1/vision/analyze")
async def vision_analyze(request: Request):
    """
    تحليل الصور باستخدام OpenRouter و Gemini Flash
    """
    body = await request.json()
    image_base64 = body.get("image")
    prompt_text = body.get("prompt", "ماذا ترى في هذه الصورة؟ صفها بدقة لمكفوف باللغة العربية بأسلوب دليل (باللهجة السعودية وعفوية).")

    if not image_base64:
        raise HTTPException(status_code=400, detail="Image is required")

    # تنسيق الرسائل لـ OpenRouter مع صورة
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
        try:
            response = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "HTTP-Referer": "http://localhost:8888",
                    "X-Title": "GuideMe App",
                },
                json={
                    "model": VISION_MODEL,
                    "messages": messages,
                },
                timeout=60.0
            )
            
            res_data = response.json()
            if "choices" in res_data:
                return {"content": res_data["choices"][0]["message"]["content"]}
            else:
                print(f"Vision Error Response: {res_data}")
                return {"content": "ما قدرت أحلل الصورة حالياً، جرب مرة ثانية."}
                
        except Exception as e:
            print(f"Vision API Error: {e}")
            return {"content": "حدث خطأ في الاتصال بسيرفر الرؤية."}

if __name__ == "__main__":
    print("--- تشغيل سيرفر GuideMe الخفيف جداً (API Mode) على المنفذ 8888 ---")
    print("--- الآن يشتغل فوراً وبدون استهلاك للـ GPU ---")
    uvicorn.run(app, host="0.0.0.0", port=8888)
