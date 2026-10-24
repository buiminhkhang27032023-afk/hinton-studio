import sqlite3
import json
import urllib.request

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')

# Test queries with apiKey in body and host header
host = "https://www.runninghub.ai"
variants = [
    {"taskId": "12345"},
    {"taskId": "12345", "apiKey": api_key},
]

for v in variants:
    payload = json.dumps(v).encode('utf-8')
    req = urllib.request.Request(
        f"{host}/openapi/v2/query",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Host": "www.runninghub.ai",
            "Authorization": f"Bearer {api_key}"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            print(f"Variant {v.keys()}: {data}")
    except Exception as e:
        print(f"Variant {v.keys()} err: {e}")
