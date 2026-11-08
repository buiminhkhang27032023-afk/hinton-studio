import sqlite3
import json

db = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = db.cursor()
rows = c.execute("SELECT id, node_id, model, status, provider_job, input, error FROM jobs WHERE project_id = 'prj_1507511d78c4' ORDER BY created_at DESC LIMIT 15").fetchall()
for r in rows:
    print('JOB:', r[0], 'node:', r[1], 'model:', r[2], 'status:', r[3], 'pjob:', r[4])
    try:
        inp = json.loads(r[5]) if r[5] else {}
        print('  images:', inp.get('vars', {}).get('images'))
        prompt = inp.get('vars', {}).get('prompt')
        if prompt:
            print('  prompt:', prompt[:120].replace('\n', ' '))
    except Exception as e:
        print('  error parsing inp:', e)
    if r[6]:
        print('  error:', str(r[6])[:200])
