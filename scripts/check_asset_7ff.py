import sqlite3
import json

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
row = c.execute("SELECT id, name, meta FROM assets WHERE id = 'asset_7ffbff9b276b'").fetchone()
print('Asset:', row)

row_job = c.execute("SELECT id, node_id, model, input, provider_job FROM jobs WHERE output LIKE '%asset_7ffbff9b276b%'").fetchone()
if row_job:
    print('Job:', row_job[0], row_job[1], row_job[2], row_job[4])
    try:
        inp = json.loads(row_job[3])
        print('  vars:', inp.get('vars'))
    except Exception as e:
        print('  inp err:', e)
