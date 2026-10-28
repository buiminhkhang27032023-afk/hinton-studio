import sqlite3
import json
import requests
import time
import os
import subprocess

# 1. Connect to Studio DB and get credentials
conn = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')
base_url = "https://api.iooai.cn/v1"

dest_dir = r"d:\phim ai thời trang\data\assets\prj_combat_seedance_15s"
os.makedirs(dest_dir, exist_ok=True)

# CDN Image URL
char_img = "https://rh-images-switch-1252422369.cos.ap-guangzhou.myqcloud.com/input/openapi/89e182a5b269c54aea9167111f3180f88b77ca249219801338ab8e1983e1263f.png"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

prompt_part4 = (
    "Epic blockbuster sci-fi action film, 15 seconds. High production value. "
    "Reference the handsome muscular Asian man in sleek black business suit from image. "
    "00:00-00:05: He teleports onto the massive metallic flight deck inside a colossal alien dreadnought warship, atmospheric dark futuristic lighting with glowing purple energy conduits. Hundreds of menacing biomechanical insectoid alien warriors with glowing blue eyes screech and charge at him en masse. "
    "00:05-00:10: He unleashes blazing crimson-red plasma energy blades from his fists, executing supersonic martial arts sword strikes, slashing through armored alien monsters with kinetic motion blur and purple spark explosions. "
    "00:10-00:15: Dynamic 360 bullet-time camera orbit as he executes a high-flying flaming roundhouse kick, blasting heavy alien guards crashing through blast doors, photorealistic 8k IMAX cinematography, 24fps."
)

prompt_part5 = (
    "Epic blockbuster sci-fi action climax film, 15 seconds. High production value. "
    "Reference the handsome muscular Asian man in sleek black suit. "
    "00:00-00:06: Inside the glowing antimatter core chamber of the alien dreadnought, a giant 3-meter alien titan warlord slams a massive gravity hammer creating a violent shockwave. The hero somersaults over the blast in mid-air with supreme agility. "
    "00:06-00:11: His aura explodes into radiant crimson-gold supercharged overdrive, delivering a relentless flurry of supersonic shockwave punches that shatter the alien warlord's heavy armor and sent him flying into steel pillars. "
    "00:11-00:15: He delivers an earth-shattering final punch directly into the glowing core sphere, catastrophic explosions rip the colossal mothership in half across the stormy sky, hero stands fearless on the burning hull falling toward earth, breathtaking IMAX epic scale, 24fps."
)

def submit_task(part_name, prompt):
    payload = {
        "model": "seedance2.5 快速版",
        "prompt": prompt,
        "images": [char_img],
        "seconds": "15"
    }
    print(f"Submitting {part_name} to seedance2.5 快速版...", flush=True)
    res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=35)
    print(f"{part_name} status code: {res.status_code}", flush=True)
    if res.status_code == 200:
        data = res.json()
        tid = data.get('id')
        print(f"{part_name} submitted successfully! Task ID: {tid}", flush=True)
        return tid
    else:
        print(f"Error submitting {part_name}: {res.text}", flush=True)
        return None

tid_part4 = submit_task("Part 4 (Alien Legion 15s)", prompt_part4)
time.sleep(2)
tid_part5 = submit_task("Part 5 (Alien Titan & Core 15s)", prompt_part5)

tasks = {}
if tid_part4:
    tasks["part4"] = {
        "id": tid_part4,
        "name": "Part 4: Đột Kích Boong Tàu - Quét Sạch Quân Đoàn (15s)",
        "file": os.path.join(dest_dir, "male_combat_part4_alien_legion_15s.mp4"),
        "done": False,
        "asset_id": "asset_combat_part4_alien_legion_15s"
    }
if tid_part5:
    tasks["part5"] = {
        "id": tid_part5,
        "name": "Part 5: Đại Chiến Titan & Phá Lõi Tàu Mẹ (15s)",
        "file": os.path.join(dest_dir, "male_combat_part5_alien_core_15s.mp4"),
        "done": False,
        "asset_id": "asset_combat_part5_alien_core_15s"
    }

print("\n=== Monitoring tasks until completion ===", flush=True)

max_loops = 70 # 70 * 10s = 700s (~11 minutes)
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
                    print(f"Downloading {info['name']} from {vurl[:60]}...", flush=True)
                    # Retry loop for media transfer
                    for dl_attempt in range(5):
                        vres = requests.get(vurl, timeout=90)
                        if len(vres.content) > 10000:
                            with open(info['file'], "wb") as f:
                                f.write(vres.content)
                            size_mb = os.path.getsize(info['file'])/1024/1024
                            print(f"SUCCESS saved {info['name']} ({size_mb:.2f} MB)", flush=True)
                            info["done"] = True
                            
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
                            break
                        else:
                            print(f"File preparing, waiting 8s before retry (attempt {dl_attempt+1})...", flush=True)
                            time.sleep(8)
            elif status in ['failed', 'error', 'cancelled']:
                print(f"Task {info['name']} failed: {data}", flush=True)
                info["done"] = True
        except Exception as e:
            print(f"Poll error for {info['name']}: {e}", flush=True)

    if all(t["done"] for t in tasks.values()):
        print("\nAll alien combat tasks completed!", flush=True)
        break
    time.sleep(10)

# Merge files
p1 = os.path.join(dest_dir, "male_combat_part1_intro_15s.mp4")
p2 = os.path.join(dest_dir, "male_combat_battle_seedance25_15s.mp4")
p3 = os.path.join(dest_dir, "male_combat_part3_outro_15s.mp4")
p4 = os.path.join(dest_dir, "male_combat_part4_alien_legion_15s.mp4")
p5 = os.path.join(dest_dir, "male_combat_part5_alien_core_15s.mp4")

alien_30s_out = os.path.join(dest_dir, "video_chuong_tau_me_30s.mp4")
master_75s_out = os.path.join(dest_dir, "video_chien_dau_dai_kich_ban_75s.mp4")

if os.path.exists(p4) and os.path.exists(p5):
    print("\n=== Concatenating Alien Chapter 30s ===", flush=True)
    cmd_30s = [
        "ffmpeg", "-y",
        "-i", p4,
        "-i", p5,
        "-filter_complex", "[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a];[a]aresample=48000[aout]",
        "-map", "[v]", "-map", "[aout]",
        "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "256k",
        alien_30s_out
    ]
    subprocess.run(cmd_30s, check=True)
    print(f"SUCCESS! Alien Chapter 30s: {alien_30s_out} ({os.path.getsize(alien_30s_out)/1024/1024:.2f} MB)", flush=True)

    c.execute("""
        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
        VALUES (?, 'prj_combat_seedance_15s', ?, 'video', 'video/mp4', ?, ?, ?)
    """, (
        "asset_combat_alien_chapter_30s",
        "Chương II: Đột Kích Tàu Mẹ Dị Chủng (30s)",
        f"/api/files/prj_combat_seedance_15s/{os.path.basename(alien_30s_out)}",
        json.dumps({'model': 'seedance2.5 快速版', 'duration': 30, 'size': os.path.getsize(alien_30s_out)}),
        int(time.time() * 1000)
    ))
    conn.commit()

if os.path.exists(p1) and os.path.exists(p2) and os.path.exists(p3) and os.path.exists(p4) and os.path.exists(p5):
    print("\n=== Concatenating Master Epic Saga 75s ===", flush=True)
    cmd_75s = [
        "ffmpeg", "-y",
        "-i", p1,
        "-i", p2,
        "-i", p3,
        "-i", p4,
        "-i", p5,
        "-filter_complex", 
        "[0:v][0:a][1:v][1:a][2:v][2:a][3:v][3:a][4:v][4:a]concat=n=5:v=1:a=1[v][a];[a]aresample=48000[aout]",
        "-map", "[v]", "-map", "[aout]",
        "-c:v", "libx264", "-crf", "17", "-preset", "fast", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "256k",
        master_75s_out
    ]
    subprocess.run(cmd_75s, check=True)
    print(f"SUCCESS! Master Epic Saga 75s: {master_75s_out} ({os.path.getsize(master_75s_out)/1024/1024:.2f} MB)", flush=True)

    dur_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', master_75s_out]
    dur = float(subprocess.check_output(dur_cmd).strip())
    print(f"Full 5-Act Epic Saga Duration: {dur:.2f}s", flush=True)

    c.execute("""
        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
        VALUES (?, 'prj_combat_seedance_15s', ?, 'video', 'video/mp4', ?, ?, ?)
    """, (
        "asset_combat_master_saga_75s",
        "🎬 SIÊU PHẨM CHIẾN ĐẤU HOÀN CHỈNH 75S: TỔNG TẤN CÔNG TÀU MẸ",
        f"/api/files/prj_combat_seedance_15s/{os.path.basename(master_75s_out)}",
        json.dumps({'model': 'seedance2.5 快速版', 'duration': int(dur), 'size': os.path.getsize(master_75s_out), 'acts': 5}),
        int(time.time() * 1000)
    ))
    
    # Update project name
    c.execute("""
        UPDATE projects
        SET name = 'Phim Chiến Đấu 75s: Đại Chiến Tàu Mẹ Dị Chủng (Bản Hoàn Chỉnh)',
            updated_at = ?
        WHERE id = 'prj_combat_seedance_15s'
    """, (int(time.time() * 1000),))
    conn.commit()

print("ALL ASSETS CREATED AND REGISTERED SUCCESSFULLY!")
