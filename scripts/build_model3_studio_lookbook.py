import os
import sys
import json
import sqlite3
import shutil
import cv2
from compose_fashion_engine import compose

def main():
    video_path = "model3_studio_pose.mp4"
    model_img_path = "user_model_face_3.png"
    garment_img_path = "fashion_sources/garment_2_evening_dress.jpg"
    output_path = "output_lookbooks/lookbook_model3_studio_chic.mp4"
    preview_path = "output_lookbooks/lookbook_model3_studio_chic_preview.jpg"
    
    print("=== COMPOSING 9:16 STUDIO LOOKBOOK FOR MODEL 3 ===", flush=True)
    compose(
        video_path=video_path,
        model_img_path=model_img_path,
        garment_img_path=garment_img_path,
        output_path=output_path,
        headline="BÍ QUYẾT PHỐI ĐỒ",
        subheadline="Thần thái nàng thơ cuốn hút",
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
        shutil.copyfile(preview_path, os.path.join(artifact_dir, "lookbook_model3_studio_chic_preview.jpg"))
        
    print(f"=== COMPLETED STUDIO LOOKBOOK: {output_path} ===", flush=True)

if __name__ == "__main__":
    main()
