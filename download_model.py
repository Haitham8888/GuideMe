import os
from huggingface_hub import snapshot_download

# إنشاء مجلد الموديلات
model_dir = "./models/Qwen2.5-14B-Instruct"
os.makedirs(model_dir, exist_ok=True)

print(f"جاري بدء تحميل الموديل إلى: {model_dir}")
print("هذه العملية قد تستغرق وقتاً حسب سرعة الإنترنت (الحجم حوالي 28 جيجابايت)...")

snapshot_download(
    repo_id="Qwen/Qwen2.5-14B-Instruct",
    local_dir=model_dir,
    local_dir_use_symlinks=False,
    ignore_patterns=["*.msgpack", "*.h5", "*.ot"], # تحميل ملفات الـ SafeTensors فقط لتوفير المساحة
)

print("\nتم التحميل بنجاح!")
print("الآن يمكنك تشغيل السيرفر.")
