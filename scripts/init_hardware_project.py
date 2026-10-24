import sqlite3
import json
import os
import shutil
import time

BASE_DIR = "d:/phim ai thời trang"
PROJECT_ID = "prj_hardware_10s"
PROJECT_DIR = f"{BASE_DIR}/data/assets/{PROJECT_ID}"
os.makedirs(PROJECT_DIR, exist_ok=True)

src_img = r"C:/Users/Chen Qianyu/.gemini/antigravity/brain/bdbd603a-d0a7-4176-a196-329393979b65/.user_uploaded/media_1792835056702_8f7ea9a3.png"
dst_img = f"{PROJECT_DIR}/source_screenshot.png"
shutil.copy2(src_img, dst_img)
print(f"Copied source screenshot to {dst_img}")

# Connect DB
conn = sqlite3.connect(f"{BASE_DIR}/data/studio.db")
c = conn.cursor()
now_ts = int(time.time() * 1000)

# Create project
c.execute("""
    INSERT OR REPLACE INTO projects (id, name, thumbnail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
""", (PROJECT_ID, "Quảng Cáo Kho Kim Khí 10s (Chuyên Nghiệp)", f"/api/files/{PROJECT_ID}/source_screenshot.png", now_ts, now_ts))

# Insert source asset
c.execute("""
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", ("asset_hardware_raw", PROJECT_ID, "Ảnh chụp nguồn TikTok Kho Kim Khí", "image", "image/png", f"/api/files/{PROJECT_ID}/source_screenshot.png", json.dumps({"source": "user_upload"}), now_ts))

conn.commit()
print("Project prj_hardware_10s initialized in DB!")
