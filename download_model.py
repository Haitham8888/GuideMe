from huggingface_hub import hf_hub_download
import os

# إنشاء مجلد الموديلات إذا لم يكن موجوداً
os.makedirs("models", exist_ok=True)

print("Starting download of Qwen 2.5 14B (Q4_K_M)...")
model_path = hf_hub_download(
    repo_id="Qwen/Qwen2.5-14B-Instruct-GGUF",
    filename="qwen2.5-14b-instruct-q4_k_m.gguf",
    local_dir="./models",
    local_dir_use_symlinks=False
)

print(f"\nDone! Model downloaded to: {model_path}")
print("You can now run the server using: python server.py")
