import requests
import json
import sqlite3

c = sqlite3.connect('d:/phim ai thời trang/data/studio.db').cursor()
cfg = json.loads(dict(c.execute('SELECT key, value FROM settings').fetchall())['provider_runninghub'])
h = {'Authorization': f'Bearer {cfg["apiKey"]}', 'Host': 'www.runninghub.cn'}

tid = '2113927778352435201'
res = requests.post('https://www.runninghub.cn/openapi/v2/query', headers=h, json={'taskId': tid}).json()
print("RunningHub Seedance 1.5 Pro status:", res.get('status'))
if res.get('status') == 'SUCCESS':
    print("Video URL:", res['results'][0]['url'])
    print("Usage:", res.get('usage'))
elif res.get('status') in ['FAILED', 'CANCEL']:
    print("Failed:", res.get('errorMessage'))
