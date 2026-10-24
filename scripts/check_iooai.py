import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')
print("IOOAI key configured:", bool(api_key), f"len={len(api_key)}" if api_key else "")

# Check user balance on IOOAI
try:
    res = requests.get("https://api.iooai.cn/v1/user/balance", headers={"Authorization": f"Bearer {api_key}"}, timeout=10)
    print("IOOAI balance check:", res.status_code, res.text)
except Exception as e:
    print("IOOAI balance err:", e)
