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
    "asset_sample_minimax",
    "prj_superpower_20s",
    "Bản test: MiniMax Hailuo 2.3 (Cận cảnh & Biểu cảm chân thực)",
    "video",
    "video/mp4",
    "/api/files/prj_superpower_20s/test_minimax_hailuo.mp4",
    json.dumps({"source": "runninghub:minimax-hailuo-2.3"}),
    now_ts
))

c.execute("""
    INSERT OR REPLACE INTO assets(id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (
    "asset_sample_vidu",
    "prj_superpower_20s",
    "Bản test: Vidu Q2 Pro (Chuyển động mượt & Có sẵn âm thanh)",
    "video",
    "video/mp4",
    "/api/files/prj_superpower_20s/test_vidu_q2_pro.mp4",
    json.dumps({"source": "runninghub:vidu-q2-pro"}),
    now_ts
))

conn.commit()
print("Registered sample assets!")
