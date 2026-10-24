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

# 1. Upload Try-on image
img_path = "d:/phim ai thời trang/data/assets/prj_superpower_20s/asset_07134c809a66-Th-----AI--N--ch-nh---V-y-d--h-i-h-ng.jpg"
print("Uploading try-on image to RunningHub...")
with open(img_path, "rb") as f:
    files = {"file": ("tryon_female.jpg", f, "image/jpeg")}
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Host": "www.runninghub.cn"
    }
    res = requests.post(f"{base_url}/media/upload/binary", headers=headers, files=files, timeout=30)
    data = res.json()
    if data.get('code') != 0:
        print("Upload failed:", data)
        exit(1)
    uploaded_url = data['data']['download_url']
    print("Uploaded URL:", uploaded_url[:100], "...")

# 2. Submit Wan 2.6 image-to-video
payload = {
    "imageUrl": uploaded_url,
    "prompt": "Cinematic 5s opening shot, camera dolly-in. The beautiful Asian woman in the dusty rose silk evening dress stands in a majestic damaged gothic ballroom. Wind whips her long black hair and flowing satin gown. Dark silhouettes of two powerful men loom in the distant shadows on opposite sides. Volumetric dust, moody cinematic rim lighting, 8k photorealistic film still.",
    "duration": "5",
    "resolution": "720p",
    "shotType": "single"
}

print("Submitting Wan 2.6 image-to-video...")
res = requests.post(f"{base_url}/alibaba/wan-2.6/image-to-video", headers=headers, json=payload, timeout=30)
submit_data = res.json()
print("Submit response:", submit_data)
task_id = submit_data.get('taskId')
if not task_id:
    print("No task ID returned!")
    exit(1)

print(f"Task ID: {task_id}, polling status...")
for i in range(25):
    time.sleep(5)
    poll_res = requests.post(f"{base_url}/query", headers=headers, json={"taskId": task_id}, timeout=10)
    poll_data = poll_res.json()
    status = poll_data.get('status')
    print(f"[{i+1}] Status: {status}")
    if status == 'SUCCESS':
        print("SUCCESS! Output video URL:", poll_data['results'][0]['url'])
        break
    elif status in ['FAILED', 'CANCEL']:
        print("Failed:", poll_data)
        break
