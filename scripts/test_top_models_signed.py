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

print("Full signed URL obtained:", full_url[:80], "...")

# Test MiniMax Hailuo 2.3 with full signed URL
p_minimax = {
    "imageUrl": full_url,
    "prompt": "Cinematic camera push in, dramatic lighting. The gorgeous Asian woman in the dusty-rose silk gown stands gracefully as celestial sparks swirl around her. 8k photorealistic.",
    "duration": "6",
    "enablePromptExpansion": True
}
res_mm = requests.post(f"{base_url}/minimax/hailuo-2.3/i2v-standard", headers=headers, json=p_minimax, timeout=20)
print("MiniMax submit:", res_mm.json())

# Test Vidu Q2 Pro
p_vidu = {
    "imageUrl": full_url,
    "prompt": "Cinematic 5s movie shot, slow motion dolly in. The woman in pink gown steps forward gracefully, wind blowing hair, high dynamic range.",
    "duration": "5",
    "resolution": "720p",
    "movementAmplitude": "auto",
    "bgm": True
}
res_vidu = requests.post(f"{base_url}/vidu/image-to-video-q2-pro", headers=headers, json=p_vidu, timeout=20)
print("Vidu submit:", res_vidu.json())
