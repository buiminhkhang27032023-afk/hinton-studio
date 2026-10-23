import os
import sys
import json
import sqlite3
import shutil
import cv2
from compose_fashion_engine import compose

os.makedirs("output_lookbooks", exist_ok=True)
os.makedirs("data/assets/lookbooks", exist_ok=True)

SETS = [
    {
        "id": "lookbook_set1_blazer",
        "video": "data/veo-fashion-1.mp4",
        "model": "fashion_sources/model_ref_1.jpg",
        "garment": "fashion_sources/garment_1_blazer.jpg",
        "headline": "SET 1: BLAZER THANH LỊCH",
        "subheadline": "Bí quyết phối đồ công sở sang trọng",
        "desc": "Set Blazer dạ cao cấp phối áo ôm trắng tinh tế, phom dáng chuẩn chỉ cho phong thái tổng tài thanh lịch.",
    },
    {
        "id": "lookbook_set2_evening_dress",
        "video": "data/assets/prj_6db5b4ce6484/asset_9bdc9026a3c8-C-nh-1--B--c-ra-s-n-di-n-th-i-trang-Paris-trong---m-d--h-i--.mp4",
        "model": "fashion_sources/model_ref_1.jpg",
        "garment": "fashion_sources/garment_2_evening_dress.jpg",
        "headline": "SET 2: DẠ HỘI QUYẾN RŨ",
        "subheadline": "Tỏa sáng đêm tiệc thượng lưu",
        "desc": "Đầm dạ hội lụa satin đen tuyền cúp ngực sang trọng sải bước trên sàn diễn Paris Haute Couture.",
    },
    {
        "id": "lookbook_set3_trench_coat",
        "video": "data/veo-fashion-2.mp4",
        "model": "fashion_sources/model_ref_1.jpg",
        "garment": "fashion_sources/garment_3_trench_coat.jpg",
        "headline": "SET 3: MĂNG TÔ THỜI THƯỢNG",
        "subheadline": "Bí quyết phối đồ mùa đông ấm áp",
        "desc": "Áo khoác măng tô dáng dài màu be thanh lịch, tôn dáng và mang hơi thở thời trang đường phố Châu Âu.",
    },
    {
        "id": "lookbook_set4_chic_dress",
        "video": "data/assets/prj_6db5b4ce6484/asset_361dbde1a829-C-nh-3--T-o-d-ng-th-n-th-i---u-s-n-catwalk---C--xoay-ng--i-k.mp4",
        "model": "fashion_sources/model_ref_1.jpg",
        "garment": "fashion_sources/garment_4_chic_dress.jpg",
        "headline": "SET 4: NÀNG THƠ DẠO PHỐ",
        "subheadline": "Nhẹ nhàng, thanh lịch & cuốn hút",
        "desc": "Váy hoa thướt tha phong cách Parisian Chic tôn lên nét nữ tính, phóng khoáng khi dạo phố.",
    },
    {
        "id": "lookbook_set5_model2_frontal",
        "video": "model2_true_frontal_2s.mp4",
        "model": "user_model_face_2.png",
        "garment": "fashion_sources/garment_1_blazer.jpg",
        "headline": "HÃY NHỚ",
        "subheadline": "Bí quyết phối đồ thời trang",
        "desc": "Video người mẫu chính diện nhân bản khuôn mặt 100% chuẩn nét theo đúng phong cách TikTok viral.",
    },
]

print("=== STARTING COMPOSITING 5 FASHION LOOKBOOK VIDEOS ===", flush=True)

# Connect to database
conn = sqlite3.connect("data/studio.db")
cur = conn.cursor()

results = []

for idx, item in enumerate(SETS, 1):
    out_video = f"output_lookbooks/{item['id']}.mp4"
    preview_img = f"output_lookbooks/{item['id']}_preview.jpg"
    
    if os.path.exists(out_video) and os.path.getsize(out_video) > 500000:
        print(f"\n[{idx}/5] {item['headline']} already exists ({os.path.getsize(out_video)} bytes), skipping render...", flush=True)
    else:
        print(f"\n[{idx}/5] Rendering: {item['headline']}...", flush=True)
        compose(
            video_path=item["video"],
            model_img_path=item["model"],
            garment_img_path=item["garment"],
            output_path=out_video,
            headline=item["headline"],
            subheadline=item["subheadline"],
        )
    
    # Extract preview frame at 1.0s (frame 24)
    if not os.path.exists(preview_img):
        cap = cv2.VideoCapture(out_video)
        fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
        cap.set(cv2.CAP_PROP_POS_FRAMES, min(24, int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) - 1))
        ret, frame = cap.read()
        if ret:
            cv2.imwrite(preview_img, frame)
        cap.release()
    
    # Copy to data/assets for studio web server
    asset_id = f"asset_{item['id']}"
    target_video_name = f"{asset_id}-{item['id']}.mp4"
    target_video_path = f"data/assets/lookbooks/{target_video_name}"
    shutil.copyfile(out_video, target_video_path)
    
    # Also save preview poster to data/assets/lookbooks
    target_poster_name = f"{asset_id}-poster.jpg"
    target_poster_path = f"data/assets/lookbooks/{target_poster_name}"
    if os.path.exists(preview_img):
        shutil.copyfile(preview_img, target_poster_path)
    
    # Register in SQLite
    url = f"/api/files/lookbooks/{target_video_name}"
    meta = json.dumps({
        "headline": item["headline"],
        "subheadline": item["subheadline"],
        "description": item["desc"],
        "model": item["model"],
        "garment": item["garment"],
        "aspect": "9:16",
        "type": "fashion_lookbook_composite",
        "posterUrl": f"/api/files/lookbooks/{target_poster_name}",
    }, ensure_ascii=False)
    
    now_ms = int(cv2.getTickCount() / cv2.getTickFrequency() * 1000)
    cur.execute("""
        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        asset_id,
        "lookbooks",
        f"Lookbook 9:16 - {item['headline']}",
        "video",
        "video/mp4",
        url,
        meta,
        now_ms,
    ))
    conn.commit()
    
    results.append({
        "id": item["id"],
        "headline": item["headline"],
        "subheadline": item["subheadline"],
        "video": out_video,
        "preview": preview_img,
        "asset_url": url,
    })
    print(f"  -> Finished & Registered: {out_video} (Asset URL: {url})", flush=True)

conn.close()
print("\n=== ALL 5 LOOKBOOK VIDEOS CREATED AND REGISTERED SUCCESSFULLY! ===", flush=True)
