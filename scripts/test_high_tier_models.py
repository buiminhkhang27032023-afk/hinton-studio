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

# Use the try-on image we already uploaded earlier
img_url = "https://rh-images-switch-1252422369.cos.ap-guangzhou.myqcloud.com/input/openapi/29017f9d625a1123e918c80474fdf785f148f146c3929365bdf2fcfe887fa2cc.jpg"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Host": "www.runninghub.cn"
}

tests = [
    (
        "MiniMax Hailuo 2.3 Standard",
        "minimax/hailuo-2.3/i2v-standard",
        {
            "imageUrl": img_url,
            "prompt": "Cinematic camera push in, dramatic movie lighting. The elegant Asian woman in the dusty-rose silk gown looks intensely ahead as supernatural embers drift past her face. 8k photorealistic.",
            "duration": "6",
            "enablePromptExpansion": True
        }
    ),
    (
        "Kling 2.6 Pro",
        "kling-v2.6-pro/image-to-video",
        {
            "imageUrl": img_url,
            "prompt": "Cinematic smooth push in shot. The stunning woman in dusty rose evening gown turns slightly, wind blowing her hair. Intense atmosphere. Audio: epic cinematic dramatic music.",
            "duration": "5",
            "sound": "true"
        }
    ),
    (
        "Wan 2.7",
        "alibaba/wan-2.7/image-to-video",
        {
            "firstImageUrl": img_url,
            "prompt": "Cinematic action shot, mystical golden glow surrounds the woman in the pink evening dress as she harnesses psychic powers, debris floats in slow motion.",
            "duration": "5",
            "resolution": "720P"
        }
    )
]

for name, endpoint, payload in tests:
    print(f"\n--- Testing {name} ({endpoint}) ---")
    try:
        res = requests.post(f"{base_url}/{endpoint}", headers=headers, json=payload, timeout=20)
        data = res.json()
        print("Status code:", res.status_code)
        print("Response:", json.dumps(data, ensure_ascii=False)[:300])
        task_id = data.get('taskId')
        if task_id:
            print(f"-> SUCCESS submitting {name}! TaskId: {task_id}")
            # Poll once
            time.sleep(3)
            p = requests.post(f"{base_url}/query", headers=headers, json={"taskId": task_id}, timeout=10).json()
            print("Poll status:", p.get('status'), "Usage:", p.get('usage'))
            break
    except Exception as e:
        print("Error:", e)
