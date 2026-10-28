import sqlite3, json

c = sqlite3.connect('d:/phim ai thời trang/data/studio.db').cursor()
row = c.execute("SELECT input, output, model, status FROM jobs WHERE provider_job='task_tslTKkAxb8H7QpfOIAtof876NKDdqbxo'").fetchone()
print("Job input:", row[0])
print("Job output:", row[1])
print("Job model:", row[2])
