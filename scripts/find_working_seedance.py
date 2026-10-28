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

test_models = [
    ("seedance 2.0 fast", "5"),
    ("seedance 2.0 mini", "5"),
    ("seedance 2.0 满血", "5"),
    ("seedance2.5 快速版", "15"),
    ("seedance2.5 线路三", "15"),
    ("seedance2.5线路二", "15")
]

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

for m, sec in test_models:
    print(f"\n--- Testing [{m}] (seconds: {sec}) ---")
    time.sleep(5)
    payload = {
        "model": m,
        "prompt": "Cinematic high fashion commercial, beautiful Asian woman, 4k",
        "images": [img],
        "seconds": sec
    }
    try:
        res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=15)
        print("HTTP status:", res.status_code)
        print("Response:", res.text[:200])
        if res.status_code == 200:
            tid = res.json().get('id')
            print(f"Submitted task {tid}, waiting 10s to see if upstream accepts...")
            time.sleep(10)
            p = requests.get(f"{base_url}/videos/{tid}", headers=headers).json()
            print("Status after 10s:", p.get('status'), p.get('error'))
            if p.get('status') in ['queued', 'in_progress']:
                print(f"FOUND WORKING MODEL: {m} (Task {tid})")
                break
    except Exception as e:
        print("Exception:", e)
