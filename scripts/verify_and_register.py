import cv2, os, sqlite3, time, shutil, subprocess

out_dir = r"C:\Users\Chen Qianyu\.gemini\antigravity\brain\0e6c3b36-0208-4ea3-bdf5-994eea297105"

# 1. Extract frames from both videos
v_169 = "model4_flawless_fashion_16_9.mp4"
v_916 = "model4_flawless_tryon_9_16.mp4"

def sample_video(vpath, prefix):
    cap = cv2.VideoCapture(vpath)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    for ts, tag in [(1.5, "look1_trench"), (5.0, "look2_emerald"), (8.5, "look3_silver")]:
        f_idx = int(ts * fps)
        cap.set(cv2.CAP_PROP_POS_FRAMES, f_idx)
        ret, frame = cap.read()
        if ret:
            p = os.path.join(out_dir, f"{prefix}_{tag}.jpg")
            cv2.imwrite(p, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            print(f"Saved {p}, shape={frame.shape}")
    cap.release()

sample_video(v_169, "verify_169")
sample_video(v_916, "verify_916")

# 2. Build high-quality animated GIFs for both
# 9:16 GIF (360x640, 12 fps, optimized)
gif_916 = os.path.join(out_dir, "model4_flawless_tryon_9_16.gif")
cmd_gif916 = [
    "ffmpeg", "-y", "-i", v_916,
    "-vf", "fps=12,scale=360:640:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
    gif_916
]
subprocess.run(cmd_gif916, check=True)
print(f"Created GIF 9:16: {gif_916} ({os.path.getsize(gif_916)} bytes)")

# 16:9 GIF (640x360, 12 fps, optimized)
gif_169 = os.path.join(out_dir, "model4_flawless_fashion_16_9.gif")
cmd_gif169 = [
    "ffmpeg", "-y", "-i", v_169,
    "-vf", "fps=12,scale=640:360:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
    gif_169
]
subprocess.run(cmd_gif169, check=True)
print(f"Created GIF 16:9: {gif_169} ({os.path.getsize(gif_169)} bytes)")

# 3. Register to studio.db and library
lib_dir = r"data\assets\_library"
os.makedirs(lib_dir, exist_ok=True)
shutil.copy(v_169, os.path.join(lib_dir, v_169))
shutil.copy(v_916, os.path.join(lib_dir, v_916))

conn = sqlite3.connect("data/studio.db")
c = conn.cursor()
now_ts = int(time.time() * 1000)

c.execute("""
INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (
    "asset_model4_flawless_tryon_9_16",
    "_library",
    "Model 4 - Video Thay Đồ Thời Trang 9:16 (Flawless Face Clone)",
    "video",
    "video/mp4",
    f"/api/files/_library/{v_916}",
    '{"resolution": "1080x1920", "fps": 24, "duration": 10.0, "format": "9:16 Try-On Lookbook", "model": "Model 4"}',
    now_ts
))

c.execute("""
INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (
    "asset_model4_flawless_fashion_16_9",
    "_library",
    "Model 4 - Sàn Diễn Điện Ảnh 16:9 Full HD (Flawless Face Clone)",
    "video",
    "video/mp4",
    f"/api/files/_library/{v_169}",
    '{"resolution": "1920x1080", "fps": 24, "duration": 10.0, "format": "16:9 Cinematic Widescreen", "model": "Model 4"}',
    now_ts
))

conn.commit()
conn.close()
print("Registered both videos into studio.db library successfully!")
