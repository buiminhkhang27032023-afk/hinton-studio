import sqlite3, json

conn = sqlite3.connect('data/studio.db')
cur = conn.cursor()
cur.execute("SELECT id, name, kind, meta FROM assets WHERE kind='video'")
for r in cur.fetchall():
    print(f"Asset: {r[1]} ({r[0]})")
    try:
        meta = json.loads(r[3]) if r[3] else {}
        if 'vars' in meta:
            print("  Prompt:", meta['vars'].get('prompt', '')[:100])
    except:
        pass
