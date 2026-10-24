import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')

with open("d:/phim ai thời trang/data/assets/prj_hardware_10s/public_urls.json") as f:
    urls = json.load(f)

payload = {
    "model": "omni_flash_10s",
    "prompt": "Test",
    "seconds": "10",
    "resolution": "720p",
    "ratio": "9:16",
    "images": [urls["char"]]
}

res = requests.post("https://api.iooai.cn/v1/videos", headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=payload, timeout=15)
print("Status:", res.status_code)
print("Resp:", res.text)
