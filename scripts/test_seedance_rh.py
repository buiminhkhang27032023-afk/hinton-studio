import sqlite3
import json
import requests
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = "https://www.runninghub.cn/openapi/v2"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Host": "www.runninghub.cn"
}

# Upload freshly and get full signed url
img_path = "d:/phim ai thời trang/data/assets/prj_superpower_20s/asset_07134c809a66-Th-----AI--N--ch-nh---V-y-d--h-i-h-ng.jpg"
with open(img_path, "rb") as f:
    files = {"file": ("tryon_female.jpg", f, "image/jpeg")}
    res = requests.post(f"{base_url}/media/upload/binary", headers=headers, files=files, timeout=30)
    full_url = res.json()['data']['download_url']

print("Full signed URL:", full_url[:80], "...")

# Test 1: Seedance 1.5 Pro with cameraFixed
payload_15 = {
    "firstImageUrl": full_url,
    "prompt": "Cinematic 5s film shot, camera dolly in. Beautiful Asian woman in dusty rose evening gown, wind blows hair, intense cinematic aura.",
    "duration": "5",
    "resolution": "720p",
    "aspectRatio": "adaptive",
    "generateAudio": "true",
    "cameraFixed": "false"
}
print("\nSubmitting Seedance 1.5 Pro...")
res_15 = requests.post(f"{base_url}/seedance-v1.5-pro/image-to-video", headers=headers, json=payload_15, timeout=20)
print("Seedance 1.5 response:", res_15.json())

# Test 2: SparkVideo 2.0 Fast (Seedance 2.0 Fast)
payload_20 = {
    "firstFrameUrl": full_url,
    "prompt": "Cinematic 5s film shot, camera dolly in. Beautiful Asian woman in dusty rose evening gown, wind blows hair, intense cinematic aura.",
    "duration": "5",
    "resolution": "720p",
    "generateAudio": True,
    "ratio": "adaptive"
}
print("\nSubmitting SparkVideo 2.0 Fast (Seedance 2.0)...")
res_20 = requests.post(f"{base_url}/rhart-video/sparkvideo-2.0-fast/image-to-video", headers=headers, json=payload_20, timeout=20)
print("SparkVideo 2.0 Fast response:", res_20.json())
