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
headers = {"Authorization": f"Bearer {api_key}"}

job_id = "task_r198kR42902nqa3Rxf5oiheCv3JBqMFu"

for i in range(25):
    res = requests.get(f"{base_url}/videos/{job_id}", headers=headers, timeout=10)
    data = res.json()
    status = data.get('status')
    progress = data.get('progress')
    print(f"[{i+1}] Status: {status}, Progress: {progress}%")
    if status == 'completed':
        print("SUCCESS! Output URL:", data.get('output_url'))
        break
    elif status in ['failed', 'error', 'cancelled']:
        print("Failed:", data)
        break
    time.sleep(5)
