import sqlite3, json

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
row = c.execute("SELECT data FROM graphs WHERE project_id='prj_a9c0d8476382'").fetchone()
if row:
    data = json.loads(row[0])
    for n in data.get('nodes', []):
        if n.get('id') in ('video', 'result', 'script'):
            print(f"=== {n.get('id')} ===")
            print(json.dumps(n.get('data', {}), indent=2, ensure_ascii=False))
