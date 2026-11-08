import sqlite3
import json
import requests
import os

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute('SELECT key, value FROM settings').fetchall())
rh = json.loads(settings.get('provider_runninghub', '{}'))
rh_headers = {'Authorization': 'Bearer ' + rh.get('apiKey'), 'Host': 'www.runninghub.cn'}

fname = 'asset_408a7e26503f-canh-2-nhan-vat-goc.png'
fpath = os.path.join(r'd:\phim ai thời trang\data\assets\prj_1507511d78c4', fname)

with open(fpath, 'rb') as fp:
    files = {'file': (fname, fp, 'image/png')}
    r = requests.post('https://www.runninghub.cn/openapi/v2/media/upload/binary', headers=rh_headers, files=files, timeout=30)
    print('Status:', r.status_code)
    print('Resp:', r.text)
