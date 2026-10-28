import requests
import json
import sqlite3
import time
import os
import sys

headers = {
    'Authorization': 'Bearer YOUR_IOOAI_API_KEY'
}

task_id = "task_iGxesgtqFPNhr6QupbJxmXKF8xZ7uUDg"
dest_dir = r"d:\phim ai thời trang\data\assets\prj_a9c0d8476382"
dest_file = os.path.join(dest_dir, "lookbook_seedance2_15s.mp4")

print(f"Monitoring Seedance 2.0 multi-image task {task_id}...")

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
            print("Completed! Video URL:", video_url)
            if video_url:
                v_res = requests.get(video_url, timeout=60)
                with open(dest_file, "wb") as f:
                    f.write(v_res.content)
                size_mb = os.path.getsize(dest_file) / 1024 / 1024
                print(f"Downloaded to {dest_file} ({size_mb:.2f} MB)")

                # Update studio.db graph and assets
                conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
                c = conn.cursor()

                # Register asset
                asset_id = "asset_seedance2_lookbook_15s"
                c.execute("""
                    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, size, path, meta, created_at, updated_at)
                    VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?, ?, ?)
                """, (
                    asset_id,
                    'prj_a9c0d8476382',
                    'Lookbook-Seedance2-15s',
                    len(v_res.content),
                    'lookbook_seedance2_15s.mp4',
                    json.dumps({'model': 'seedance2.0 特价', 'duration': 15}),
                    int(time.time() * 1000),
                    int(time.time() * 1000)
                ))

                # Update graph result and video node
                row = c.execute("SELECT data FROM graphs WHERE project_id='prj_a9c0d8476382'").fetchone()
                if row:
                    graph = json.loads(row[0])
                    for n in graph.get('nodes', []):
                        if n.get('id') == 'video':
                            n['data']['status'] = 'succeeded'
                            n['data']['modelId'] = 'seedance2.0 特价'
                            n['data']['model'] = 'Seedance 2.0 (Doubao ByteDance Đặc Giá)'
                        if n.get('id') == 'result':
                            n['data']['status'] = 'succeeded'
                            n['data']['result'] = {
                                'id': asset_id,
                                'projectId': 'prj_a9c0d8476382',
                                'name': 'Lookbook-Seedance2-15s',
                                'kind': 'video',
                                'mime': 'video/mp4',
                                'url': f"/api/files/prj_a9c0d8476382/lookbook_seedance2_15s.mp4",
                                'size': len(v_res.content)
                            }
                    c.execute("UPDATE graphs SET data = ?, updated_at = ? WHERE project_id='prj_a9c0d8476382'",
                              (json.dumps(graph), int(time.time() * 1000)))

                conn.commit()
                print("Database and graph updated successfully!")
            break
        elif status in ['failed', 'error', 'cancelled']:
            print("Task failed:", data)
            break
    except Exception as e:
        print("Polling error:", e)
