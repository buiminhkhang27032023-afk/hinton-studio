import os
import sys
import time
import json
import sqlite3
import shutil
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

def create_editorial_card(model_img_path, garment_img_path, out_w=432, out_h=1920):
    """Creates the right-hand panel for 9:16 layout with source model & garment."""
    panel = np.zeros((out_h, out_w, 3), dtype=np.uint8) + 20
    
    # Top card: Model photo
    m_img = cv2.imread(model_img_path)
    if m_img is not None:
        mh, mw = m_img.shape[:2]
        target_h = out_h // 2
        scale = max(out_w / mw, target_h / mh)
        nw, nh = int(mw * scale), int(mh * scale)
        m_resized = cv2.resize(m_img, (nw, nh), interpolation=cv2.INTER_AREA)
        x1 = max(0, (nw - out_w) // 2)
        y1 = max(0, (nh - target_h) // 2)
        panel[:target_h, :] = m_resized[y1:y1+target_h, x1:x1+out_w]
        
    # Bottom card: Garment photo
    g_img = cv2.imread(garment_img_path)
    if g_img is not None:
        gh, gw = g_img.shape[:2]
        target_h = out_h // 2
        scale = max(out_w / gw, target_h / gh)
        nw, nh = int(gw * scale), int(gh * scale)
        g_resized = cv2.resize(g_img, (nw, nh), interpolation=cv2.INTER_AREA)
        x1 = max(0, (nw - out_w) // 2)
        y1 = max(0, (nh - target_h) // 2)
        panel[target_h:, :] = g_resized[y1:y1+target_h, x1:x1+out_w]
        
    # Dividing borders
    cv2.line(panel, (0, out_h // 2), (out_w, out_h // 2), (218, 165, 32), 4) # Gold border
    cv2.line(panel, (0, 0), (0, out_h), (218, 165, 32), 3) # Left gold divider
    return panel

def create_banner_frame(w=648, h=240, title="BỘ SƯU TẬP MỚI 2026", subtitle="Thần thái nàng thơ cuốn hút", badge="HAUTE COUTURE"):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Gradient background card
    for y in range(h):
        alpha = int(180 * (1.0 - y / h))
        draw.line([(0, y), (w, y)], fill=(15, 15, 20, alpha))
        
    try:
        font_badge = ImageFont.truetype('arialbd.ttf', 24)
        font_title = ImageFont.truetype('arialbd.ttf', 44)
        font_sub = ImageFont.truetype('arial.ttf', 28)
    except:
        font_badge = font_title = font_sub = ImageFont.load_default()
        
    # Badge (Gold)
    draw.rectangle([40, 25, 240, 58], fill=(218, 165, 32, 220))
    draw.text((50, 30), badge, font=font_badge, fill=(0, 0, 0, 255))
    
    # Title (Crisp white with shadow)
    draw.text((42, 72), title, font=font_title, fill=(0, 0, 0, 200))
    draw.text((40, 70), title, font=font_title, fill=(255, 255, 255, 255))
    
    # Subtitle (Champagne gold)
    draw.text((42, 132), subtitle, font=font_sub, fill=(0, 0, 0, 200))
    draw.text((40, 130), subtitle, font=font_sub, fill=(255, 235, 160, 255))
    
    return np.array(img)

def assemble_master_video():
    print("=== ASSEMBLING COMPLETE MASTER FASHION COMMERCIAL FOR MODEL 4 ===", flush=True)
    t0 = time.time()
    
    # 1. Define Scenes to Include
    scenes = [
        {
            "video": "model4_studio_cloned.mp4",
            "dur": 3.5,
            "badge": "LOOK 01 · CHIC",
            "title": "NÀNG THƠ Á ĐÔNG",
            "subtitle": "Thần thái kiêu kỳ & cuốn hút",
            "garment": "fashion_sources/garment_4_chic_dress.jpg"
        },
        {
            "video": "model4_paris_runway_cloned.mp4",
            "dur": 3.5,
            "badge": "LOOK 02 · RUNWAY",
            "title": "SÀN DIỄN PARIS",
            "subtitle": "Đầm dạ hội đuôi cá quyến rũ",
            "garment": "fashion_sources/garment_2_evening_dress.jpg"
        }
    ]
    
    # Check if Scene 3 exists
    s3_path = "model4_scene3_pivot_cloned.mp4"
    if os.path.exists(s3_path):
        scenes.append({
            "video": s3_path,
            "dur": 2.5,
            "badge": "LOOK 03 · FINALE",
            "title": "THẦN THÁI ĐỈNH CAO",
            "subtitle": "Cú xoay người kết màn đẳng cấp",
            "garment": "fashion_sources/garment_2_evening_dress.jpg"
        })
        
    model_img_path = "user_model_face_4.png"
    workdir = "temp_master_assembly"
    if os.path.exists(workdir):
        shutil.rmtree(workdir)
    os.makedirs(workdir, exist_ok=True)
    
    # 2. Render 9:16 Lookbook Frames for Each Scene
    print(f"Rendering {len(scenes)} scenes into 9:16 Full HD (1080x1920)...", flush=True)
    global_frame_idx = 0
    fps = 24.0
    
    for s_idx, scene in enumerate(scenes):
        vpath = scene["video"]
        if not os.path.exists(vpath):
            print(f"Warning: {vpath} not found, skipping")
            continue
            
        cap = cv2.VideoCapture(vpath)
        total_f = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        n_frames = min(int(scene["dur"] * fps), total_f)
        
        # Prepare right panel & overlay banner for this scene
        right_panel = create_editorial_card(model_img_path, scene["garment"])
        banner_rgba = create_banner_frame(w=648, h=220, title=scene["title"], subtitle=scene["subtitle"], badge=scene["badge"])
        b_h, b_w = banner_rgba.shape[:2]
        b_mask = banner_rgba[:, :, 3].astype(np.float32) / 255.0
        b_mask = np.expand_dims(b_mask, axis=2)
        b_rgb = banner_rgba[:, :, :3]
        
        for f_i in range(n_frames):
            ret, frame = cap.read()
            if not ret: break
            global_frame_idx += 1
            
            # Left video panel: scale & crop to 648x1920
            fh, fw = frame.shape[:2]
            scale = max(648 / fw, 1920 / fh)
            nw, nh = int(fw * scale), int(fh * scale)
            f_resized = cv2.resize(frame, (nw, nh), interpolation=cv2.INTER_AREA)
            x1 = max(0, (nw - 648) // 2)
            y1 = max(0, (nh - 1920) // 2)
            left_crop = f_resized[y1:y1+1920, x1:x1+648]
            
            # Apply Banner Overlay at bottom of left video
            roi_y = 1920 - b_h - 100
            left_crop[roi_y:roi_y+b_h, :b_w] = (
                b_mask * b_rgb.astype(np.float32) + 
                (1.0 - b_mask) * left_crop[roi_y:roi_y+b_h, :b_w].astype(np.float32)
            ).astype(np.uint8)
            
            # Combine 648 + 432 = 1080x1920
            full_frame = np.hstack([left_crop, right_panel])
            
            # Add subtle white flash at transition points (first 3 frames of scenes > 0)
            if s_idx > 0 and f_i < 3:
                flash_alpha = (3 - f_i) / 3.0 * 0.45
                white = np.full_like(full_frame, 255)
                full_frame = cv2.addWeighted(full_frame, 1.0 - flash_alpha, white, flash_alpha, 0)
                
            out_file = os.path.join(workdir, f"frame_{global_frame_idx:04d}.jpg")
            cv2.imwrite(out_file, full_frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
            
        cap.release()
        print(f"  Scene {s_idx+1}/{len(scenes)} rendered: {n_frames} frames", flush=True)
        
    print(f"Total rendered frames: {global_frame_idx} ({global_frame_idx/fps:.1f}s)", flush=True)
    
    # 3. Audio Track Muxing
    # Find music track
    music_path = r"data\seecut_jobs\sc_1792571870186_fd1jx\work\music.wav"
    out_video_9_16 = "model4_complete_fashion_video_9_16.mp4"
    total_sec = global_frame_idx / fps
    
    frames_pattern = os.path.join(workdir, "frame_%04d.jpg")
    print(f"Muxing final video: {out_video_9_16}...", flush=True)
    
    if os.path.exists(music_path):
        # Audio with smooth fade-out
        fade_start = max(0, total_sec - 1.0)
        afade = f"afade=t=out:st={fade_start:.1f}:d=1.0,loudnorm=I=-14:LRA=7:tp=-1.0"
        cmd = [
            "ffmpeg", "-nostdin", "-y",
            "-framerate", str(fps),
            "-i", frames_pattern,
            "-ss", "00:00:03.0", # Start at punchy beat
            "-i", music_path,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "17",
            "-pix_fmt", "yuv420p",
            "-filter:a", afade,
            "-c:a", "aac",
            "-b:a", "256k",
            "-t", str(total_sec),
            out_video_9_16
        ]
    else:
        cmd = [
            "ffmpeg", "-nostdin", "-y",
            "-framerate", str(fps),
            "-i", frames_pattern,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "17",
            "-pix_fmt", "yuv420p",
            "-t", str(total_sec),
            out_video_9_16
        ]
    subprocess.run(cmd, check=True)
    shutil.rmtree(workdir, ignore_errors=True)
    print(f"-> MASTER 9:16 COMPLETED: {out_video_9_16} ({os.path.getsize(out_video_9_16):,} bytes)", flush=True)
    
    # 4. Generate Animated GIF preview
    gif_preview = "model4_complete_fashion_video.gif"
    print(f"Generating preview GIF: {gif_preview}...", flush=True)
    cmd_gif = [
        "ffmpeg", "-nostdin", "-y",
        "-i", out_video_9_16,
        "-vf", "fps=12,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer",
        "-t", "6.0", # 6 second animated preview
        gif_preview
    ]
    subprocess.run(cmd_gif, check=True)
    
    # Copy to artifacts
    art_dir = r"C:\Users\Chen Qianyu\.gemini\antigravity\brain\0e6c3b36-0208-4ea3-bdf5-994eea297105"
    shutil.copyfile(gif_preview, os.path.join(art_dir, gif_preview))
    print(f"Copied {gif_preview} to artifact dir")
    
    # 5. Register in studio.db
    conn = sqlite3.connect("data/studio.db")
    cur = conn.cursor()
    now_ms = int(time.time() * 1000)
    cur.execute('''
        INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "asset_model4_complete_fashion_master",
        "_library",
        "Video Thời Trang Hoàn Thiện - Model 4 Lookbook 2026 (Full HD 9:16)",
        "video",
        "video/mp4",
        "/api/files/_library/model4_complete_fashion_video_9_16.mp4",
        json.dumps({"width": 1080, "height": 1920, "fps": 24, "scenes": len(scenes), "duration": total_sec}),
        now_ms
    ))
    conn.commit()
    conn.close()
    
    # Also copy to library
    lib_dest = os.path.join("data", "assets", "_library", "model4_complete_fashion_video_9_16.mp4")
    shutil.copyfile(out_video_9_16, lib_dest)
    print(f"Successfully copied to {lib_dest} and registered into Hinton Studio!")
    print(f"=== FINISHED IN {time.time()-t0:.1f}s ===", flush=True)

if __name__ == "__main__":
    assemble_master_video()
