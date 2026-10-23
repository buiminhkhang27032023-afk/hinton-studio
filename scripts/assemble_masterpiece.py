import os, sys, time, shutil, subprocess
import cv2, numpy as np

print("Preparing assembly engine with pure OpenCV rendering...", flush=True)

# 1. First, create the 16:9 Master Cut
def build_16_9_master(audio_path, output_16_9):
    print("\n--- Building 16:9 Master Video ---", flush=True)
    scenes = [
        ("scene1_trench_cloned.mp4", 84, "LOOK 01 · TOKYO CYBER CHIC", "Áo măng tô dạ dáng dài dạo phố Shinjuku"),
        ("scene2_emerald_cloned.mp4", 84, "LOOK 02 · PARIS HAUTE COUTURE", "Đầm dạ hội đính sequin ngọc lục bảo Paris Catwalk"),
        ("scene3_silver_cloned.mp4", 72, "LOOK 03 · LIQUID SILVER FINALE", "Đầm dạ hội lụa ánh bạc rạng rỡ kết màn")
    ]
    
    temp_dir = "temp_render_169"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    total_idx = 0
    for vpath, max_f, title, desc in scenes:
        cap = cv2.VideoCapture(vpath)
        for i in range(max_f):
            ret, frame = cap.read()
            if not ret:
                break
            # Resize to 1920x1080
            frame = cv2.resize(frame, (1920, 1080), interpolation=cv2.INTER_LANCZOS4)
            
            # Subtle luxury vignette / lower third gradient
            overlay = frame.copy()
            cv2.rectangle(overlay, (0, 880), (1920, 1080), (0, 0, 0), -1)
            frame = cv2.addWeighted(overlay, 0.45, frame, 0.55, 0)
            
            # Draw lower third badge
            # Accent bar
            cv2.rectangle(frame, (80, 930), (88, 1010), (100, 200, 255) if "LOOK 01" in title else ((120, 240, 150) if "LOOK 02" in title else (255, 220, 120)), -1)
            cv2.putText(frame, title, (110, 965), cv2.FONT_HERSHEY_DUPLEX, 1.15, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(frame, desc, (110, 1005), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (200, 200, 200), 2, cv2.LINE_AA)
            
            # Watermark / Editorial tag top right
            cv2.putText(frame, "HINTON STUDIO · FASHION AI", (1480, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (255, 255, 255), 2, cv2.LINE_AA)
            
            out_f = os.path.join(temp_dir, f"f_{total_idx:04d}.jpg")
            cv2.imwrite(out_f, frame, [cv2.IMWRITE_JPEG_QUALITY, 96])
            total_idx += 1
        cap.release()
        
    print(f"Rendered {total_idx} frames for 16:9 master.", flush=True)
    
    cmd = [
        "ffmpeg", "-y", "-framerate", "24",
        "-i", os.path.join(temp_dir, "f_%04d.jpg"),
        "-i", audio_path,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "fast",
        "-c:a", "aac", "-b:a", "192k",
        "-af", "afade=t=out:st=9.2:d=0.8",
        "-t", "10.0",
        output_16_9
    ]
    subprocess.run(cmd, check=True)
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"=== Successfully built {output_16_9} ({os.path.getsize(output_16_9)} bytes) ===", flush=True)

# 2. Build the 9:16 Try-On Lookbook ("Video Thay Đồ")
def build_9_16_tryon(audio_path, output_9_16):
    print("\n--- Building 9:16 Try-On Masterpiece (Mirroring Reference) ---", flush=True)
    
    scenes = [
        ("scene1_trench_cloned.mp4", 84, "LOOK 01 · TOKYO CYBER CHIC", "Áo măng tô dạ dáng dài dạo phố Shinjuku", (100, 200, 255)),
        ("scene2_emerald_cloned.mp4", 84, "LOOK 02 · PARIS HAUTE COUTURE", "Đầm dạ hội đính sequin lục bảo Paris Catwalk", (120, 240, 150)),
        ("scene3_silver_cloned.mp4", 72, "LOOK 03 · LIQUID SILVER FINALE", "Đầm dạ hội lụa ánh bạc rạng rỡ kết màn", (255, 220, 120))
    ]
    
    # Load model portrait for top-right card
    src_model = cv2.imread('user_model_face_4.png')
    h_m, w_m, _ = src_model.shape
    beauty_crop = src_model[0:int(h_m*0.85), int(w_m*0.1):int(w_m*0.9)]
    
    # Pre-extract representative garment packs for the 3 looks
    cap1 = cv2.VideoCapture("scene1_trench_cloned.mp4")
    cap1.set(cv2.CAP_PROP_POS_FRAMES, 40)
    _, f1 = cap1.read()
    cap1.release()
    garment1 = f1[200:680, 480:850]
    
    cap2 = cv2.VideoCapture("scene2_emerald_cloned.mp4")
    cap2.set(cv2.CAP_PROP_POS_FRAMES, 40)
    _, f2 = cap2.read()
    cap2.release()
    garment2 = f2[180:700, 450:830]
    
    cap3 = cv2.VideoCapture("scene3_silver_cloned.mp4")
    cap3.set(cv2.CAP_PROP_POS_FRAMES, 40)
    _, f3 = cap3.read()
    cap3.release()
    garment3 = f3[280:710, 420:860]
    
    temp_dir = "temp_render_tryon_916"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    canvas_w, canvas_h = 1080, 1920
    total_idx = 0
    
    for s_idx, (vpath, max_f, title, desc, accent_col) in enumerate(scenes):
        cap = cv2.VideoCapture(vpath)
        if s_idx == 0:
            cur_garment = garment1
            g_tag = "ÁO MĂNG TÔ DẠ"
        elif s_idx == 1:
            cur_garment = garment2
            g_tag = "ĐẦM DẠ HỘI SEQUIN"
        else:
            cur_garment = garment3
            g_tag = "ĐẦM LỤA BẠC FINALE"
            
        for i in range(max_f):
            ret, frame = cap.read()
            if not ret:
                break
                
            canvas = np.zeros((canvas_h, canvas_w, 3), dtype=np.uint8)
            canvas[:] = (18, 16, 20) # Luxurious slate background
            
            # 1. HEADER (y: 0 to 220)
            cv2.putText(canvas, "HÃY NHỚ", (60, 110), cv2.FONT_HERSHEY_DUPLEX, 1.9, (255, 255, 255), 3, cv2.LINE_AA)
            cv2.putText(canvas, "Bí quyết phối đồ thời trang AI", (62, 175), cv2.FONT_HERSHEY_DUPLEX, 1.05, (100, 200, 255), 2, cv2.LINE_AA)
            
            # Badge on top right
            cv2.rectangle(canvas, (750, 70), (1020, 130), (35, 30, 45), -1)
            cv2.rectangle(canvas, (750, 70), (1020, 130), (120, 100, 150), 1)
            cv2.putText(canvas, "OMNI-TRYON", (775, 110), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (220, 220, 255), 2, cv2.LINE_AA)
            
            # 2. MAIN VIDEO DISPLAY (Left column, x: 40 to 650, y: 220 to 1420 - width 610, height 1200)
            f_h, f_w, _ = frame.shape
            crop_w = int(f_h * (9.0 / 16.0)) # 720 * 9 / 16 = 405
            if s_idx == 0:
                cx = int(f_w * 0.42)
            else:
                cx = int(f_w * 0.50)
                
            x1 = max(0, min(f_w - crop_w, cx - crop_w // 2))
            x2 = x1 + crop_w
            video_crop = frame[:, x1:x2]
            
            main_disp_w, main_disp_h = 610, 1200
            video_disp = cv2.resize(video_crop, (main_disp_w, main_disp_h), interpolation=cv2.INTER_LANCZOS4)
            canvas[220:220+main_disp_h, 40:40+main_disp_w] = video_disp
            cv2.rectangle(canvas, (40, 220), (40+main_disp_w, 220+main_disp_h), (200, 180, 220), 2)
            
            # 3. RIGHT COLUMN: 2 CARDS (x: 680 to 1040, width 360)
            card1_img = cv2.resize(beauty_crop, (360, 580), interpolation=cv2.INTER_AREA)
            canvas[220:800, 680:1040] = card1_img
            cv2.rectangle(canvas, (680, 220), (1040, 800), (160, 140, 180), 2)
            cv2.rectangle(canvas, (680, 740), (1040, 800), (0, 0, 0), -1)
            cv2.putText(canvas, "NGƯỜI MẪU GỐC", (725, 780), cv2.FONT_HERSHEY_SIMPLEX, 0.72, (255, 255, 255), 2, cv2.LINE_AA)
            
            card2_img = cv2.resize(cur_garment, (360, 580), interpolation=cv2.INTER_AREA)
            canvas[840:1420, 680:1040] = card2_img
            cv2.rectangle(canvas, (680, 840), (1040, 1420), (160, 140, 180), 2)
            cv2.rectangle(canvas, (680, 1360), (1040, 1420), (0, 0, 0), -1)
            cv2.putText(canvas, g_tag, (705, 1400), cv2.FONT_HERSHEY_SIMPLEX, 0.70, (100, 220, 255), 2, cv2.LINE_AA)
            
            # 4. BOTTOM INFO SECTION (y: 1460 to 1860)
            cv2.rectangle(canvas, (40, 1460), (1040, 1840), (25, 22, 32), -1)
            cv2.rectangle(canvas, (40, 1460), (1040, 1840), (80, 70, 95), 1)
            
            cv2.putText(canvas, title, (70, 1530), cv2.FONT_HERSHEY_DUPLEX, 1.25, accent_col, 2, cv2.LINE_AA)
            cv2.putText(canvas, desc, (70, 1590), cv2.FONT_HERSHEY_SIMPLEX, 0.90, (220, 220, 220), 2, cv2.LINE_AA)
            
            # Progress indicator bar
            total_expected = 240
            prog_w = int((total_idx / total_expected) * 960)
            cv2.rectangle(canvas, (40, 1835), (1040, 1840), (45, 40, 55), -1)
            cv2.rectangle(canvas, (40, 1835), (40 + min(960, prog_w), 1840), accent_col, -1)
            
            out_f = os.path.join(temp_dir, f"f_{total_idx:04d}.jpg")
            cv2.imwrite(out_f, canvas, [cv2.IMWRITE_JPEG_QUALITY, 96])
            total_idx += 1
            
        cap.release()
        
    print(f"Rendered {total_idx} frames for 9:16 try-on master.", flush=True)
    
    cmd = [
        "ffmpeg", "-y", "-framerate", "24",
        "-i", os.path.join(temp_dir, "f_%04d.jpg"),
        "-i", audio_path,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "fast",
        "-c:a", "aac", "-b:a", "192k",
        "-af", "afade=t=out:st=9.2:d=0.8",
        "-t", "10.0",
        output_9_16
    ]
    subprocess.run(cmd, check=True)
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"=== Successfully built {output_9_16} ({os.path.getsize(output_9_16)} bytes) ===", flush=True)

if __name__ == "__main__":
    audio_p = r"data\seecut_jobs\sc_1792571870186_fd1jx\work\music.wav"
    out_169 = "model4_flawless_fashion_16_9.mp4"
    out_916 = "model4_flawless_tryon_9_16.mp4"
    
    build_16_9_master(audio_p, out_169)
    build_9_16_tryon(audio_p, out_916)
