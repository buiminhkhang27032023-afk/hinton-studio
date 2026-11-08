import sqlite3
import json
import requests
import os
import time
import uuid

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute('SELECT key, value FROM settings').fetchall())
rh = json.loads(settings.get('provider_runninghub', '{}'))
ioo = json.loads(settings.get('provider_iooai', '{}'))

rh_headers = {'Authorization': 'Bearer ' + rh.get('apiKey'), 'Host': 'www.runninghub.cn'}
ioo_headers = {'Authorization': 'Bearer ' + ioo.get('apiKey'), 'Content-Type': 'application/json'}

fname = 'asset_99c80f779711-canh-1-nhan-vat-goc.png'
fpath = os.path.join(r'd:\phim ai thời trang\data\assets\prj_1507511d78c4', fname)

print(f"Uploading {fname} to RunningHub...")
with open(fpath, 'rb') as fp:
    files = {'file': (fname, fp, 'image/png')}
    r = requests.post('https://www.runninghub.cn/openapi/v2/media/upload/binary', headers=rh_headers, files=files, timeout=30)
    upload_res = r.json()
    d_url = upload_res['data']['download_url']

print("Upload success. Submitting video-1 to IOOAI Seedance 2.0 线路二...")

prompt_1 = (
    "Cinematic romantic short film, vertical 9:16, 15 seconds, 4k 24fps. "
    "A beautiful young Vietnamese woman Linh in cream cardigan and blue skirt stands under cafe awning looking at rain, searching her beige tote bag. "
    "A handsome young Vietnamese man Nam in light blue shirt holding a navy umbrella with cloud patch walks up beside her and offers the umbrella. "
    "She turns and looks up. Atmospheric evening rain, warm amber cafe lights, photorealistic movie."
)

payload = {
    'model': 'seedance2.0 线路二',
    'prompt': prompt_1,
    'images': [d_url],
    'seconds': '15',
    'ratio': '9:16'
}

r_sub = requests.post('https://api.iooai.cn/v1/videos', headers=ioo_headers, json=payload, timeout=25)
print('Submit status:', r_sub.status_code)
print('Submit response:', r_sub.text)

if r_sub.status_code == 200:
    data = r_sub.json()
    tid = data.get('id')
    now_ms = int(time.time() * 1000)
    job_id = f'job_video-1_{uuid.uuid4().hex[:8]}'
    
    # Save job
    c.execute('''INSERT OR REPLACE INTO jobs (id, project_id, node_id, kind, model, status, input, provider_job, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
              (job_id, 'prj_1507511d78c4', 'video-1', 'video', 'seedance2.0 线路二', 'running', json.dumps(payload), tid, now_ms, now_ms))
    
    # Update Canvas graph node
    graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', ('prj_1507511d78c4',)).fetchone()[0]
    g = json.loads(graph_raw)
    for n in g.get('nodes', []):
        if n['id'] == 'video-1':
            n['data']['status'] = 'running'
            n['data']['error'] = None
    c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), 'prj_1507511d78c4'))
    conn.commit()
    print(f"video-1 submitted successfully! Task ID: {tid}")
else:
    print(f"Submit failed: {r_sub.text}")
