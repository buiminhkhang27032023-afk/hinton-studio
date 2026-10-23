import sqlite3, json

conn = sqlite3.connect('data/studio.db')
cur = conn.cursor()
cur.execute("SELECT id, label, kind, config FROM models WHERE id LIKE '%image%'")
for r in cur.fetchall():
    print(r[0], r[1], r[2], r[3])
