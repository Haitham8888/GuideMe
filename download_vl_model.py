import os
from huggingface_hub import snapshot_download

# إنشاء مجلد موديل الرؤية
model_dir = "./models/Qwen2.5-VL-7B-Instruct"
os.makedirs(model_dir, exist_ok=True)

print(f"جاري بدء تحميل موديل الرؤية (VL) إلى: {model_dir}")
print("الحجم حوالي 15-18 جيجابايت...")

snapshot_download(
    repo_id="Qwen/Qwen2.5-VL-7B-Instruct",
    local_dir=model_dir,
    local_dir_use_symlinks=False,
    ignore_patterns=["*.msgpack", "*.h5", "*.ot"],
)

print("\nتم تحميل موديل الرؤية بنجاح!")
