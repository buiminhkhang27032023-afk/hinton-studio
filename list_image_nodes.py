import sqlite3, json, os

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
row = c.execute("SELECT data FROM graphs WHERE project_id = 'prj_1507511d78c4'").fetchone()
graph = json.loads(row[0])

for n in graph.get('nodes', []):
    if n.get('type') == 'image':
        d = n.get('data', {})
        print(f"Node {n.get('id')}: pos={n.get('position')} url={d.get('imageUrl')}")
