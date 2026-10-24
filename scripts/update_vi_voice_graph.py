import sqlite3
import json
import time

PROJECT_ID = "prj_hardware_10s"
BASE_DIR = "d:/phim ai thời trang"
conn = sqlite3.connect(f"{BASE_DIR}/data/studio.db")
c = conn.cursor()
now_ts = int(time.time() * 1000)

video_vi_url = f"/api/files/{PROJECT_ID}/hardware_ad_vietnamese_voice_10s.mp4"

# 1. Update/Insert assets
c.execute("""
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (
    "asset_hardware_ad_vi_voice",
    PROJECT_ID,
    "Video Quảng Cáo Kho Kim Khí 10s (Lồng Tiếng Việt)",
    "video",
    "video/mp4",
    video_vi_url,
    json.dumps({"model": "iooai:omni_flash_10s", "language": "vi", "duration": 10, "aspect": "9:16"}),
    now_ts
))

# 2. Update project thumbnail
c.execute("UPDATE projects SET thumbnail=?, updated_at=? WHERE id=?", (
    video_vi_url, now_ts, PROJECT_ID
))

# 3. Update Graph result node
row = c.execute("SELECT data FROM graphs WHERE project_id=?", (PROJECT_ID,)).fetchone()
if row:
    graph = json.loads(row[0])
    nodes = graph.get('nodes', [])
    for n in nodes:
        if n['id'] in ['node_video', 'node_result']:
            n['data']['videoUrl'] = video_vi_url
            n['data']['result'] = {
                "id": "asset_hardware_ad_vi_voice",
                "name": "Video Quảng Cáo Kho Kim Khí 10s (Lồng Tiếng Việt)",
                "kind": "video",
                "url": video_vi_url
            }
    c.execute("UPDATE graphs SET data=?, updated_at=? WHERE project_id=?", (json.dumps(graph), now_ts, PROJECT_ID))

conn.commit()
print("Updated project assets and graph with Vietnamese voice video!")
