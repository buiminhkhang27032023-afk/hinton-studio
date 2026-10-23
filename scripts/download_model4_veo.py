import sqlite3, json, urllib.request, time, os

conn = sqlite3.connect("data/studio.db")
cur = conn.cursor()
row = cur.execute("SELECT value FROM settings WHERE key='provider'").fetchone()
prov = json.loads(row[0])
conn.close()

job_id = "svgen_07f3cff9-e677-4051-913b-173bbd106d6d"
status_url = f"{prov['baseUrl']}/videos/{job_id}"
content_url = f"{prov['baseUrl']}/videos/{job_id}/content"
headers = {"Authorization": f"Bearer {prov['apiKey']}"}

output_path = "model4_veo_raw.mp4"

print(f"=== POLLING VEO 3.1 JOB: {job_id} ===", flush=True)

for i in range(60): # wait up to 6 minutes
    req = urllib.request.Request(status_url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            status = data.get('status')
            prog = data.get('progress')
            print(f"[{i+1}/60] Status: {status}, Progress: {prog}%", flush=True)
            
            if status in ["completed", "succeeded", "done"]:
                print("Job finished! Downloading video content...", flush=True)
                c_req = urllib.request.Request(content_url, headers=headers)
                with urllib.request.urlopen(c_req, timeout=30) as c_resp:
                    content = c_resp.read()
                    with open(output_path, "wb") as f:
                        f.write(content)
                print(f"=== DOWNLOADED {output_path} ({len(content)} bytes) ===", flush=True)
                break
                
            if status in ["failed", "error", "cancelled"]:
                print(f"ERROR: Job failed with: {data}", flush=True)
                break
    except Exception as e:
        print(f"[{i+1}] Request error: {e}", flush=True)
        
    time.sleep(6)
