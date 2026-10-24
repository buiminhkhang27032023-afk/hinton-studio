import sqlite3
import json

c = sqlite3.connect('d:/phim ai thời trang/data/studio.db').cursor()
row = c.execute("SELECT value FROM settings WHERE key='public_url'").fetchone()
print("public_url:", row[0] if row else "None")
