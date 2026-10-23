import os
import sys
import json
import sqlite3
import shutil
import cv2
from compose_fashion_engine import compose

def main():
    video_path = "model3_paris_runway.mp4"
    model_img_path = "user_model_face_3.png"
    garment_img_path = "fashion_sources/garment_2_evening_dress.jpg"
    output_path = "output_lookbooks/lookbook_model3_paris_evening.mp4"
    preview_path = "output_lookbooks/lookbook_model3_paris_evening_preview.jpg"
    
    if not os.path.exists(video_path):
        print(f"Error: {video_path} not found!")
        return
        
    print("=== COMPOSING 9:16 LOOKBOOK FOR MODEL 3 ===", flush=True)
    compose(
        video_path=video_path,
        model_img_path=model_img_path,
        garment_img_path=garment_img_path,
        output_path=output_path,
        headline="BÍ QUYẾT PHỐI ĐỒ",
        subheadline="Dạ hội Paris sang trọng & kiêu sa",
    )
    
    # Extract preview frame
    cap = cv2.VideoCapture(output_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 24)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(preview_path, frame)
    cap.release()
    
    # Copy to artifacts dir
    artifact_dir = r"C:\Users\Chen Qianyu\.gemini\antigravity\brain\0e6c3b36-0208-4ea3-bdf5-994eea297105"
    if os.path.exists(preview_path):
        shutil.copyfile(preview_path, os.path.join(artifact_dir, "lookbook_model3_paris_evening_preview.jpg"))
        
    # Register in SQLite studio.db
    conn = sqlite3.connect("data/studio.db")
    cur = conn.cursor()
    
    asset_id = "asset_model3_paris_evening"
    target_video_name = f"{asset_id}.mp4"
    target_video_path = f"data/assets/lookbooks/{target_video_name}"
    shutil.copyfile(output_path, target_video_path)
    
    url = f"/api/files/lookbooks/{target_video_name}"
    meta = json.dumps({
        "headline": "BÍ QUYẾT PHỐI ĐỒ",
        "subheadline": "Dạ hội Paris sang trọng & kiêu sa",
        "description": "Video lookbook thời trang nhân bản khuôn mặt chính diện chuẩn 100%.",
        "model": model_img_path,
        "garment": garment_img_path,
        "aspect": "9:16",
        "type": "fashion_lookbook_composite",
    }, ensure_ascii=False)
    
    now_ms = int(cv2.getTickCount() / cv2.getTickFrequency() * 1000)
    cur.execute("""
        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        asset_id,
        "lookbooks",
        "Lookbook 9:16 - Dạ Hội Paris (Nhân Bản Khuôn Mặt)",
        "video",
        "video/mp4",
        url,
        meta,
        now_ms,
    ))
    conn.commit()
    conn.close()
    
    print(f"=== COMPLETED LOOKBOOK: {output_path} ===", flush=True)

if __name__ == "__main__":
    main()
