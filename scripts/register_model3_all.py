import os
import shutil
import sqlite3
import json
import cv2

conn = sqlite3.connect("data/studio.db")
cur = conn.cursor()

assets_to_reg = [
    {
        "id": "asset_model3_paris_runway",
        "file": "model3_paris_runway.mp4",
        "name": "Video Catwalk Runway Paris (Nhân Bản Mặt Model 3)",
        "desc": "Video sải bước sàn diễn Haute Couture Paris với khuôn mặt được nhân bản chính xác 100%.",
    },
    {
        "id": "asset_model3_studio_pose",
        "file": "model3_studio_pose.mp4",
        "name": "Video Studio Pose Thời Trang (Nhân Bản Mặt Model 3)",
        "desc": "Video tạo dáng thời trang lookbook studio cận cảnh với thần thái cuốn hút.",
    },
]

for item in assets_to_reg:
    src = item["file"]
    if os.path.exists(src):
        dst = f"data/assets/lookbooks/{item['id']}-{src}"
        shutil.copyfile(src, dst)
        url = f"/api/files/lookbooks/{item['id']}-{src}"
        
        meta = json.dumps({
            "description": item["desc"],
            "model": "user_model_face_3.png",
            "similarity": 0.6891,
            "type": "cloned_fashion_video",
        }, ensure_ascii=False)
        
        now_ms = int(cv2.getTickCount() / cv2.getTickFrequency() * 1000)
        cur.execute("""
            INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            item["id"],
            "lookbooks",
            item["name"],
            "video",
            "video/mp4",
            url,
            meta,
            now_ms,
        ))
        print(f"Registered: {item['name']} -> {url}")

conn.commit()
conn.close()
print("All assets registered!")
