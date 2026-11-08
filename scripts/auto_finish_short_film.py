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

tasks = {
    'video-1': 'task_sobBtf56M1LOiwWHVABdqCvY3xX0Y0ps',
    'video-2': 'task_HkIFBotiIjEXPrJBFMFtrkPmWHVWedZr'
}

downloaded = {}

v3_path = os.path.join(ASSET_DIR, 'asset_b2e72ad86303-Recovered-task_nYLhyDpS2hA2a5WdtBYlqfqje1itKalj.mp4')
v4_path = os.path.join(ASSET_DIR, 'asset_d89388da5961-Recovered-task_2e6AXD5Ub6IFTLZlrRGUe3IAVqcxAjC0.mp4')

print(f"[{time.strftime('%H:%M:%S')}] Starting background worker for video-1 and video-2...")

for iteration in range(120): # up to 60 minutes
    all_done = True
    for vid, tid in tasks.items():
        if vid in downloaded:
            continue
        all_done = False
        try:
            r = requests.get(f'https://api.iooai.cn/v1/videos/{tid}', headers=ioo_headers, timeout=20)
            if r.status_code == 200:
                d = r.json()
                st = d.get('status')
                pr = d.get('progress', 0)
                print(f"[{time.strftime('%H:%M:%S')}] {vid} ({tid}): {st} ({pr}%)", flush=True)
                
                if st in ['completed', 'succeeded', 'done', 'success']:
                    out_url = d.get('output_url') or d.get('video_url') or d.get('url')
                    if out_url:
                        print(f"[{time.strftime('%H:%M:%S')}] Downloading {vid} from {out_url}...", flush=True)
                        v_bytes = requests.get(out_url, timeout=180).content
                        fname = f'{vid}-seedance-15s.mp4'
                        fpath = os.path.join(ASSET_DIR, fname)
                        with open(fpath, 'wb') as fp:
                            fp.write(v_bytes)
                        downloaded[vid] = fpath
                        print(f"[{time.strftime('%H:%M:%S')}] {vid} saved to {fpath} ({len(v_bytes)} bytes)", flush=True)
                        
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
                elif st in ['failed', 'error']:
                    print(f"[{time.strftime('%H:%M:%S')}] {vid} failed: {d.get('error')}", flush=True)
                    downloaded[vid] = False
        except Exception as e:
            print(f"Error checking {vid}: {e}", flush=True)
            
    if all_done:
        break
    time.sleep(30)

print(f"[{time.strftime('%H:%M:%S')}] Finished polling loop. Downloaded: {downloaded}", flush=True)

# If all 4 video files exist, concatenate full 60s film!
v1_path = downloaded.get('video-1')
v2_path = downloaded.get('video-2')

if v1_path and v2_path and os.path.exists(v1_path) and os.path.exists(v2_path) and os.path.exists(v3_path) and os.path.exists(v4_path):
    print("All 4 scene videos are ready! Concatenating full 60s short film...", flush=True)
    concat_list = os.path.join(ASSET_DIR, 'concat_movie_list.txt')
    scenes = [v1_path, v2_path, v3_path, v4_path]
    with open(concat_list, 'w', encoding='utf-8') as f:
        for s in scenes:
            clean_s = s.replace('\\', '/')
            f.write(f"file '{clean_s}'\n")
    
    out_movie = os.path.join(ASSET_DIR, 'chiec_o_de_quen_full_60s.mp4')
    cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_list, '-c', 'copy', out_movie]
    subprocess.run(cmd, check=True)
    print(f"Master short film concatenated successfully: {out_movie}", flush=True)
    
    movie_asset_id = f'asset_{uuid.uuid4().hex[:12]}'
    movie_url = f'/api/files/{PROJECT_ID}/chiec_o_de_quen_full_60s.mp4'
    now_ms = int(time.time() * 1000)
    
    c.execute('''INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
              (movie_asset_id, PROJECT_ID, 'chiec_o_de_quen_full_60s.mp4', 'video', 'video/mp4', movie_url, json.dumps({'type': 'master_film', 'duration': 60}), now_ms))
    
    graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', (PROJECT_ID,)).fetchone()[0]
    g = json.loads(graph_raw)
    for n in g.get('nodes', []):
        if n['id'] in ['result-1', 'result-2', 'result-3', 'result-4']:
            n['data']['masterFilmUrl'] = movie_url
    c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), PROJECT_ID))
    conn.commit()
    print("Canvas updated with master film! All done!", flush=True)
