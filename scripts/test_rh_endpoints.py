import sqlite3
import json
import urllib.request

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = rh_cfg.get('baseUrl', 'https://www.runninghub.ai')

# Test some known RunningHub endpoints
endpoints = [
    ("/task/openapi/list", "POST", {"apiKey": api_key}),
    ("/task/openapi/workflow/list", "POST", {"apiKey": api_key}),
    ("/uc/openapi/app/list", "POST", {"apiKey": api_key}),
    ("/openapi/v1/models", "GET", None),
]

for ep, method, body in endpoints:
    url = f"{base_url.rstrip('/')}{ep}"
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method=method
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            res = json.loads(resp.read().decode())
            print(f"SUCCESS {ep}:", res)
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {ep} ({e.code}):", e.read().decode()[:200])
    except Exception as e:
        print(f"Error {ep}:", e)
