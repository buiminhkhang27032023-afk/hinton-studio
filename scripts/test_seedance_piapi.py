import sqlite3
import json
import requests
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
piapi_cfg = json.loads(settings.get('provider_piapi', '{}'))
api_key = piapi_cfg.get('apiKey')

# Use our uploaded public image URL
img_url = "https://rh-images-switch-1252422369.cos.ap-guangzhou.myqcloud.com/input/openapi/29017f9d625a1123e918c80474fdf785f148f146c3929365bdf2fcfe887fa2cc.jpg"

url = "https://api.piapi.ai/api/v1/task"
headers = {
    "X-API-Key": api_key,
    "Content-Type": "application/json"
}

payload = {
    "model": "seedance",
    "task_type": "seedance-2-fast-less-restriction",
    "input": {
        "prompt": "Cinematic 5s film shot, high-angle dolly in. A stunningly beautiful Asian woman with wavy black hair in @image1 wearing dusty-rose silk gown stands gracefully as celestial energy gathers around her. Photorealistic 8k, cinematic lighting.",
        "mode": "omni_reference",
        "duration": 5,
        "aspect_ratio": "16:9",
        "resolution": "720p",
        "audio": True,
        "image_urls": [img_url]
    }
}

print("Submitting PiAPI Seedance 2.0 Fast (omni_reference)...")
res = requests.post(url, headers=headers, json=payload, timeout=20)
print("Status code:", res.status_code)
print("PiAPI response:", res.json())
