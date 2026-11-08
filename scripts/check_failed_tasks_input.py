import sqlite3
import json

db = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = db.cursor()
rows = c.execute("SELECT id, node_id, model, status, provider_job, input, error FROM jobs WHERE provider_job IN ('task_wgqYrKy2EtD47sHSG6schKbpcFeJoAu8', 'task_L4dA3Rx9hQJ3zM4ekk4XiA6ta7xQOw16', 'task_nYLhyDpS2hA2a5WdtBYlqfqje1itKalj', 'task_2e6AXD5Ub6IFTLZlrRGUe3IAVqcxAjC0')").fetchall()
for r in rows:
    print('===', r[0], r[1], r[2], r[4], '===')
    inp = json.loads(r[5]) if r[5] else {}
    print('  images:', inp.get('vars', {}).get('images'))
    print('  body:', inp.get('config', {}).get('body'))
    print('  prompt:', inp.get('vars', {}).get('prompt'))
