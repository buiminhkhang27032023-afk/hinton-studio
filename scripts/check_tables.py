import sqlite3
conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
c.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
for r in c.fetchall():
    print(r[0])
