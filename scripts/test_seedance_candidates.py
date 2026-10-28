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

test_models = [
    "seedance 2.0 fast",
    "seedance 2.0 mini",
    "seedance 2.0 满血",
    "seedance2.0 Mini 稳定",
    "seedance2.0 特价",
    "seedance2.5 快速版",
    "omni_flash_10s"
]

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

for m in test_models:
    payload = {
        "model": m,
        "prompt": "Cinematic fashion model walking gracefully, photorealistic, 4k",
        "images": [img],
        "seconds": "10" if "omni" in m else "5"
    }
    try:
        res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=10)
        data = res.json()
        print(f"Model [{m}]: status={res.status_code}")
        if res.status_code == 200:
            print(" -> SUCCESS:", data)
            break
        else:
            err = data.get('error', {})
            msg = err.get('message') or err.get('code')
            print(" -> Error:", msg)
    except Exception as e:
        print(f"Model [{m}] Exc:", e)
