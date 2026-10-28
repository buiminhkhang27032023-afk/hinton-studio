import sqlite3
import json
import requests
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')
base_url = "https://api.iooai.cn/v1"

public_url = "https://roman-manitoba-occurring-scratch.trycloudflare.com"
img = f"{public_url}/api/files/prj_a9c0d8476382/asset_3106e08099f9-Nh-n-di-n-ng--i-m-u.png"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

time.sleep(5)
payload = {
    "model": "seedance2.0 特价",
    "prompt": "Cinematic high fashion commercial. Beautiful Asian woman model walking with confident pose on studio runway, elegant dress, 4k 24fps.",
    "images": [img],
    "seconds": "15"
}

res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=20)
print("seedance2.0 特价 result:", res.status_code)
print(res.text)
