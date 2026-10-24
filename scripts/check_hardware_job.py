import sqlite3
conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
print(c.execute("SELECT id, status, error FROM jobs WHERE project_id='prj_hardware_10s'").fetchall())
