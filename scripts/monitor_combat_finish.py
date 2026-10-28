import requests
import json
import os
import sqlite3
import time

headers = {
    'Authorization': 'Bearer YOUR_IOOAI_API_KEY'
}

tid = "task_RWBsuM10beW3G4VguLt49VKdSeDO7QTa"
dest_dir = r"d:\phim ai thời trang\data\assets\prj_zfold8_commercial_10s"
dest_file = os.path.join(dest_dir, "male_combat_battle_seedance25_15s.mp4")

print(f"Monitoring combat task {tid} until completion...", flush=True)

for i in range(25): # 25 * 6s = 150s
    time.sleep(6)
    try:
        res = requests.get(f"https://api.iooai.cn/v1/videos/{tid}", headers=headers, timeout=10).json()
        st = res.get('status')
        prog = res.get('progress')
        print(f"[{i+1}] Status: {st}, Progress: {prog}%", flush=True)

        if st == 'completed':
            vurl = res.get('output_url') or res.get('video_url') or (res.get('videos', [{}])[0].get('url'))
            print("SUCCESS! Completed URL:", vurl, flush=True)
            if vurl:
                vres = requests.get(vurl, timeout=60)
                with open(dest_file, "wb") as f:
                    f.write(vres.content)
                size_mb = os.path.getsize(dest_file) / 1024 / 1024
                print(f"Downloaded to {dest_file} ({size_mb:.2f} MB)", flush=True)

                conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
                c = conn.cursor()
                asset_id = "asset_male_combat_seedance25_15s"
                c.execute("""
                    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                    VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
                """, (
                    asset_id,
                    'prj_zfold8_commercial_10s',
                    'Male-Combat-Action-Seedance2.5-15s',
                    f"/api/files/prj_zfold8_commercial_10s/male_combat_battle_seedance25_15s.mp4",
                    json.dumps({'model': 'seedance2.5 快速版', 'duration': 15, 'size': len(vres.content), 'genre': 'combat_action'}),
                    int(time.time() * 1000)
                ))
                conn.commit()
                print("Database updated with combat video!", flush=True)
            break
        elif st in ['failed', 'error', 'cancelled']:
            print("Failed:", res, flush=True)
            break
    except Exception as e:
        print("Polling error:", e, flush=True)
