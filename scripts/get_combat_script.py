import sqlite3
import json

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
rows = c.execute("SELECT project_id, data FROM graphs WHERE project_id IN ('prj_superpower_20s', 'prj_wuxia_30s')").fetchall()
for pid, data in rows:
    g = json.loads(data)
    print(f"=== {pid} ===")
    for n in g.get('nodes', []):
        if n.get('type') in ('prompt', 'prompt_master') or 'script' in n.get('id', ''):
            txt = n.get('data', {}).get('text') or n.get('data', {}).get('prompt') or ''
            print(f"[{n.get('id')}]: {txt[:400]}\n")
