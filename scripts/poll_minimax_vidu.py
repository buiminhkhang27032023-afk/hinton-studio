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

tasks = {
    "MiniMax Hailuo 2.3": {"id": "2113926898173489153", "done": False, "url": None},
    "Vidu Q2 Pro": {"id": "2113926907761680385", "done": False, "url": None}
}

for i in range(30):
    all_done = True
    for name, item in tasks.items():
        if item["done"]:
            continue
        all_done = False
        res = requests.post(f"{base_url}/query", headers=headers, json={"taskId": item["id"]}, timeout=10)
        p = res.json()
        st = p.get('status')
        print(f"[{i+1}] {name}: {st}")
        if st == 'SUCCESS':
            item["done"] = True
            item["url"] = p['results'][0]['url']
            print(f"  *** {name} FINISHED! Video URL: {item['url']}")
            print(f"  *** Usage: {p.get('usage')}")
        elif st in ['FAILED', 'CANCEL']:
            item["done"] = True
            print(f"  *** {name} FAILED: {p.get('errorMessage')}")
    if all_done:
        break
    time.sleep(5)
