import sqlite3
import json
import time

PROJECT_ID = "prj_hardware_10s"
BASE_DIR = "d:/phim ai thời trang"
conn = sqlite3.connect(f"{BASE_DIR}/data/studio.db")
c = conn.cursor()
now_ts = int(time.time() * 1000)

video_url = f"/api/files/{PROJECT_ID}/hardware_advertisement_omni_10s.mp4"

# 1. Update/Insert assets
c.execute("""
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
""", (
    "asset_hardware_omni_10s",
    PROJECT_ID,
    "Video Quảng Cáo Kho Kim Khí 10s (Model Omni)",
    "video",
    "video/mp4",
    video_url,
    json.dumps({"model": "iooai:omni_flash_10s", "duration": 10, "aspect": "9:16"}),
    now_ts
))

# 2. Update project thumbnail
c.execute("UPDATE projects SET thumbnail=?, updated_at=? WHERE id=?", (
    video_url, now_ts, PROJECT_ID
))

# 3. Create Graph
nodes = [
    {
        "id": "node_char",
        "type": "image",
        "position": {"x": 50, "y": 80},
        "data": {
            "name": "Nhân vật Nữ chính (Tham chiếu)",
            "imageUrl": f"/api/files/{PROJECT_ID}/character_turnaround.jpg",
            "status": "done",
            "result": {
                "id": "asset_char_model",
                "name": "Nhân vật nữ chính",
                "kind": "image",
                "url": f"/api/files/{PROJECT_ID}/character_turnaround.jpg"
            }
        }
    },
    {
        "id": "node_scene",
        "type": "image",
        "position": {"x": 50, "y": 420},
        "data": {
            "name": "Bối cảnh Kho Kim Khí (Ảnh 2)",
            "imageUrl": f"/api/files/{PROJECT_ID}/warehouse_ref.png",
            "status": "done",
            "result": {
                "id": "asset_warehouse_scene",
                "name": "Kho hàng kim khí gốc",
                "kind": "image",
                "url": f"/api/files/{PROJECT_ID}/warehouse_ref.png"
            }
        }
    },
    {
        "id": "node_prompt",
        "type": "prompt",
        "position": {"x": 380, "y": 120},
        "data": {
            "name": "Kịch bản Quảng Cáo Kho Kim Khí 10s",
            "text": "Sử dụng @Ảnh1 làm tham chiếu nhân vật (nữ MC trẻ trung, tóc ngắn uốn lượn nâu hạt dẻ, nụ cười rạng rỡ) và @Ảnh2 làm bối cảnh kho kim khí. Cô gái đứng giữa lối đi kho hàng rộng lớn, tươi cười giới thiệu các kệ hàng máy móc kim khí, thiết bị cầm tay. Góc máy dọc 9:16 chuẩn TikTok Reels, ánh sáng công nghiệp chân thực."
        }
    },
    {
        "id": "node_video",
        "type": "generate",
        "position": {"x": 720, "y": 200},
        "data": {
            "name": "Omni Flash 10s · Video Dọc 9:16",
            "modelId": "iooai:omni_flash_10s",
            "modelKind": "video",
            "duration": 10,
            "aspect": "9:16",
            "resolution": "720p",
            "status": "done",
            "videoUrl": video_url,
            "result": {
                "id": "asset_hardware_omni_10s",
                "name": "Video Quảng Cáo Kho Kim Khí 10s",
                "kind": "video",
                "url": video_url
            }
        }
    },
    {
        "id": "node_result",
        "type": "result",
        "position": {"x": 1080, "y": 200},
        "data": {
            "name": "Video Hoàn Chỉnh (Xuất bản)",
            "status": "done",
            "videoUrl": video_url,
            "result": {
                "id": "asset_hardware_omni_10s",
                "name": "Video Quảng Cáo Kho Kim Khí 10s",
                "kind": "video",
                "url": video_url
            }
        }
    }
]

edges = [
    {"id": "e_char_video", "source": "node_char", "target": "node_video"},
    {"id": "e_scene_video", "source": "node_scene", "target": "node_video"},
    {"id": "e_prompt_video", "source": "node_prompt", "target": "node_video"},
    {"id": "e_video_result", "source": "node_video", "target": "node_result"}
]

graph_data = {"nodes": nodes, "edges": edges}
c.execute("""
    INSERT OR REPLACE INTO graphs (project_id, data, updated_at)
    VALUES (?, ?, ?)
""", (PROJECT_ID, json.dumps(graph_data), now_ts))

conn.commit()
print("Graph prj_hardware_10s successfully saved to studio.db!")
