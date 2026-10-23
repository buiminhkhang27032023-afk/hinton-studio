import os
import sys
import json
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def crop_fit(img, target_w, target_h):
    h, w = img.shape[:2]
    scale = max(target_w / w, target_h / h)
    nw, nh = int(w * scale), int(h * scale)
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
    x1 = max(0, (nw - target_w) // 2)
    y1 = max(0, (nh - target_h) // 2)
    return resized[y1:y1+target_h, x1:x1+target_w]

def compose(video_path, model_img_path, garment_img_path, output_path, headline="HÃY NHỚ", subheadline="Bí quyết phối đồ"):
    # 1. Create text overlay banner
    banner = Image.new('RGBA', (648, 220), (0, 0, 0, 0))
    draw = ImageDraw.Draw(banner)
    try:
        font_bold = ImageFont.truetype('arialbd.ttf', 52)
        font_sub = ImageFont.truetype('arial.ttf', 32)
    except Exception:
        font_bold = ImageFont.load_default()
        font_sub = ImageFont.load_default()
        
    draw.text((42, 42), headline, font=font_bold, fill=(0, 0, 0, 160))
    draw.text((40, 40), headline, font=font_bold, fill=(255, 255, 255, 255))
    draw.text((42, 107), subheadline, font=font_sub, fill=(0, 0, 0, 160))
    draw.text((40, 105), subheadline, font=font_sub, fill=(255, 225, 90, 255))
    
    temp_dir = os.path.dirname(output_path) or "."
    banner_path = os.path.join(temp_dir, "temp_banner.png")
    banner.save(banner_path)
    
    # 2. Right panel (432x1920)
    tr_img = cv2.imread(model_img_path)
    if tr_img is None:
        tr_img = np.zeros((960, 432, 3), dtype=np.uint8) + 50
    br_img = cv2.imread(garment_img_path)
    if br_img is None:
        br_img = np.zeros((960, 432, 3), dtype=np.uint8) + 70
        
    tr_fitted = crop_fit(tr_img, 432, 960)
    br_fitted = crop_fit(br_img, 432, 960)
    
    cv2.line(tr_fitted, (0, 958), (432, 958), (35, 35, 35), 4)
    cv2.line(br_fitted, (0, 0), (432, 0), (35, 35, 35), 4)
    
    right_panel = np.vstack([tr_fitted, br_fitted])
    cv2.line(right_panel, (0, 0), (0, 1920), (25, 25, 25), 4)
    
    right_panel_path = os.path.join(temp_dir, "temp_right_panel.png")
    cv2.imwrite(right_panel_path, right_panel)
    
    # 3. Call ffmpeg
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
        "-c:a", "aac",
        "-b:a", "192k",
        output_path
    ]
    subprocess.run(cmd, check=True)
    
    for tmp in [banner_path, right_panel_path]:
        if os.path.exists(tmp):
            try: os.remove(tmp)
            except: pass
            
    print(json.dumps({"success": True, "output": output_path}))

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: python compose_fashion_engine.py <video> <model_img> <garment_img> <output> [headline] [subheadline]"}))
        sys.exit(1)
        
    v = sys.argv[1]
    m = sys.argv[2]
    g = sys.argv[3]
    o = sys.argv[4]
    h = sys.argv[5] if len(sys.argv) > 5 else "HÃY NHỚ"
    sh = sys.argv[6] if len(sys.argv) > 6 else "Bí quyết phối đồ"
    
    try:
        compose(v, m, g, o, h, sh)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
