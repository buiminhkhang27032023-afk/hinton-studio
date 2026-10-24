import sqlite3
import json
import urllib.request
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = "https://www.runninghub.ai/openapi/v2"

# Let's test submitting to rhart-video/sparkvideo-2.0-fast/text-to-video
endpoint = "rhart-video/sparkvideo-2.0-fast/text-to-video"
url = f"{base_url}/{endpoint}"

payload = {
    "prompt": "Cinematic 5s action shot, dramatic lighting, epic superhero duel sparks",
    "resolution": "720p",
    "duration": "5",
    "ratio": "16:9",
    "generateAudio": True
}

req_data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(
    url,
    data=req_data,
    headers={
        "Content-Type": "application/json",
        "Host": "www.runninghub.ai",
        "Authorization": f"Bearer {api_key}"
    }
)

print(f"Submitting to {url}...")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode())
        print("Submit response:", json.dumps(res, indent=2))
        task_id = res.get('taskId')
        if task_id:
            print(f"Task created! ID: {task_id}")
            # Poll status
            for i in range(10):
                time.sleep(3)
                poll_req = urllib.request.Request(
                    f"{base_url}/query",
                    data=json.dumps({"taskId": task_id}).encode('utf-8'),
                    headers={
                        "Content-Type": "application/json",
                        "Host": "www.runninghub.ai",
                        "Authorization": f"Bearer {api_key}"
                    }
                )
                with urllib.request.urlopen(poll_req, timeout=10) as poll_resp:
                    poll_data = json.loads(poll_resp.read().decode())
                    status = poll_data.get('status')
                    print(f"Poll #{i+1}: status={status}")
                    if status in ['SUCCESS', 'FAILED']:
                        print("Final poll result:", json.dumps(poll_data, indent=2))
                        break
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode()}")
except Exception as e:
    print("Error:", e)
