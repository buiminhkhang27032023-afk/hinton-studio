import sqlite3
import json

db = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = db.cursor()
graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', ('prj_1507511d78c4',)).fetchone()[0]
g = json.loads(graph_raw)
for n in g.get('nodes', []):
    if 'video' in n['id'] or 'result' in n['id']:
        print('Node:', n['id'], 'type:', n.get('type'), 'status:', n['data'].get('status'), 'videoUrl:', n['data'].get('videoUrl'))
