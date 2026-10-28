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

# Epic 15s martial arts / superhero combat fighting script:
prompt = (
    "Epic blockbuster superhero martial arts combat action film, 15 seconds. "
    "Reference the handsome muscular Asian man from image as the combat hero. "
    "00:00–00:05: Extreme low-angle tracking shot. He stands in an intense fighting stance amidst a dark ruined battleground, "
    "eyes glowing with fierce battle fury, clenching his fists as crackling crimson fire and lightning aura erupts violently around his muscular body, shattering concrete at his feet. "
    "00:05–00:10: High-speed combat sequence! He explosive-dashes forward with superhuman speed, executing powerful martial arts kungfu strikes, "
    "dodging incoming energy blasts with a mid-air acrobatic spin, dynamic camera whipping and tracking his brutal punches and kicks with cinematic motion blur. "
    "00:10–00:15: Epic battle climax! He unleashes a devastating ground-shattering energy shockwave punch forward, sending a massive shockwave across the arena, "
    "camera orbits 360 degrees around him as sparks, dust, and embers rain down, standing victorious with fierce heroic determination, photorealistic 8k IMAX cinematography, 24fps."
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

print("Submitting EPIC COMBAT 15s to seedance2.5 快速版...", flush=True)
res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=35)
print("Status code:", res.status_code, flush=True)
print("Response:", res.text, flush=True)

if res.status_code == 200:
    tid = res.json().get('id')
    print(f"Combat Task ID: {tid}, monitoring...", flush=True)
    dest_dir = r"d:\phim ai thời trang\data\assets\prj_zfold8_commercial_10s"
    dest_file = os.path.join(dest_dir, "male_combat_battle_seedance25_15s.mp4")

    for attempt in range(45): # 45 * 6s = 270s
        time.sleep(6)
        try:
            poll_res = requests.get(f"{base_url}/videos/{tid}", headers=headers, timeout=10)
            data = poll_res.json()
            status = data.get('status')
            progress = data.get('progress')
            print(f"[{attempt+1}] Status: {status}, Progress: {progress}%", flush=True)

            if status == 'completed':
                vurl = data.get('output_url') or data.get('video_url') or (data.get('videos', [{}])[0].get('url'))
                print("COMBAT VIDEO SUCCESS! URL:", vurl, flush=True)
                if vurl:
                    vres = requests.get(vurl, timeout=60)
                    with open(dest_file, "wb") as f:
                        f.write(vres.content)
                    size_mb = os.path.getsize(dest_file) / 1024 / 1024
                    print(f"Saved combat video to {dest_file} ({size_mb:.2f} MB)", flush=True)

                    # Register in assets
                    asset_id = "asset_male_combat_seedance25_15s"
                    c.execute("""
                        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                        VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
                    """, (
                        asset_id,
                        'prj_zfold8_commercial_10s',
                        'Male-Combat-Action-Seedance2.5-15s',
                        f"/api/files/prj_zfold8_commercial_10s/male_combat_battle_seedance25_15s.mp4",
                        json.dumps({'model': 'seedance2.5 快速版', 'duration': 15, 'size': len(vres.content), 'genre': 'combat_action'}),
                        int(time.time() * 1000)
                    ))
                    conn.commit()
                    print("Combat asset registered in studio.db!", flush=True)
                break
            elif status in ['failed', 'error', 'cancelled']:
                print("Combat Task failed:", data, flush=True)
                break
        except Exception as e:
            print("Poll error:", e, flush=True)
