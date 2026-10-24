import sqlite3
import json
import urllib.request
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = "https://www.runninghub.ai/openapi/v2"

endpoint = "alibaba/wan-2.6/text-to-video"
url = f"{base_url}/{endpoint}"

payload = {
    "prompt": "Two powerful fighters clash with superpowers, glowing lightning and energy shields in a ruined marble hall, epic cinematography, 8k movie scene",
    "duration": "5",
    "resolution": "1280*720",
    "shotType": "single"
}

req_data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(
    url,
    data=req_data,
    headers={
        "Content-Type": "application/json",
        "Host": "www.runninghub.ai",
        "Authorization": f"Bearer {api_key}"
    }
)

print(f"Submitting Wan 2.6 to {url}...")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode())
        print("Submit response:", json.dumps(res, indent=2))
        task_id = res.get('taskId')
        if task_id:
            for i in range(10):
                time.sleep(4)
                poll_req = urllib.request.Request(
                    f"{base_url}/query",
                    data=json.dumps({"taskId": task_id}).encode('utf-8'),
                    headers={
                        "Content-Type": "application/json",
                        "Host": "www.runninghub.ai",
                        "Authorization": f"Bearer {api_key}"
                    }
                )
                with urllib.request.urlopen(poll_req, timeout=10) as poll_resp:
                    poll_data = json.loads(poll_resp.read().decode())
                    status = poll_data.get('status')
                    print(f"[{i+1}] Wan 2.6 status: {status}")
                    if status in ['SUCCESS', 'FAILED']:
                        print("Wan result:", json.dumps(poll_data, indent=2))
                        break
except Exception as e:
    print("Error:", e)
