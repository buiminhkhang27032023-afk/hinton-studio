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
    
    print("=== STARTING FASHION FACE CLONING FOR NEW MODEL ===", flush=True)
    t0 = time.time()
    
    # 1. Load InsightFace
    print("Loading buffalo_l and inswapper_128...", flush=True)
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(256, 256))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    # 2. Extract source face embedding
    src_img = cv2.imread(src_img_path)
    if src_img is None:
        raise ValueError(f"Cannot read {src_img_path}")
    
    src_faces = app.get(src_img)
    if not src_faces:
        raise ValueError("No face detected in user_model_face_3.png!")
    src_face = sorted(src_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
    print(f"Source face detected successfully: bbox={src_face.bbox}", flush=True)
    
    # Target 1: Runway Catwalk Video
    runway_input = r"data\assets\prj_6db5b4ce6484\asset_9bdc9026a3c8-C-nh-1--B--c-ra-s-n-di-n-th-i-trang-Paris-trong---m-d--h-i--.mp4"
    runway_output = "model3_paris_runway.mp4"
    process_video(app, swapper, src_face, src_img, runway_input, runway_output, "temp_runway_frames", max_secs=4.0, out_size=(960, 540), label="Runway Catwalk")
    
    # Target 2: Studio Portrait Pose Video
    studio_input = "frontal_portrait_raw.mp4"
    studio_output = "model3_studio_pose.mp4"
    if os.path.exists(studio_input):
        process_video(app, swapper, src_face, src_img, studio_input, studio_output, "temp_studio_frames", max_secs=3.0, out_size=(854, 480), label="Studio Pose")

    print(f"\n=== ALL FASHION VIDEOS CLONED IN {time.time()-t0:.1f}s ===", flush=True)

def process_video(app, swapper, src_face, src_img, input_path, output_path, temp_dir, max_secs=4.0, out_size=(960, 540), label="Video"):
    print(f"\n--- Processing {label}: {input_path} -> {output_path} ---", flush=True)
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    cap = cv2.VideoCapture(input_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames = min(int(max_secs * fps), total_frames)
    
    out_w, out_h = out_size
    last_target_face = None
    frame_idx = 0
    swapped_count = 0
    comparison_saved = False
    
    t_start = time.time()
    
    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        frame_resized = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
        
        # Detect face every 2 frames
        if frame_idx % 2 == 1 or last_target_face is None:
            faces = app.get(frame_resized)
            if faces:
                last_target_face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
            else:
                last_target_face = None
                
        if last_target_face is not None:
            try:
                frame_swapped = swapper.get(frame_resized, last_target_face, src_face, paste_back=True)
                swapped_count += 1
                
                if not comparison_saved:
                    # Save comparison proof
                    src_h, src_w = src_img.shape[:2]
                    target_w = int(src_w * (out_h / src_h))
                    c_src = cv2.resize(src_img, (target_w, out_h))
                    combo = np.hstack([c_src, frame_resized, frame_swapped])
                    comp_name = f"comparison_{label.lower().replace(' ', '_')}.jpg"
                    cv2.imwrite(comp_name, combo)
                    comparison_saved = True
                    print(f"  [Proof] Saved {comp_name}", flush=True)
                    
                frame_resized = frame_swapped
            except Exception as e:
                pass
                
        frame_file = os.path.join(temp_dir, f"frame_{frame_idx:04d}.jpg")
        cv2.imwrite(frame_file, frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        if frame_idx % 18 == 0 or frame_idx == max_frames:
            elapsed = time.time() - t_start
            fps_proc = frame_idx / elapsed if elapsed > 0 else 0
            print(f"  [{label}] Frame {frame_idx}/{max_frames} ({frame_idx/max_frames*100:.0f}%, {fps_proc:.1f} fps, swapped={swapped_count})", flush=True)
            
    cap.release()
    
    # Mux to MP4 with FFmpeg and audio
    print(f"  Muxing to MP4: {output_path}...", flush=True)
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
        "-t", str(max_secs),
        output_path
    ]
    subprocess.run(cmd, check=True)
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"  -> Finished {output_path} ({os.path.getsize(output_path)} bytes)", flush=True)

if __name__ == "__main__":
    main()
