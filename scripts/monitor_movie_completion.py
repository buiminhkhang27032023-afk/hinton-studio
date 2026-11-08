import sqlite3
import json
import requests
import os
import time
import uuid
import subprocess

PROJECT_ID = 'prj_1507511d78c4'
BASE_DIR = r'd:\phim ai thời trang'
ASSET_DIR = os.path.join(BASE_DIR, 'data', 'assets', PROJECT_ID)
DB_PATH = os.path.join(BASE_DIR, 'data', 'studio.db')

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
settings = dict(c.execute('SELECT key, value FROM settings').fetchall())
ioo_cfg = json.loads(settings.get('provider_iooai', '{}'))
ioo_headers = {'Authorization': f'Bearer {ioo_cfg.get("apiKey")}'}

active_tasks = {
    'video-1': 'task_sobBtf56M1LOiwWHVABdqCvY3xX0Y0ps',
    'video-2': 'task_HkIFBotiIjEXPrJBFMFtrkPmWHVWedZr'
}

print("Checking active tasks:", active_tasks)

results = {}

for vid, tid in active_tasks.items():
    try:
        r = requests.get(f'https://api.iooai.cn/v1/videos/{tid}', headers=ioo_headers, timeout=15)
        if r.status_code == 200:
            d = r.json()
            status = d.get('status')
            progress = d.get('progress', 0)
            print(f"[{vid}] {tid} -> status={status}, progress={progress}%")
            if status in ['completed', 'succeeded', 'done', 'success']:
                output_url = d.get('output_url') or d.get('video_url') or d.get('url')
                if output_url:
                    print(f"  >>> Downloading {vid} from {output_url}...")
                    v_bytes = requests.get(output_url, timeout=180).content
                    fname = f'{vid}-seedance-15s.mp4'
                    fpath = os.path.join(ASSET_DIR, fname)
                    with open(fpath, 'wb') as fp:
                        fp.write(v_bytes)
                    print(f"  >>> Saved to {fpath} ({len(v_bytes)} bytes)")
                    
                    asset_id = f'asset_{uuid.uuid4().hex[:12]}'
                    rel_url = f'/api/files/{PROJECT_ID}/{fname}'
                    now_ms = int(time.time() * 1000)
                    
                    c.execute('''INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                              (asset_id, PROJECT_ID, fname, 'video', 'video/mp4', rel_url, json.dumps({'model': 'seedance2.0 线路二', 'task_id': tid}), now_ms))
                    
                    c.execute('UPDATE jobs SET status = ?, output = ?, updated_at = ? WHERE project_id = ? AND node_id = ?',
                              ('succeeded', json.dumps({'url': rel_url, 'id': asset_id}), now_ms, PROJECT_ID, vid))
                    
                    graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', (PROJECT_ID,)).fetchone()[0]
                    g = json.loads(graph_raw)
                    for n in g.get('nodes', []):
                        if n['id'] == vid:
                            n['data']['status'] = 'done'
                            n['data']['error'] = None
                            n['data']['videoUrl'] = rel_url
                            n['data']['result'] = {
                                'id': asset_id,
                                'projectId': PROJECT_ID,
                                'name': f'{vid} (Seedance 15s)',
                                'kind': 'video',
                                'mime': 'video/mp4',
                                'url': rel_url,
                                'createdAt': now_ms
                            }
                        rid = 'result-' + vid.split('-')[1]
                        if n['id'] == rid:
                            n['data']['status'] = 'done'
                            n['data']['result'] = {
                                'id': asset_id,
                                'projectId': PROJECT_ID,
                                'name': f'{vid} (Seedance 15s)',
                                'kind': 'video',
                                'mime': 'video/mp4',
                                'url': rel_url,
                                'createdAt': now_ms
                            }
                    c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), PROJECT_ID))
                    conn.commit()
                    results[vid] = fpath
            elif status in ['failed', 'error']:
                print(f"  !!! {vid} failed: {d.get('error')}")
                results[vid] = False
            else:
                results[vid] = 'in_progress'
    except Exception as e:
        print(f"  Exception checking {vid}: {e}")

print("Current check results:", results)
