import sqlite3
import json
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
now_ts = int(time.time() * 1000)

c.execute("""
    INSERT OR REPLACE INTO assets(id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (
    "asset_sample_seedance_2",
    "prj_superpower_20s",
    "Bản test: ByteDance Seedance 2.0 (RunningHub)",
    "video",
    "video/mp4",
    "/api/files/prj_superpower_20s/test_seedance_2.mp4",
    json.dumps({"source": "runninghub:seedance-2.0"}),
    now_ts
))
conn.commit()
print("Registered Seedance 2.0 asset!")
