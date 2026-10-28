import sqlite3
import json
import requests
import time
import os

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')
base_url = "https://api.iooai.cn/v1"

public_url = "https://roman-manitoba-occurring-scratch.trycloudflare.com"
char_img = f"{public_url}/api/files/prj_zfold8_commercial_10s/character_man_suit.png"

# Prompt matching user's exact original request:
# "góc máy sẽ đưa từ dưới lòng bàn chân lên và camera quay nhanh 1 cái là đổi 1 bộ trang phục xong show dáng dùng nhân vật đang tham chiếu"
prompt = (
    "High-fashion commercial 15s film. Reference the handsome Asian male model from image. "
    "00:00–00:05: Ground-level extreme low-angle shot starting right at the soles of his stylish leather dress shoes, "
    "smoothly tilting up along his tailored trousers to his chest and confident face, looking down into lens. "
    "00:05–00:10: Suddenly the camera executes a fast dynamic whip-pan spin rotation (rapid whip transition with motion blur), "
    "transforming his outfit into an elegant tailored camel overcoat as he takes a confident step forward. "
    "00:10–00:15: Another swift camera whip-spin cut, transforming him into a sharp navy formal suit; "
    "he strikes a high-fashion runway pose, turns his body to showcase his silhouette, smiling charismatically into camera. "
    "Studio editorial lighting, photorealistic 8k, cinematic color grading, smooth 24fps."
)

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "seedance2.5 快速版",
    "prompt": prompt,
    "images": [char_img],
    "seconds": "15"
}

print("Submitting seedance2.5 快速版 (15s) with male model...", flush=True)
res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=35)
print("Status code:", res.status_code, flush=True)
print("Response:", res.text, flush=True)

if res.status_code == 200:
    tid = res.json().get('id')
    print(f"Task ID: {tid}, monitoring...", flush=True)
    dest_dir = r"d:\phim ai thời trang\data\assets\prj_zfold8_commercial_10s"
    dest_file = os.path.join(dest_dir, "male_lookbook_seedance25_fast_15s.mp4")

    for attempt in range(40): # 40 * 6s = 240s
        time.sleep(6)
        try:
            poll_res = requests.get(f"{base_url}/videos/{tid}", headers=headers, timeout=10)
            data = poll_res.json()
            status = data.get('status')
            progress = data.get('progress')
            print(f"[{attempt+1}] Status: {status}, Progress: {progress}%", flush=True)

            if status == 'completed':
                vurl = data.get('output_url') or data.get('video_url') or (data.get('videos', [{}])[0].get('url'))
                print("SUCCESS! Completed Video URL:", vurl, flush=True)
                if vurl:
                    vres = requests.get(vurl, timeout=60)
                    with open(dest_file, "wb") as f:
                        f.write(vres.content)
                    size_mb = os.path.getsize(dest_file) / 1024 / 1024
                    print(f"Saved to {dest_file} ({size_mb:.2f} MB)", flush=True)

                    # Register in assets table
                    asset_id = "asset_male_lookbook_seedance25_15s"
                    c.execute("""
                        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                        VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
                    """, (
                        asset_id,
                        'prj_zfold8_commercial_10s',
                        'Male-Lookbook-Seedance2.5-Fast-15s',
                        f"/api/files/prj_zfold8_commercial_10s/male_lookbook_seedance25_fast_15s.mp4",
                        json.dumps({'model': 'seedance2.5 快速版', 'duration': 15, 'size': len(vres.content)}),
                        int(time.time() * 1000)
                    ))
                    conn.commit()
                    print("Asset registered in studio.db!", flush=True)
                break
            elif status in ['failed', 'error', 'cancelled']:
                print("Failed:", data, flush=True)
                break
        except Exception as e:
            print("Poll error:", e, flush=True)
