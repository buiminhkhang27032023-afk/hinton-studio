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

headers = {
    "Authorization": f"Bearer {api_key}",
    "Host": "www.runninghub.cn"
}

items = {
    "MiniMax Hailuo 2.3": "2113925959660220418",
    "Wan 2.7": "2113926428289818625"
}

for name, tid in items.items():
    res = requests.post(f"{base_url}/query", headers=headers, json={"taskId": tid}, timeout=10)
    p = res.json()
    st = p.get('status')
    print(f"[{name}] status={st}")
    if st == 'SUCCESS':
        print(f"  *** SUCCESS! Video URL: {p['results'][0]['url']}")
        print(f"  *** Usage: {p.get('usage')}")
    elif st in ['FAILED', 'CANCEL']:
        print(f"  *** FAILED: {p.get('errorMessage')}")
