import os
import base64
import httpx
import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- إعدادات Google Gemini API ---
GEMINI_API_KEY = "AIzaSyCbSc3NfM7MxMVdMVmk9IIkd02qyomi8qY"
# نستخدم v1beta للوصول لأحدث الميزات
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"

# هوية المساعد الذكي
SYSTEM_PROMPT = "أنت 'دليل' المساعد الذكي لمشروع GuideMe. مهمتك مساعدة المكفوفين. تتحدث باللهجة السعودية البيضاء الودودة. إجاباتك مختصرة ومفيدة جداً."

# إعدادات الحماية لضمان عدم حجب الصور المخصصة للمكفوفين (لأغراض المساعدة فقط)
SAFETY_SETTINGS = [
    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
]

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
    user_text = messages[-1]["content"] if messages else "مرحبا"
    
    payload = {
        "contents": [{"parts": [{"text": f"{SYSTEM_PROMPT}\n\nالمستخدم: {user_text}"}]}],
        "generationConfig": {"maxOutputTokens": 512, "temperature": 0.7},
        "safetySettings": SAFETY_SETTINGS
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(GEMINI_URL, json=payload, timeout=30.0)
            res_data = response.json()
            if "candidates" in res_data:
                text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                return {"choices": [{"message": {"role": "assistant", "content": text}}]}
            else:
                print(f"DEBUG - Chat Error Response: {res_data}")
                return JSONResponse({"choices": [{"message": {"content": "يا هلا بك، أخوك دليل معك بس فيه مشكلة بسيطة في الاتصال."}}]}, status_code=200)
        except Exception as e:
            return JSONResponse({"choices": [{"message": {"content": "معليش، السيرفر ما رد علي، جرب مرة ثانية."}}]}, status_code=200)

@app.post("/v1/vision/analyze")
async def vision_analyze(request: Request):
    body = await request.json()
    image_base64 = body.get("image")
    prompt_text = body.get("prompt", "وش تشوف في هالصورة؟ صفها للمكفوفين باختصار شديد باللهجة السعودية.")

    if not image_base64:
        raise HTTPException(status_code=400, detail="Image is required")

    payload = {
        "contents": [{
            "parts": [
                {"text": f"{SYSTEM_PROMPT}\n\n{prompt_text}"},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_base64}}
            ]
        }],
        "generationConfig": {"maxOutputTokens": 300, "temperature": 0.4},
        "safetySettings": SAFETY_SETTINGS
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(GEMINI_URL, json=payload, timeout=60.0)
            res_data = response.json()
            if "candidates" in res_data:
                output_text = res_data["candidates"][0]["content"]["parts"][0]["text"]
                print(f"DEBUG - Gemini Vision: {output_text}")
                return {"content": output_text}
            else:
                # طباعة الخطأ الحقيقي في التيرمينال للتشخيص
                if "error" in res_data:
                    print(f"!!! Gemini API Error: {res_data['error']['message']}")
                elif "promptFeedback" in res_data:
                    print(f"!!! Gemini Safety Block: {res_data['promptFeedback']}")
                else:
                    print(f"!!! Gemini Unknown Error: {res_data}")
                
                return {"content": "الكاميرا مغبشة شوي أو فيه مشكلة في الصورة، جرب مرة ثانية."}
        except Exception as e:
            print(f"Vision Connection Error: {e}")
            return {"content": "معليش، ما قدرت أحلل الصورة حالياً."}

if __name__ == "__main__":
    print("--- محرك 'دليل GuideMe' يعمل الآن بنظام Gemini (النسخة المطورة) ---")
    uvicorn.run(app, host="0.0.0.0", port=8888)
