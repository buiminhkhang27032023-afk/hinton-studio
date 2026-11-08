import sqlite3
conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
c.execute("PRAGMA table_info(graphs)")
for r in c.fetchall():
    print(r)
