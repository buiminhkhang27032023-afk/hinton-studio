import os
import sys
import time
import shutil
import subprocess
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

def main():
    src_img_path = "user_model_face_3.png"
    input_path = r"data\assets\prj_6db5b4ce6484\asset_9bdc9026a3c8-C-nh-1--B--c-ra-s-n-di-n-th-i-trang-Paris-trong---m-d--h-i--.mp4"
    output_path = "model3_paris_runway_clean.mp4"
    temp_dir = "temp_clean_runway_frames"
    
    print("=== RE-SWAPPING RUNWAY WITH STRICT MODEL TRACKING ===", flush=True)
    t0 = time.time()
    
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(256, 256))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    src_img = cv2.imread(src_img_path)
    src_face = app.get(src_img)[0]
    
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames = min(96, total_frames) # 4 seconds
    
    out_w, out_h = 960, 540
    last_bbox = None
    frame_idx = 0
    swapped_count = 0
    
    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret: break
        frame_idx += 1
        
        frame_resized = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
        faces = app.get(frame_resized)
        
        target_face = None
        if faces:
            # Strictly filter for central model on runway
            valid = []
            for f in faces:
                cx = (f.bbox[0] + f.bbox[2]) / 2
                cy = (f.bbox[1] + f.bbox[3]) / 2
                # Model is in center corridor and upper half
                if 0.35 * out_w <= cx <= 0.65 * out_w and cy <= 0.45 * out_h:
                    valid.append(f)
                    
            if valid:
                if last_bbox is not None:
                    last_cx = (last_bbox[0] + last_bbox[2]) / 2
                    last_cy = (last_bbox[1] + last_bbox[3]) / 2
                    target_face = min(valid, key=lambda f: (((f.bbox[0]+f.bbox[2])/2 - last_cx)**2 + ((f.bbox[1]+f.bbox[3])/2 - last_cy)**2))
                else:
                    target_face = min(valid, key=lambda f: abs((f.bbox[0]+f.bbox[2])/2 - out_w / 2))
            else:
                # Closest to center
                target_face = min(faces, key=lambda f: abs((f.bbox[0]+f.bbox[2])/2 - out_w / 2))
                
            last_bbox = target_face.bbox
            
        if target_face is not None:
            try:
                frame_resized = swapper.get(frame_resized, target_face, src_face, paste_back=True)
                swapped_count += 1
            except Exception:
                pass
                
        frame_file = os.path.join(temp_dir, f"frame_{frame_idx:04d}.jpg")
        cv2.imwrite(frame_file, frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        if frame_idx % 24 == 0 or frame_idx == max_frames:
            print(f"  Frame {frame_idx}/{max_frames} ({frame_idx/max_frames*100:.0f}%, swapped={swapped_count})", flush=True)
            
    cap.release()
    
    # Mux to MP4
    temp_frames_pattern = os.path.join(temp_dir, "frame_%04d.jpg")
    cmd = [
        "ffmpeg", "-nostdin", "-y",
        "-framerate", str(fps),
        "-i", temp_frames_pattern,
        "-i", input_path,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-map", "0:v:0",
        "-map", "1:a:0?",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", "4.0",
        output_path
    ]
    subprocess.run(cmd, check=True)
    shutil.rmtree(temp_dir, ignore_errors=True)
    
    # Replace model3_paris_runway.mp4
    shutil.copyfile(output_path, "model3_paris_runway.mp4")
    print(f"=== COMPLETED CLEAN RUNWAY in {time.time()-t0:.1f}s: {output_path} ===", flush=True)
    
    # Re-compose lookbook
    from compose_fashion_engine import compose
    lb_out = "output_lookbooks/lookbook_model3_paris_evening.mp4"
    compose(
        video_path="model3_paris_runway.mp4",
        model_img_path="user_model_face_3.png",
        garment_img_path="fashion_sources/garment_2_evening_dress.jpg",
        output_path=lb_out,
        headline="BÍ QUYẾT PHỐI ĐỒ",
        subheadline="Dạ hội Paris sang trọng & kiêu sa",
    )
    print("Re-composed lookbook successfully!", flush=True)

if __name__ == "__main__":
    main()
