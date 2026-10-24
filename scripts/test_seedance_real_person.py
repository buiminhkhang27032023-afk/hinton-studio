import sqlite3
import json
import requests
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = "https://www.runninghub.cn/openapi/v2"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Host": "www.runninghub.cn"
}

# Upload freshly and get full signed url
img_path = "d:/phim ai thời trang/data/assets/prj_superpower_20s/asset_07134c809a66-Th-----AI--N--ch-nh---V-y-d--h-i-h-ng.jpg"
with open(img_path, "rb") as f:
    files = {"file": ("tryon_female.jpg", f, "image/jpeg")}
    res = requests.post(f"{base_url}/media/upload/binary", headers=headers, files=files, timeout=30)
    full_url = res.json()['data']['download_url']

print("Full signed URL:", full_url[:80], "...")

# Test SparkVideo 2.0 Mini (Seedance 2.0) with realPersonMode: True
payload = {
    "firstFrameUrl": full_url,
    "prompt": "Cinematic 5s film shot, high-angle dolly in. A stunningly beautiful Asian woman with wavy black hair in dusty rose silk gown stands gracefully as celestial energy gathers around her. Photorealistic 8k, cinematic lighting.",
    "duration": "5",
    "resolution": "720p",
    "ratio": "adaptive",
    "generateAudio": True,
    "realPersonMode": True
}

print("Submitting Seedance 2.0 Mini with realPersonMode=True...")
res = requests.post(f"{base_url}/rhart-video/sparkvideo-2.0-mini/image-to-video", headers=headers, json=payload, timeout=20)
data = res.json()
print("Submit response:", data)
task_id = data.get('taskId')

if task_id:
    print(f"Task ID: {task_id}, polling...")
    for i in range(25):
        time.sleep(5)
        p = requests.post(f"{base_url}/query", headers=headers, json={"taskId": task_id}, timeout=10).json()
        st = p.get('status')
        print(f"[{i+1}] Status: {st}")
        if st == 'SUCCESS':
            print("SUCCESS! Output video URL:", p['results'][0]['url'])
            print("Usage:", p.get('usage'))
            break
        elif st in ['FAILED', 'CANCEL']:
            print("Failed:", p.get('errorMessage'))
            break
