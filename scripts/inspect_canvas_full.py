import sqlite3
import json

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', ('prj_1507511d78c4',)).fetchone()[0]
g = json.loads(graph_raw)

print(f"Nodes count: {len(g.get('nodes', []))}")
for n in g.get('nodes', []):
    nid = n['id']
    ntype = n.get('type')
    data = n.get('data', {})
    label = data.get('label')
    status = data.get('status')
    media = data.get('imageUrl') or data.get('videoUrl') or (data.get('result') or {}).get('url')
    print(f"[{nid}] type={ntype} label='{label}' status={status} media={media}")

print(f"\nEdges count: {len(g.get('edges', []))}")
for e in g.get('edges', [])[:10]:
    print(f"  {e.get('source')} -> {e.get('target')}")
