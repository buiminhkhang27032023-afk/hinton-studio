import requests
import json
import sqlite3

c = sqlite3.connect('d:/phim ai thời trang/data/studio.db').cursor()
cfg = json.loads(dict(c.execute('SELECT key, value FROM settings').fetchall())['provider_runninghub'])
h = {'Authorization': f'Bearer {cfg["apiKey"]}', 'Host': 'www.runninghub.cn'}

# Task ID from test_seedance_real_person.py
# Let's see the most recent task from account or poll the taskId
# Let's get the status of the taskId
res = requests.post('https://www.runninghub.cn/openapi/v2/query', headers=h, json={'taskId': '2113928812684530177'}).json()
print("Task status:", res.get('status'))
if res.get('status') == 'SUCCESS':
    print("URL:", res['results'][0]['url'])
    print("Usage:", res.get('usage'))
elif res.get('status') in ['FAILED', 'CANCEL']:
    print("Failed:", res.get('errorMessage'))
