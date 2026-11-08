import sqlite3
import json
import requests

db = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = db.cursor()
settings = dict(c.execute('SELECT key, value FROM settings').fetchall())
ioo_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = ioo_cfg.get('apiKey')
headers = {'Authorization': f'Bearer {api_key}'}

# Check user / balance on IOOAI
for endpoint in ['https://api.iooai.cn/v1/user/balance', 'https://api.iooai.cn/v1/user', 'https://api.iooai.cn/v1/dashboard/billing/usage']:
    try:
        r = requests.get(endpoint, headers=headers, timeout=10)
        print(endpoint, r.status_code, r.text[:200])
    except Exception as e:
        print(endpoint, e)
