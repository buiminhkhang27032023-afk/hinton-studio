import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
piapi_cfg = json.loads(settings.get('provider_piapi', '{}'))
api_key = piapi_cfg.get('apiKey')

img_url = "https://rh-images-switch-1252422369.cos.ap-guangzhou.myqcloud.com/input/openapi/29017f9d625a1123e918c80474fdf785f148f146c3929365bdf2fcfe887fa2cc.jpg"

url = "https://api.piapi.ai/api/v1/task"
headers = {
    "X-API-Key": api_key,
    "Content-Type": "application/json"
}

types = [
    "seedance-2",
    "seedance-2-fast",
    "seedance-2-mini",
    "seedance-2.5"
]

for t in types:
    payload = {
        "model": "seedance",
        "task_type": t,
        "input": {
            "prompt": "Cinematic 5s film shot, high-angle dolly in. A stunning woman in pink evening gown. 8k.",
            "duration": 5,
            "resolution": "720p",
            "aspect_ratio": "16:9",
            "mode": "omni_reference",
            "image_urls": [img_url]
        }
    }
    res = requests.post(url, headers=headers, json=payload, timeout=15)
    print(f"[{t}] Code: {res.status_code}, Resp: {res.text[:200]}")
