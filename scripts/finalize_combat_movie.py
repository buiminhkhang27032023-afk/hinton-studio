import subprocess, os, json, sqlite3, time

dest_dir = r"d:\phim ai thời trang\data\assets\prj_combat_seedance_15s"
p1 = os.path.join(dest_dir, "male_combat_part1_intro_15s.mp4")
p2 = os.path.join(dest_dir, "male_combat_battle_seedance25_15s.mp4")
p3 = os.path.join(dest_dir, "male_combat_part3_outro_15s.mp4")
full_out = os.path.join(dest_dir, "male_combat_full_movie_45s.mp4")

# Concatenate with ffmpeg
cmd = [
    "ffmpeg", "-y",
    "-i", p1,
    "-i", p2,
    "-i", p3,
    "-filter_complex", "[0:v][1:v][2:v]concat=n=3:v=1[v]",
    "-map", "[v]",
    "-c:v", "libx264", "-crf", "18", "-preset", "fast", "-pix_fmt", "yuv420p",
    full_out
]

print("Concatenating 3 parts into 45s movie...")
subprocess.run(cmd, check=True)
size_mb = os.path.getsize(full_out) / 1024 / 1024
print(f"Concatenated successfully! Size: {size_mb:.2f} MB")

# Verify duration
dur_cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', full_out]
dur = float(subprocess.check_output(dur_cmd).strip())
print(f"Full Movie Total Duration: {dur:.2f} seconds")

# Extract preview frames for review:
# Part 1 frames: 3s, 10s
# Part 2 frames: 18s, 27s
# Part 3 frames: 34s, 42s
preview_dir = r"C:\Users\Chen Qianyu\.gemini\antigravity\brain\bdbd603a-d0a7-4176-a196-329393979b65\combat_full_frames"
os.makedirs(preview_dir, exist_ok=True)

timestamps = [
    ("act1_surrounded_03s", "00:00:03"),
    ("act1_tie_laser_10s", "00:00:10"),
    ("act2_speed_dash_19s", "00:00:19"),
    ("act2_ground_slam_27s", "00:00:27"),
    ("act3_aura_fading_34s", "00:00:34"),
    ("act3_mothership_sky_42s", "00:00:42")
]

for label, ts in timestamps:
    out_img = os.path.join(preview_dir, f"{label}.jpg")
    cmd_f = ["ffmpeg", "-y", "-ss", ts, "-i", full_out, "-vframes", "1", "-q:v", "2", out_img]
    subprocess.run(cmd_f, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(f"Extracted {label}: exists={os.path.exists(out_img)}, size={os.path.getsize(out_img)}")

# Register in studio.db
conn = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = conn.cursor()

# Register Part 1, Part 3 and Full Movie
items = [
    ("asset_combat_part1_intro_15s", "Hồi 1 - Mở Đầu: Vòng Vây Nghẹt Thở (15s)", "/api/files/prj_combat_seedance_15s/male_combat_part1_intro_15s.mp4", 15, os.path.getsize(p1)),
    ("asset_combat_part2_battle_15s", "Hồi 2 - Cao Trào: Phản Công Hủy Diệt (15s)", "/api/files/prj_combat_seedance_15s/male_combat_battle_seedance25_15s.mp4", 15, os.path.getsize(p2)),
    ("asset_combat_part3_outro_15s", "Hồi 3 - Kết Thúc: Tàn Cuộc & Hạm Đội (15s)", "/api/files/prj_combat_seedance_15s/male_combat_part3_outro_15s.mp4", 15, os.path.getsize(p3)),
    ("asset_combat_full_movie_45s", "PHIM CHIẾN ĐẤU HOÀN CHỈNH 45S: KÍCH HOẠT DUNG NHAM", "/api/files/prj_combat_seedance_15s/male_combat_full_movie_45s.mp4", int(dur), os.path.getsize(full_out)),
]

for aid, name, url, duration, size in items:
    c.execute("""
        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
        VALUES (?, 'prj_combat_seedance_15s', ?, 'video', 'video/mp4', ?, ?, ?)
    """, (
        aid, name, url,
        json.dumps({'model': 'seedance2.5 快速版', 'duration': duration, 'size': size}),
        int(time.time() * 1000)
    ))

conn.commit()
print("All assets registered into studio.db!")
