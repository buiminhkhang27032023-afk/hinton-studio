import sqlite3, json

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
rows = c.execute("SELECT id, project_id, model, status, output, provider_job FROM jobs WHERE id='job_fashion_transformation_1'").fetchall()
for r in rows:
    print(f"ID={r[0]} Model={r[2]} Status={r[3]}")
    print("Output:", r[4])
    print("ProviderJob:", r[5])
