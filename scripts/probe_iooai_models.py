import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')
base_url = "https://api.iooai.cn/v1"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# Test models list endpoint
res = requests.get(f"{base_url}/models", headers=headers)
print("GET /models:", res.status_code)
if res.status_code == 200:
    for m in res.json().get('data', []):
        mid = m.get('id')
        if any(k in mid.lower() for k in ['seedance', 'doubao', 'omni', 'video', 'kling', 'wan', 'minimax']):
            print(" -", mid)
else:
    print(res.text[:300])
