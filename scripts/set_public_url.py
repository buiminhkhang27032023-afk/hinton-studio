import sqlite3

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
url = 'https://roman-manitoba-occurring-scratch.trycloudflare.com'
c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('public_url', ?)", (url,))
conn.commit()
print("Updated public_url to:", url)
