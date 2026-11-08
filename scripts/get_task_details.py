import sqlite3
import json
import requests

db = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = db.cursor()
settings = dict(c.execute('SELECT key, value FROM settings').fetchall())
ioo_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = ioo_cfg.get('apiKey')
headers = {'Authorization': f'Bearer {api_key}'}

for tid in ['task_nYLhyDpS2hA2a5WdtBYlqfqje1itKalj', 'task_2e6AXD5Ub6IFTLZlrRGUe3IAVqcxAjC0', 'task_wgqYrKy2EtD47sHSG6schKbpcFeJoAu8', 'task_L4dA3Rx9hQJ3zM4ekk4XiA6ta7xQOw16']:
    r = requests.get(f'https://api.iooai.cn/v1/videos/{tid}', headers=headers)
    print(f'=== {tid} === HTTP {r.status_code}')
    try:
        print(json.dumps(r.json(), indent=2, ensure_ascii=False))
    except Exception as e:
        print(r.text)
