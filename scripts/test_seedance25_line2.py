import sqlite3
import json
import requests

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

print("=== Test: seedance2.5线路二 with 1 image ===")
payload1 = {
    "model": "seedance2.5线路二",
    "prompt": "Cinematic 30s film. Beautiful Asian fashion model walking gracefully in modern studio runway, 4k 24fps.",
    "images": [img],
    "seconds": "30"
}
res1 = requests.post(f"{base_url}/videos", headers=headers, json=payload1, timeout=15)
print("Status:", res1.status_code)
print("Response:", res1.text[:300])
