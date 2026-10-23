import sqlite3

conn = sqlite3.connect('data/studio.db')
cur = conn.cursor()
cur.execute("SELECT id, name, url, mime FROM assets WHERE project_id='lookbooks'")
rows = cur.fetchall()
print(f"Total lookbooks registered in DB: {len(rows)}")
for r in rows:
    print(f"- {r[0]}: {r[1]} -> {r[2]}")
