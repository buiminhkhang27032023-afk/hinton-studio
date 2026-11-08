with open('d:/phim ai thời trang/lib/models.ts', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('"audios": "{{audios}}"', '"audios": "{{audios}}",\n        "videos": "{{videos}}"')

with open('d:/phim ai thời trang/lib/models.ts', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated lib/models.ts with videos parameter!')

import sqlite3, json
conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
rows = c.execute("SELECT id, config FROM models WHERE id LIKE '%seedance%'").fetchall()
for mid, cfg_str in rows:
    cfg = json.loads(cfg_str)
    if 'body' in cfg and 'images' in cfg['body']:
        cfg['body']['videos'] = '{{videos}}'
        c.execute("UPDATE models SET config = ? WHERE id = ?", (json.dumps(cfg), mid))
        print("Updated in SQLite:", mid)
conn.commit()
print("All Seedance models in DB now have videos: {{videos}}")
