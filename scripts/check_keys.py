import sqlite3
import json

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())

for k in ['provider', 'provider_piapi', 'provider_iooai', 'provider_runninghub']:
    val = settings.get(k)
    print(f"=== {k} ===")
    if not val:
        print("  None")
        continue
    try:
        data = json.loads(val)
        if isinstance(data, dict):
            for sub_k, sub_v in data.items():
                if isinstance(sub_v, str) and len(sub_v) > 6:
                    print(f"  {sub_k}: len={len(sub_v)}, {sub_v[:4]}...{sub_v[-4:]}")
                else:
                    print(f"  {sub_k}: {sub_v}")
        else:
            print("  Raw:", data)
    except Exception as e:
        print(f"  Err: {e}")
