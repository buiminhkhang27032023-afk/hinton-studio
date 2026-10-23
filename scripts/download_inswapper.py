import os
import requests
from tqdm import tqdm

model_dir = r"d:\phim ai thời trang\models"
os.makedirs(model_dir, exist_ok=True)
model_path = os.path.join(model_dir, "inswapper_128.onnx")

if os.path.exists(model_path) and os.path.getsize(model_path) > 500000000:
    print(f"Model already exists at {model_path} ({os.path.getsize(model_path)} bytes)")
else:
    url = "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx"
    print(f"Downloading {url} -> {model_path}...")
    res = requests.get(url, stream=True)
    total = int(res.headers.get('content-length', 0))
    with open(model_path, 'wb') as f, tqdm(total=total, unit='B', unit_scale=True, desc="inswapper_128.onnx") as pbar:
        for chunk in res.iter_content(chunk_size=1024*1024):
            if chunk:
                f.write(chunk)
                pbar.update(len(chunk))
    print(f"Downloaded successfully: {os.path.getsize(model_path)} bytes")
