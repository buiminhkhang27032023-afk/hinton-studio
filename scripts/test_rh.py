import sqlite3
import json
import urllib.request

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = rh_cfg.get('baseUrl', 'https://www.runninghub.ai')

print(f"Testing RunningHub with baseUrl: {base_url}")
req_data = json.dumps({"apiKey": api_key}).encode('utf-8')
req = urllib.request.Request(
    f"{base_url.rstrip('/')}/uc/openapi/accountStatus",
    data=req_data,
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }
)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        res = json.loads(resp.read().decode())
        print("RunningHub accountStatus:", json.dumps(res, indent=2))
except Exception as e:
    print("Error calling RunningHub accountStatus:", e)
