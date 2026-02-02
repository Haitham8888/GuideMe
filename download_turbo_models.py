import os
from huggingface_hub import snapshot_download

# الموديلات السريعة والخفيفة (Turbo Mode)
MODELS = {
    "chat": {
        "repo_id": "Qwen/Qwen2.5-3B-Instruct",
        "local_dir": "./models/Qwen2.5-3B-Instruct"
    },
    "vision": {
        "repo_id": "Qwen/Qwen2-VL-2B-Instruct",
        "local_dir": "./models/Qwen2-VL-2B-Instruct"
    }
}

for name, info in MODELS.items():
    print(f"\n--- جاري تحميل موديل الـ {name.upper()}: {info['repo_id']} ---")
    os.makedirs(info['local_dir'], exist_ok=True)
    
    snapshot_download(
        repo_id=info["repo_id"],
        local_dir=info["local_dir"],
        local_dir_use_symlinks=False,
        ignore_patterns=["*.msgpack", "*.h5", "*.ot"],
    )

print("\n" + "="*40)
print("تم تحميل الموديلات الخفيفة (Turbo) بنجاح!")
print("جاهزون لتشغيل المساعد 'دليل' في وضع السرعة القصوى.")
print("="*40)
