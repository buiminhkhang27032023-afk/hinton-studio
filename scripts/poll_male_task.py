import requests
import json
import os
import sqlite3
import time

headers = {
    'Authorization': 'Bearer YOUR_IOOAI_API_KEY'
}

tid = "task_NiTQx9Pd9wbV5TTIzUddAwIrd4TvMFrB"
res = requests.get(f"https://api.iooai.cn/v1/videos/{tid}", headers=headers).json()
status = res.get('status')
progress = res.get('progress')
print(f"Task {tid}: Status={status}, Progress={progress}%")

if status == 'completed':
    vurl = res.get('output_url') or res.get('video_url') or (res.get('videos', [{}])[0].get('url'))
    print("Completed URL:", vurl)
    dest_dir = r"d:\phim ai thời trang\data\assets\prj_zfold8_commercial_10s"
    dest_file = os.path.join(dest_dir, "male_lookbook_seedance25_fast_15s.mp4")
    vres = requests.get(vurl, timeout=60)
    with open(dest_file, "wb") as f:
        f.write(vres.content)
    size_mb = os.path.getsize(dest_file) / 1024 / 1024
    print(f"Downloaded to {dest_file} ({size_mb:.2f} MB)")

    conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
    c = conn.cursor()
    asset_id = "asset_male_lookbook_seedance25_15s"
    c.execute("""
        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
        VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
    """, (
        asset_id,
        'prj_zfold8_commercial_10s',
        'Male-Lookbook-Seedance2.5-Fast-15s',
        f"/api/files/prj_zfold8_commercial_10s/male_lookbook_seedance25_fast_15s.mp4",
        json.dumps({'model': 'seedance2.5 快速版', 'duration': 15, 'size': len(vres.content)}),
        int(time.time() * 1000)
    ))
    conn.commit()
    print("Database updated!")
elif status in ['failed', 'error', 'cancelled']:
    print("Task failed:", res)
