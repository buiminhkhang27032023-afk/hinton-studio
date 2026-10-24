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

img_url = "https://rh-images-switch-1252422369.cos.ap-guangzhou.myqcloud.com/input/openapi/29017f9d625a1123e918c80474fdf785f148f146c3929365bdf2fcfe887fa2cc.jpg"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Host": "www.runninghub.cn"
}

payload = {
    "imageUrl": img_url,
    "prompt": "Cinematic smooth push in shot. The stunning woman in dusty rose evening gown turns slightly, wind blowing her hair. Intense atmosphere. Audio: epic cinematic dramatic music.",
    "duration": "5",
    "sound": "true"
}

print("Testing Kling 2.6 Pro...")
res = requests.post(f"{base_url}/kling-v2.6-pro/image-to-video", headers=headers, json=payload, timeout=20)
data = res.json()
print("Kling 2.6 Pro response:", json.dumps(data, ensure_ascii=False))
