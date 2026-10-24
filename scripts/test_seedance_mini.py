import sqlite3
import json
import requests

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

# Test 1: SparkVideo 2.0 Mini
payload_mini = {
    "firstFrameUrl": full_url,
    "prompt": "Cinematic camera dolly in. Beautiful woman in pink gown. 8k.",
    "duration": "5",
    "resolution": "720p",
    "ratio": "adaptive"
}
res_mini = requests.post(f"{base_url}/rhart-video/sparkvideo-2.0-mini/image-to-video", headers=headers, json=payload_mini, timeout=20)
print("SparkVideo 2.0 Mini response:", res_mini.json())

# Test 2: Seedance 1.5 Pro Fast
payload_15_fast = {
    "firstImageUrl": full_url,
    "prompt": "Cinematic camera dolly in. Beautiful woman in pink gown. 8k.",
    "duration": "5",
    "resolution": "720p",
    "aspectRatio": "adaptive",
    "generateAudio": "true",
    "cameraFixed": "false"
}
res_15_fast = requests.post(f"{base_url}/seedance-v1.5-pro/image-to-video-fast", headers=headers, json=payload_15_fast, timeout=20)
print("Seedance 1.5 Pro Fast response:", res_15_fast.json())
