import requests
import json
import sqlite3

c = sqlite3.connect('d:/phim ai thời trang/data/studio.db').cursor()
cfg = json.loads(dict(c.execute('SELECT key, value FROM settings').fetchall())['provider_runninghub'])
h = {'Authorization': f'Bearer {cfg["apiKey"]}', 'Host': 'www.runninghub.cn'}

for name, tid in [('MiniMax Hailuo 2.3', '2113926898173489153'), ('Vidu Q2 Pro', '2113926907761680385')]:
    res = requests.post('https://www.runninghub.cn/openapi/v2/query', headers=h, json={'taskId': tid}).json()
    st = res.get('status')
    print(f"[{name}] status={st}")
    if st == 'SUCCESS':
        print(f"  URL: {res['results'][0]['url']}")
        print(f"  Usage: {res.get('usage')}")
    elif st in ['FAILED', 'CANCEL']:
        print(f"  FAILED: {res.get('errorMessage')}")
