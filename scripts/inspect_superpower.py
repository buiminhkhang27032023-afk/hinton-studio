import sqlite3
import json

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
row = c.execute("SELECT data FROM graphs WHERE project_id='prj_superpower_20s'").fetchone()
graph = json.loads(row[0])
for n in graph.get('nodes', []):
    if n['id'] in ['node_tryon_nu', 'node_shot_1', 'node_shot_2', 'node_shot_3', 'node_shot_4']:
        print(f"\n=== Node: {n['id']} ({n['type']}) ===")
        print(json.dumps(n['data'], indent=2, ensure_ascii=False))
