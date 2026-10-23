import os
import sys
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def compose_fashion_video(video_path, model_img_path, garment_img_path, output_path, headline="HÃY NHỚ", subheadline="Bí quyết phối đồ"):
    print("=== COMPOSING 9:16 FASHION SPLIT-SCREEN VIDEO ===", flush=True)
    
    # 1. Create text overlay banner
    banner = Image.new('RGBA', (648, 220), (0, 0, 0, 0))
    draw = ImageDraw.Draw(banner)
    try:
        font_bold = ImageFont.truetype('arialbd.ttf', 52)
        font_sub = ImageFont.truetype('arial.ttf', 32)
    except Exception:
        font_bold = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        
    # Drop shadow
    draw.text((42, 42), headline, font=font_bold, fill=(0, 0, 0, 160))
    draw.text((40, 40), headline, font=font_bold, fill=(255, 255, 255, 255))
    
    draw.text((42, 107), subheadline, font=font_sub, fill=(0, 0, 0, 160))
    draw.text((40, 105), subheadline, font=font_sub, fill=(255, 225, 90, 255))
    
    banner_path = "temp_fashion_banner.png"
    banner.save(banner_path)
    
    # 2. Prepare right panel images (scaled to 432x960 each)
    tr_img = cv2.imread(model_img_path)
    br_img = cv2.imread(garment_img_path)
    
    def crop_fit(img, target_w=432, target_h=960):
        h, w = img.shape[:2]
        scale = max(target_w / w, target_h / h)
        nw, nh = int(w * scale), int(h * scale)
        resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
        x1 = (nw - target_w) // 2
        y1 = (nh - target_h) // 2
        return resized[y1:y1+target_h, x1:x1+target_w]
        
    tr_fitted = crop_fit(tr_img, 432, 960)
    br_fitted = crop_fit(br_img, 432, 960)
    
    # Add a clean 2px dividing line
    cv2.line(tr_fitted, (0, 958), (432, 958), (30, 30, 30), 4)
    cv2.line(br_fitted, (0, 0), (432, 0), (30, 30, 30), 4)
    
    right_panel = np.vstack([tr_fitted, br_fitted])
    # Add vertical divider line
    cv2.line(right_panel, (0, 0), (0, 1920), (25, 25, 25), 4)
    
    right_panel_path = "temp_right_panel.png"
    cv2.imwrite(right_panel_path, right_panel)
    
    # 3. Call ffmpeg to composite left video (scaled & cropped to 648x1920) + right panel + banner overlay
    cmd = [
        "ffmpeg", "-nostdin", "-y",
        "-i", video_path,
        "-i", right_panel_path,
        "-i", banner_path,
        "-filter_complex",
        "[0:v]scale=648:1920:force_original_aspect_ratio=increase,crop=648:1920[left]; "
        "[left][1:v]hstack=inputs=2[combined]; "
        "[combined][2:v]overlay=x=0:y=0[outv]",
        "-map", "[outv]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        output_path
    ]
    
    print("Running ffmpeg...", flush=True)
    subprocess.run(cmd, check=True)
    print(f"=== COMPLETED: {output_path} ===", flush=True)

if __name__ == "__main__":
    compose_fashion_video(
        video_path="model2_true_frontal_2s.mp4",
        model_img_path="user_model_face_2.png",
        garment_img_path="user_model_face.png",
        output_path="test_lookbook_output_9_16.mp4",
        headline="HÃY NHỚ",
        subheadline="Bí quyết phối đồ"
    )
