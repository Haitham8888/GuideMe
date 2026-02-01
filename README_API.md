# Qwen 2.5 14B Arabic API Server (Transformers Version)

هذا المشروع يوفر واجهة API متوافقة مع OpenAI لتشغيل موديل **Qwen 2.5 14B Instruct** محلياً باستخدام تقنية 4-bit quantization لتناسب كرت A4000 16GB.

## المميزات
- يدعم اللغة العربية بطلاقة عالية.
- يستخدم `bitsandbytes` للضغط لتوفير مساحة الـ VRAM.
- واجهة API متوافقة مع تطبيقات OpenAI.

## المتطلبات
- NVIDIA GPU (16GB VRAM)
- مساحة تخزين (Disk Space): ~30GB

## طريقة التثبيت
1. إنشاء البيئة:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
2. تثبيت المكتبات:
   ```bash
   pip install torch transformers accelerate bitsandbytes fastapi uvicorn
   ```

## التشغيل
ببساطة قم بتشغيل السيرفر، وسيقوم بتحميل الموديل تلقائياً في أول مرة:
```bash
python server.py
```

## ملاحظة
إذا كان التحميل بطيئاً أو واجهت مشكلة في مساحة القرص، يمكنك استخدام نسخة GGUF مع Ollama كبديل أخف.
