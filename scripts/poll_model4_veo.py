import sqlite3, json, urllib.request, time

conn = sqlite3.connect("data/studio.db")
cur = conn.cursor()
row = cur.execute("SELECT value FROM settings WHERE key='provider'").fetchone()
prov = json.loads(row[0])
conn.close()

job_id = "svgen_07f3cff9-e677-4051-913b-173bbd106d6d"
url = f"{prov['baseUrl']}/videos/{job_id}"
headers = {"Authorization": f"Bearer {prov['apiKey']}"}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"Job: {job_id} | Status: {data.get('status')} | Progress: {data.get('progress')}")
except Exception as e:
    print(f"Error: {e}")
