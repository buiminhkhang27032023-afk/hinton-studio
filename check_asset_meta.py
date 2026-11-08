import sqlite3, json

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
c.execute("""
    SELECT id, name, url, meta FROM assets 
    WHERE id IN ('asset_f48d6e3de6dd', 'asset_17238b519fcd', 'asset_efd6cf3fd6d0', 'asset_0b5f6daf449e', 'asset_7fccdbf29be3', 'asset_0fd42709e000', 'asset_f9a71ac49dff', 'asset_main_character_hero')
""")
for r in c.fetchall():
    print(r[0], '|', r[1], '|', r[3])
