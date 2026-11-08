import sqlite3, json
conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
c.execute("SELECT project_id, data FROM graphs WHERE project_id = ?", ('prj_06d6f1c9496a',))
row = c.fetchone()
if row:
    g = json.loads(row[1])
    nodes = g.get('nodes', [])
    for n in nodes:
        print(n.get('id'), n.get('type'), n.get('data', {}).get('name'), n.get('data', {}).get('modelKind'))
