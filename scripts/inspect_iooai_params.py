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

video_models = [
    "MiniMax H3",
    "MiniMax H3 1080p",
    "MiniMax H3 768p",
    "omni 可编辑视频",
    "omni_flash_10s",
    "seedance 2.0 fast",
    "seedance 2.0 mini",
    "seedance 2.0 满血",
    "seedance2.0 Mini 稳定",
    "seedance2.0 特价",
    "seedance2.0 线路二",
    "seedance2.5 LW",
    "seedance2.5 快速版",
    "seedance2.5 线路三",
    "seedance2.5线路二"
]

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

results = {}

for m in video_models:
    # Send dummy empty body to see parameter requirements & validation
    payload = {"model": m}
    res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=10)
    data = res.json()
    err = data.get('error', {})
    results[m] = {
        "status": res.status_code,
        "message": err.get('message', ''),
        "code": err.get('code', '')
    }
    time.sleep(1)

print(json.dumps(results, indent=2, ensure_ascii=False))
