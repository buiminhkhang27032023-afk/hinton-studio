import sqlite3
import json
import urllib.request

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = "https://www.runninghub.ai/openapi/v2"

task_id = "2113922118680203266"
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
    print("Task status:", poll_data.get('status'))
    print("Full result:", json.dumps(poll_data, indent=2))
