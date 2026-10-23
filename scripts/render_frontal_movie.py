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
    src_img_path = "user_model_face_2.png"
    input_video_path = "frontal_portrait_raw.mp4"
    output_video_path = "model2_true_frontal_2s.mp4"
    frames_dir = "temp_frontal_final_frames"
    
    if os.path.exists(frames_dir):
        shutil.rmtree(frames_dir)
    os.makedirs(frames_dir, exist_ok=True)
    
    print("=== STARTING TRUE FRONTAL VIDEO RENDER (48 FRAMES) ===", flush=True)
    t0 = time.time()
    
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(256, 256))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    src_img = cv2.imread(src_img_path)
    src_face = app.get(src_img)[0]
    
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    num_frames = 48 # 2 seconds
    
    out_w, out_h = 960, 540 # crisp HD
    last_target_face = None
    frame_idx = 0
    swapped_count = 0
    
    while cap.isOpened() and frame_idx < num_frames:
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
                frame_resized = swapper.get(frame_resized, last_target_face, src_face, paste_back=True)
                swapped_count += 1
            except Exception:
                pass
                
        frame_file = os.path.join(frames_dir, f"frame_{frame_idx:04d}.jpg")
        cv2.imwrite(frame_file, frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        if frame_idx % 12 == 0 or frame_idx == num_frames:
            elapsed = time.time() - t0
            print(f"[{frame_idx}/{num_frames}] {frame_idx/num_frames*100:.1f}% ({frame_idx/elapsed:.2f} fps, swapped={swapped_count})", flush=True)
            
    cap.release()
    
    print("Muxing final video with ffmpeg...", flush=True)
    cmd = [
        "ffmpeg", "-nostdin", "-y",
        "-framerate", str(fps),
        "-i", os.path.join(frames_dir, "frame_%04d.jpg"),
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        output_video_path
    ]
    subprocess.run(cmd, check=True)
    print(f"=== COMPLETED in {time.time()-t0:.1f}s: {output_video_path} ===", flush=True)

if __name__ == "__main__":
    main()
