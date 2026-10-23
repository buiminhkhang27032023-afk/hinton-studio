import sqlite3

conn = sqlite3.connect('data/studio.db')
cur = conn.cursor()
cur.execute("SELECT id, label, kind FROM models WHERE kind='video'")
for r in cur.fetchall():
    print(r)
