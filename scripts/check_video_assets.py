import sqlite3
import json

db = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = db.cursor()
rows = c.execute("SELECT id, name, kind, mime, url, created_at FROM assets WHERE project_id = 'prj_1507511d78c4' AND (kind = 'video' OR name LIKE '%.mp4')").fetchall()
print(f"Total video assets found: {len(rows)}")
for r in rows:
    print(r)
