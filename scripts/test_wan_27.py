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
    "firstImageUrl": img_url,
    "prompt": "Cinematic 5s action shot, dramatic lighting, celestial aura around the woman in the pink dress, wind blowing dress, 8k movie still.",
    "duration": "5",
    "resolution": "720P"
}

print("Testing Wan 2.7 image-to-video...")
res = requests.post(f"{base_url}/alibaba/wan-2.7/image-to-video", headers=headers, json=payload, timeout=20)
print("Wan 2.7 status code:", res.status_code)
print("Wan 2.7 response:", res.text[:300])
