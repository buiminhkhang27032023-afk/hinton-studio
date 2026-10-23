import sqlite3

conn = sqlite3.connect('data/studio.db')
cur = conn.cursor()
cur.execute("SELECT id, name, url FROM assets WHERE kind IN ('video', 'image') AND (name LIKE '%fashion%' OR name LIKE '%dạ hội%' OR name LIKE '%áo dài%' OR name LIKE '%catwalk%' OR name LIKE '%người mẫu%')")
for r in cur.fetchall():
    print(f"ID: {r[0]} | Name: {r[1]} | URL: {r[2]}")
