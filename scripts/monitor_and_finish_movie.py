import os
import sys
import time
import json
import uuid
import sqlite3
import requests
import subprocess

# Retired: hard-coded task IDs and a second result parser caused missed files.
# Use the explicit existing-task recovery buttons in Studio instead.
raise SystemExit('Legacy monitor is disabled. Use Studio: existing requests -> check/download old result.')

PROJECT_ID = 'prj_1507511d78c4'
BASE_DIR = r'd:\phim ai thời trang'
ASSET_DIR = os.path.join(BASE_DIR, 'data', 'assets', PROJECT_ID)
DB_PATH = os.path.join(BASE_DIR, 'data', 'studio.db')

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
settings = dict(c.execute('SELECT key, value FROM settings').fetchall())
if json.loads(settings.get('model_calls_paused', 'false')):
    print('Model/API calls are paused by the user. No request sent.')
    sys.exit(0)
ioo_cfg = json.loads(settings.get('provider_iooai', '{}'))
ioo_headers = {'Authorization': f'Bearer {ioo_cfg.get("apiKey")}'}

tasks = {
    'video-1': 'task_wgqYrKy2EtD47sHSG6schKbpcFeJoAu8',
    'video-2': 'task_L4dA3Rx9hQJ3zM4ekk4XiA6ta7xQOw16',
    'video-3': 'task_nYLhyDpS2hA2a5WdtBYlqfqje1itKalj',
    'video-4': 'task_2e6AXD5Ub6IFTLZlrRGUe3IAVqcxAjC0'
}

print('Starting monitor for tasks:', tasks)

finished_videos = {}

while len(finished_videos) < len(tasks):
    graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', (PROJECT_ID,)).fetchone()[0]
    g = json.loads(graph_raw)
    graph_changed = False
    
    for vid, tid in tasks.items():
        if vid in finished_videos:
            continue
        try:
            r = requests.get(f'https://api.iooai.cn/v1/videos/{tid}', headers=ioo_headers, timeout=20)
            if r.status_code == 200:
                data = r.json()
                status = data.get('status')
                progress = data.get('progress', 0)
                print(f'[{time.strftime("%H:%M:%S")}] {vid} ({tid}) -> {status} ({progress}%)')
                
                if status in ['succeeded', 'completed', 'done', 'success']:
                    v_url = data.get('video_url') or data.get('url') or (data.get('videos', [{}])[0].get('url'))
                    if v_url:
                        print(f' >>> {vid} COMPLETED! Downloading video from {v_url}...')
                        v_bytes = requests.get(v_url, timeout=120).content
                        fname = f'{vid}-seedance-15s.mp4'
                        fpath = os.path.join(ASSET_DIR, fname)
                        with open(fpath, 'wb') as fp:
                            fp.write(v_bytes)
                        
                        asset_id = f'asset_{uuid.uuid4().hex[:12]}'
                        rel_url = f'/api/files/{PROJECT_ID}/{fname}'
                        now_ms = int(time.time() * 1000)
                        
                        c.execute('''INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                                  (asset_id, PROJECT_ID, fname, 'video', 'video/mp4', rel_url, json.dumps({'model': 'seedance2.0 线路二', 'task_id': tid}), now_ms))
                        
                        # Update job
                        c.execute('UPDATE jobs SET status = ?, output = ?, updated_at = ? WHERE project_id = ? AND node_id = ?',
                                  ('succeeded', json.dumps({'url': rel_url, 'id': asset_id}), now_ms, PROJECT_ID, vid))
                        
                        for n in g.get('nodes', []):
                            if n['id'] == vid:
                                n['data']['status'] = 'done'
                                n['data']['error'] = None
                                n['data']['videoUrl'] = rel_url
                                n['data']['result'] = {
                                    'id': asset_id,
                                    'projectId': PROJECT_ID,
                                    'name': fname,
                                    'kind': 'video',
                                    'mime': 'video/mp4',
                                    'url': rel_url,
                                    'createdAt': now_ms
                                }
                        graph_changed = True
                        finished_videos[vid] = fpath
                        print(f' >>> {vid} successfully saved to {fpath}')
                elif status in ['failed', 'error', 'cancelled']:
                    err = data.get('error', {}).get('message') or data.get('error') or status
                    print(f' !!! {vid} FAILED: {err}')
                    for n in g.get('nodes', []):
                        if n['id'] == vid:
                            n['data']['status'] = 'error'
                            n['data']['error'] = str(err)
                    graph_changed = True
                    finished_videos[vid] = None
        except Exception as err:
            print(f'Exception polling {vid}: {err}')
    
    if graph_changed:
        c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), PROJECT_ID))
        conn.commit()
    
    if len(finished_videos) < len(tasks):
        time.sleep(20)

print('\nAll tasks finished:', finished_videos)
successful = [finished_videos[f'video-{i}'] for i in range(1, 5) if finished_videos.get(f'video-{i}')]

if len(successful) == 4:
    concat_txt = os.path.join(ASSET_DIR, 'concat_list.txt')
    with open(concat_txt, 'w', encoding='utf-8') as fp:
        for p in successful:
            clean_p = p.replace('\\', '/')
            fp.write(f"file '{clean_p}'\n")
    
    output_full = os.path.join(ASSET_DIR, 'chiec_o_de_quen_full_60s.mp4')
    cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_txt, '-c', 'copy', output_full]
    subprocess.run(cmd, check=True)
    print(f'Master film created: {output_full}')
    
    rel_full = f'/api/files/{PROJECT_ID}/chiec_o_de_quen_full_60s.mp4'
    now_ms = int(time.time() * 1000)
    full_asset_id = f'asset_{uuid.uuid4().hex[:12]}'
    
    c.execute('''INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
              (full_asset_id, PROJECT_ID, 'chiec_o_de_quen_full_60s.mp4', 'video', 'video/mp4', rel_full, json.dumps({'type': 'full_movie', 'duration': 60}), now_ms))
    
    graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', (PROJECT_ID,)).fetchone()[0]
    g = json.loads(graph_raw)
    for n in g.get('nodes', []):
        if n['id'] in ['result-1', 'result-2', 'result-3', 'result-4']:
            n['data']['status'] = 'done'
            n['data']['result'] = {
                'id': full_asset_id,
                'projectId': PROJECT_ID,
                'name': 'Chiếc Ô Để Quên (Full 60s)',
                'kind': 'video',
                'mime': 'video/mp4',
                'url': rel_full
            }
    c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), PROJECT_ID))
    conn.commit()
    print('Movie project complete!')
