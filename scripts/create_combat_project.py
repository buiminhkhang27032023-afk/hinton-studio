import sqlite3
import json
import time
import os
import shutil

BASE_DIR = r"d:\phim ai thời trang"
PROJECT_ID = "prj_combat_seedance_15s"
PROJECT_NAME = "Phim Chiến Đấu 15s: Quyết Đấu Siêu Năng Lực (Seedance 2.5)"
ASSETS_DIR = os.path.join(BASE_DIR, "data", "assets", PROJECT_ID)
os.makedirs(ASSETS_DIR, exist_ok=True)

# Source files
src_video = os.path.join(BASE_DIR, "data", "assets", "prj_zfold8_commercial_10s", "male_combat_battle_seedance25_15s.mp4")
src_char = os.path.join(BASE_DIR, "data", "assets", "prj_zfold8_commercial_10s", "character_man_suit.png")
src_thumb = os.path.join(BASE_DIR, "data", "assets", "prj_zfold8_commercial_10s", "combat_preview_03.jpg")

# Copy to new project folder
dst_video = os.path.join(ASSETS_DIR, "male_combat_battle_seedance25_15s.mp4")
dst_char = os.path.join(ASSETS_DIR, "character_man_suit.png")
dst_thumb = os.path.join(ASSETS_DIR, "combat_preview_03.jpg")

shutil.copy2(src_video, dst_video)
shutil.copy2(src_char, dst_char)
shutil.copy2(src_thumb, dst_thumb)

now_ms = int(time.time() * 1000)
video_size = os.path.getsize(dst_video)
char_size = os.path.getsize(dst_char)

conn = sqlite3.connect(os.path.join(BASE_DIR, "data", "studio.db"))
c = conn.cursor()

# 1. Insert or Replace Project
c.execute("""
    INSERT OR REPLACE INTO projects (id, name, created_at, updated_at)
    VALUES (?, ?, ?, ?)
""", (PROJECT_ID, PROJECT_NAME, now_ms, now_ms))

# 2. Insert Assets
c.execute("""
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, 'image', 'image/png', ?, ?, ?)
""", (
    "asset_char_male_combat",
    PROJECT_ID,
    "Nhan-Vat-Nam-Chinh",
    f"/api/files/{PROJECT_ID}/character_man_suit.png",
    json.dumps({"width": 768, "height": 1152, "size": char_size}),
    now_ms
))

c.execute("""
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
""", (
    "asset_video_combat_15s",
    PROJECT_ID,
    "Phim-Chien-Dau-15s-Master",
    f"/api/files/{PROJECT_ID}/male_combat_battle_seedance25_15s.mp4",
    json.dumps({"model": "seedance2.5 快速版", "duration": 15, "size": video_size, "thumbnail": f"/api/files/{PROJECT_ID}/combat_preview_03.jpg"}),
    now_ms
))

# 3. Create Full Canvas Graph
prompt_combat = (
    "Epic blockbuster superhero martial arts combat action film, 15 seconds. "
    "Reference the handsome muscular Asian man from image as the combat hero. "
    "00:00–00:05: Extreme low-angle tracking shot. He stands in an intense fighting stance amidst a dark ruined battleground, "
    "eyes glowing with fierce battle fury, clenching his fists as crackling crimson fire and lightning aura erupts violently around his muscular body, shattering concrete at his feet. "
    "00:05–00:10: High-speed combat sequence! He explosive-dashes forward with superhuman speed, executing powerful martial arts kungfu strikes, "
    "dodging incoming energy blasts with a mid-air acrobatic spin, dynamic camera whipping and tracking his brutal punches and kicks with cinematic motion blur. "
    "00:10–00:15: Epic battle climax! He unleashes a devastating ground-shattering energy shockwave punch forward, sending a massive shockwave across the arena, "
    "camera orbits 360 degrees around him as sparks, dust, and embers rain down, standing victorious with fierce heroic determination, photorealistic 8k IMAX cinematography, 24fps."
)

graph_data = {
    "nodes": [
        {
            "id": "node-char",
            "type": "image",
            "position": {"x": 80, "y": 140},
            "data": {
                "label": "Nhân vật nam chính",
                "status": "idle",
                "url": f"/api/files/{PROJECT_ID}/character_man_suit.png",
                "role": "model",
                "previewUrl": f"/api/files/{PROJECT_ID}/character_man_suit.png"
            }
        },
        {
            "id": "node-prompt",
            "type": "prompt",
            "position": {"x": 380, "y": 140},
            "data": {
                "label": "Kịch bản chiến đấu 15s",
                "status": "idle",
                "text": prompt_combat,
                "prompt": prompt_combat
            }
        },
        {
            "id": "node-generate",
            "type": "generate",
            "position": {"x": 720, "y": 140},
            "data": {
                "label": "Seedance 2.5 快速版",
                "status": "succeeded",
                "modelId": "seedance2.5 快速版",
                "model": "Seedance 2.5 快速版 (15s)",
                "duration": 15,
                "aspect": "16:9"
            }
        },
        {
            "id": "node-result",
            "type": "result",
            "position": {"x": 1060, "y": 100},
            "data": {
                "label": "Video Thành phẩm 15s",
                "status": "succeeded",
                "result": {
                    "id": "asset_video_combat_15s",
                    "projectId": PROJECT_ID,
                    "name": "Phim-Chien-Dau-15s-Master",
                    "kind": "video",
                    "mime": "video/mp4",
                    "url": f"/api/files/{PROJECT_ID}/male_combat_battle_seedance25_15s.mp4",
                    "size": video_size
                }
            }
        }
    ],
    "edges": [
        {
            "id": "edge-char-gen",
            "source": "node-char",
            "sourceHandle": "out",
            "target": "node-generate",
            "targetHandle": "in",
            "type": "studio",
            "style": {"stroke": "#eab308", "strokeWidth": 2}
        },
        {
            "id": "edge-prompt-gen",
            "source": "node-prompt",
            "sourceHandle": "out",
            "target": "node-generate",
            "targetHandle": "in",
            "type": "studio",
            "style": {"stroke": "#06b6d4", "strokeWidth": 2}
        },
        {
            "id": "edge-gen-result",
            "source": "node-generate",
            "sourceHandle": "out",
            "target": "node-result",
            "targetHandle": "in",
            "type": "studio",
            "style": {"stroke": "#22c55e", "strokeWidth": 2}
        }
    ]
}

c.execute("""
    INSERT OR REPLACE INTO graphs (project_id, data, updated_at)
    VALUES (?, ?, ?)
""", (PROJECT_ID, json.dumps(graph_data, ensure_ascii=False), now_ms))

conn.commit()
print(f"SUCCESS: Created dedicated project {PROJECT_ID} on Hinton Studio!")
