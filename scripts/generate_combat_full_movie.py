import sqlite3
import json
import requests
import time
import os
import subprocess

# 1. Connect to Studio DB
conn = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')
base_url = "https://api.iooai.cn/v1"

# CDN Image URL
char_img = "https://rh-images-switch-1252422369.cos.ap-guangzhou.myqcloud.com/input/openapi/89e182a5b269c54aea9167111f3180f88b77ca249219801338ab8e1983e1263f.png"

dest_dir = r"d:\phim ai thời trang\data\assets\prj_combat_seedance_15s"
os.makedirs(dest_dir, exist_ok=True)

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

prompt_part1 = (
    "Cinematic epic action blockbuster film intro, 15 seconds. High production value. "
    "Reference the handsome muscular Asian man in sleek black business suit and white shirt from image. "
    "00:00-00:06: Atmospheric tracking shot. He stands calmly amidst a foggy ruined concrete battleground at dusk, surrounded by hostile armed enemy combatants aiming red laser weapons at him. "
    "00:06-00:10: Slow dramatic zoom-in on his sharp intense face as he calmly adjusts his necktie with cold icy confidence, wind blowing his dark suit jacket. "
    "00:10-00:15: Enemies fire intense laser pulses, as beams streak toward him, his eyes suddenly flash with terrifying crimson red energy sparks, clenching fists as ground cracks under his feet, cinematic IMAX lighting, photorealistic 8k, 24fps."
)

prompt_part3 = (
    "Cinematic epic action blockbuster film outro and aftermath, 15 seconds. High production value. "
    "Reference the handsome muscular Asian man in sleek black suit from image. "
    "00:00-00:06: Standing victorious in the smoking crater of the devastated battlefield surrounded by defeat and burning debris. "
    "He slowly exhales glowing crimson vapor, the blazing fiery aura around his fists and glowing red eyes gently dimming and extinguishing back to normal. "
    "00:06-00:10: He casually brushes ash and dust off his black suit lapel, straightening his posture with supreme confidence. "
    "00:10-00:15: Dark storm clouds part above as a colossal alien dreadnought flagship descends from the sky, casting a massive shadow over the ruins. "
    "He looks up directly at the mothership with a subtle fearless smirk, camera pulling back dramatically into epic wide vista, cinematic blockbuster climax, photorealistic 8k, 24fps."
)

tasks = {}

def submit_task(part_name, prompt):
    payload = {
        "model": "seedance2.5 快速版",
        "prompt": prompt,
        "images": [char_img],
        "seconds": "15"
    }
    print(f"Submitting {part_name} to seedance2.5 快速版...", flush=True)
    res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=35)
    print(f"{part_name} response status: {res.status_code}", flush=True)
    if res.status_code == 200:
        data = res.json()
        tid = data.get('id')
        print(f"{part_name} submitted successfully! Task ID: {tid}", flush=True)
        return tid
    else:
        print(f"Error submitting {part_name}: {res.text}", flush=True)
        return None

tid_part1 = submit_task("Part 1 (Intro 15s)", prompt_part1)
time.sleep(2)
tid_part3 = submit_task("Part 3 (Outro 15s)", prompt_part3)

if not tid_part1 and not tid_part3:
    print("Failed to submit tasks. Exiting.", flush=True)
    exit(1)

tasks = {}
if tid_part1:
    tasks["part1"] = {
        "id": tid_part1,
        "name": "Part 1 - Mở Đầu (Intro 15s)",
        "file": os.path.join(dest_dir, "male_combat_part1_intro_15s.mp4"),
        "done": False,
        "asset_id": "asset_combat_part1_intro_15s"
    }
if tid_part3:
    tasks["part3"] = {
        "id": tid_part3,
        "name": "Part 3 - Kết Thúc (Outro 15s)",
        "file": os.path.join(dest_dir, "male_combat_part3_outro_15s.mp4"),
        "done": False,
        "asset_id": "asset_combat_part3_outro_15s"
    }

print("\n=== Monitoring tasks until completion ===", flush=True)

# Poll with 10s intervals to avoid excessive API calls
max_loops = 60 # 60 * 10s = 600s (10 minutes)
for loop in range(max_loops):
    all_done = True
    for key, info in tasks.items():
        if info["done"]:
            continue
        all_done = False
        try:
            r = requests.get(f"{base_url}/videos/{info['id']}", headers=headers, timeout=12)
            data = r.json()
            status = data.get('status')
            progress = data.get('progress', 0)
            print(f"[{loop+1}] {info['name']}: {status} ({progress}%)", flush=True)
            if status == 'completed':
                vurl = data.get('output_url') or data.get('video_url') or (data.get('videos', [{}])[0].get('url'))
                if vurl:
                    print(f"Downloading {info['name']} from {vurl}...", flush=True)
                    vres = requests.get(vurl, timeout=90)
                    with open(info['file'], "wb") as f:
                        f.write(vres.content)
                    print(f"Saved to {info['file']} ({os.path.getsize(info['file'])/1024/1024:.2f} MB)", flush=True)
                    info["done"] = True
                    
                    # Register in db
                    c.execute("""
                        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                        VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
                    """, (
                        info["asset_id"],
                        'prj_combat_seedance_15s',
                        info["name"],
                        f"/api/files/prj_combat_seedance_15s/{os.path.basename(info['file'])}",
                        json.dumps({'model': 'seedance2.5 快速版', 'duration': 15, 'size': len(vres.content)}),
                        int(time.time() * 1000)
                    ))
                    conn.commit()
            elif status in ['failed', 'error', 'cancelled']:
                print(f"Task {info['name']} failed: {data}", flush=True)
                info["done"] = True
        except Exception as e:
            print(f"Poll error for {info['name']}: {e}", flush=True)
            
    if all(t["done"] for t in tasks.values()):
        print("\nAll tasks completed!", flush=True)
        break
    time.sleep(10)

# Check Part 2 existing file
part2_file = os.path.join(dest_dir, "male_combat_battle_seedance25_15s.mp4")
part1_file = os.path.join(dest_dir, "male_combat_part1_intro_15s.mp4")
part3_file = os.path.join(dest_dir, "male_combat_part3_outro_15s.mp4")
full_movie_file = os.path.join(dest_dir, "male_combat_full_movie_45s.mp4")

print("\n=== Concatenating into 45s Full Action Movie ===", flush=True)
if os.path.exists(part1_file) and os.path.exists(part2_file) and os.path.exists(part3_file):
    # Create concat list
    concat_list = os.path.join(dest_dir, "concat_list.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        f.write(f"file '{part1_file.replace(os.sep, '/')}'\n")
        f.write(f"file '{part2_file.replace(os.sep, '/')}'\n")
        f.write(f"file '{part3_file.replace(os.sep, '/')}'\n")
    
    cmd = [
        "ffmpeg", "-y", "-f", "concat", "-safe", "0",
        "-i", concat_list,
        "-c", "copy",
        full_movie_file
    ]
    print("Running ffmpeg concat:", " ".join(cmd), flush=True)
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if os.path.exists(full_movie_file) and os.path.getsize(full_movie_file) > 1000:
        print(f"SUCCESS! Merged 45s Full Movie: {full_movie_file} ({os.path.getsize(full_movie_file)/1024/1024:.2f} MB)", flush=True)
        
        # Register full movie in studio.db
        c.execute("""
            INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
            VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
        """, (
            "asset_combat_full_movie_45s",
            'prj_combat_seedance_15s',
            "PHIM CHIẾN ĐẤU HOÀN CHỈNH 45S (HINTON STUDIO)",
            f"/api/files/prj_combat_seedance_15s/{os.path.basename(full_movie_file)}",
            json.dumps({'model': 'seedance2.5 快速版', 'duration': 45, 'size': os.path.getsize(full_movie_file), 'acts': 3}),
            int(time.time() * 1000)
        ))
        conn.commit()
    else:
        print("Concat copy failed, trying re-encode...", flush=True)
        cmd2 = [
            "ffmpeg", "-y",
            "-i", part1_file,
            "-i", part2_file,
            "-i", part3_file,
            "-filter_complex", "[0:v][1:v][2:v]concat=n=3:v=1[v]",
            "-map", "[v]",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            full_movie_file
        ]
        res2 = subprocess.run(cmd2, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if os.path.exists(full_movie_file):
            print(f"SUCCESS re-encode! Merged 45s Full Movie: {full_movie_file} ({os.path.getsize(full_movie_file)/1024/1024:.2f} MB)", flush=True)
else:
    print(f"Files missing: p1={os.path.exists(part1_file)}, p2={os.path.exists(part2_file)}, p3={os.path.exists(part3_file)}")

print("FINISHED PROCESS.")
