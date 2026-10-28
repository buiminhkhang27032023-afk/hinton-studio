import requests
import json
import sqlite3
import time
import os
import sys

headers = {
    'Authorization': 'Bearer YOUR_IOOAI_API_KEY'
}

task_id = "task_fNyU74IE0zIpUqe4m3C9HXipoNiOayYF"
dest_dir = r"d:\phim ai thời trang\data\assets\prj_a9c0d8476382"
dest_file = os.path.join(dest_dir, "lookbook_seedance25_fast_15s.mp4")

print(f"Monitoring Seedance 2.5 快速版 task {task_id}...", flush=True)

for attempt in range(40): # 40 * 6s = 240s
    time.sleep(6)
    try:
        res = requests.get(f"https://api.iooai.cn/v1/videos/{task_id}", headers=headers, timeout=10)
        data = res.json()
        status = data.get('status')
        progress = data.get('progress')
        print(f"[{attempt+1}] Status: {status}, Progress: {progress}%", flush=True)

        if status == 'completed':
            video_url = data.get('output_url') or data.get('video_url') or (data.get('videos', [{}])[0].get('url'))
            print("Completed! Video URL:", video_url, flush=True)
            if video_url:
                v_res = requests.get(video_url, timeout=60)
                with open(dest_file, "wb") as f:
                    f.write(v_res.content)
                size_mb = os.path.getsize(dest_file) / 1024 / 1024
                print(f"Downloaded to {dest_file} ({size_mb:.2f} MB)", flush=True)

                conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
                c = conn.cursor()

                asset_id = "asset_seedance25_fast_15s"
                url = "/api/files/prj_a9c0d8476382/lookbook_seedance25_fast_15s.mp4"
                c.execute("""
                    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                    VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
                """, (
                    asset_id,
                    'prj_a9c0d8476382',
                    'Lookbook-Seedance2.5-Fast-15s',
                    url,
                    json.dumps({'model': 'seedance2.5 快速版', 'duration': 15, 'size': len(v_res.content)}),
                    int(time.time() * 1000)
                ))

                row = c.execute("SELECT data FROM graphs WHERE project_id='prj_a9c0d8476382'").fetchone()
                if row:
                    graph = json.loads(row[0])
                    for n in graph.get('nodes', []):
                        if n.get('id') == 'video':
                            n['data']['status'] = 'succeeded'
                            n['data']['modelId'] = 'seedance2.5 快速版'
                            n['data']['model'] = 'Seedance 2.5 快速版 (15s)'
                        if n.get('id') == 'result':
                            n['data']['status'] = 'succeeded'
                            n['data']['result'] = {
                                'id': asset_id,
                                'projectId': 'prj_a9c0d8476382',
                                'name': 'Lookbook-Seedance2.5-Fast-15s',
                                'kind': 'video',
                                'mime': 'video/mp4',
                                'url': f"/api/files/prj_a9c0d8476382/lookbook_seedance25_fast_15s.mp4",
                                'size': len(v_res.content)
                            }
                    c.execute("UPDATE graphs SET data = ?, updated_at = ? WHERE project_id='prj_a9c0d8476382'",
                              (json.dumps(graph), int(time.time() * 1000)))

                conn.commit()
                print("Canvas prj_a9c0d8476382 updated with Seedance 2.5 video!", flush=True)
            break
        elif status in ['failed', 'error', 'cancelled']:
            print("Task failed:", data, flush=True)
            break
    except Exception as e:
        print("Polling error:", e, flush=True)
