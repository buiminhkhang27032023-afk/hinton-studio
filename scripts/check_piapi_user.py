import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
piapi_cfg = json.loads(settings.get('provider_piapi', '{}'))
api_key = piapi_cfg.get('apiKey')

# Check balance on PiAPI
res = requests.get("https://api.piapi.ai/api/v1/user/info", headers={"X-API-Key": api_key})
print("User info status:", res.status_code)
print("User info:", res.json())
