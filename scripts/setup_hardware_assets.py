import os
import shutil
import sqlite3
import json
import time

BASE_DIR = "d:/phim ai thời trang"
PROJECT_ID = "prj_hardware_10s"
ASSET_DIR = f"{BASE_DIR}/data/assets/{PROJECT_ID}"
os.makedirs(ASSET_DIR, exist_ok=True)

img_char = r"C:/Users/Chen Qianyu/.gemini/antigravity/brain/bdbd603a-d0a7-4176-a196-329393979b65/.user_uploaded/media_1792835191518_8e2a9e97.jpg"
img_warehouse = r"C:/Users/Chen Qianyu/.gemini/antigravity/brain/bdbd603a-d0a7-4176-a196-329393979b65/.user_uploaded/media_1792835234544_7343ece4.png"

dst_char = f"{ASSET_DIR}/character_turnaround.jpg"
dst_warehouse = f"{ASSET_DIR}/warehouse_ref.png"

shutil.copy2(img_char, dst_char)
shutil.copy2(img_warehouse, dst_warehouse)

print("Copied assets to project dir!")

conn = sqlite3.connect(f"{BASE_DIR}/data/studio.db")
c = conn.cursor()
now_ts = int(time.time() * 1000)

c.execute("""
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", ("asset_char_model", PROJECT_ID, "Nhân vật nữ chính (Turnaround)", "image", "image/jpeg", f"/api/files/{PROJECT_ID}/character_turnaround.jpg", json.dumps({"role": "character"}), now_ts))

c.execute("""
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", ("asset_warehouse_scene", PROJECT_ID, "Bối cảnh Kho Hàng Kim Khí (Gốc)", "image", "image/png", f"/api/files/{PROJECT_ID}/warehouse_ref.png", json.dumps({"role": "scene"}), now_ts))

conn.commit()
print("Updated database assets for prj_hardware_10s!")
