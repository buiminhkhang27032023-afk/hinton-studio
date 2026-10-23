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
    output_video_path = "model2_frontal_portrait_cloned.mp4"
    frames_dir = "temp_frontal_frames"
    
    if not os.path.exists(input_video_path):
        print(f"Error: {input_video_path} does not exist yet!", flush=True)
        return
        
    if os.path.exists(frames_dir):
        shutil.rmtree(frames_dir)
    os.makedirs(frames_dir, exist_ok=True)
    
    print("=== STARTING DIRECT FRONTAL PORTRAIT CLONE ===", flush=True)
    t0 = time.time()
    
    # 1. Load insightface
    print("Loading models...", flush=True)
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(256, 256))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    # 2. Get source face
    src_img = cv2.imread(src_img_path)
    src_faces = app.get(src_img)
    if not src_faces:
        print("ERROR: No face in source image!", flush=True)
        return
    src_face = sorted(src_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
    print(f"Source face detected: bbox={src_face.bbox}", flush=True)
    
    # 3. Read video (take first 72 frames = 3.0s at 24fps)
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    max_frames = min(72, total_frames) # 3 seconds close-up
    
    out_w, out_h = 854, 480
    last_target_face = None
    frame_idx = 0
    swapped_count = 0
    first_comparison_saved = False
    
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
                
                if not first_comparison_saved:
                    # Save side-by-side comparison
                    c_src = cv2.resize(src_img, (int(src_img.shape[1] * (out_h / src_img.shape[0])), out_h))
                    combo = np.hstack([c_src, frame_resized, frame_swapped])
                    cv2.imwrite("model2_frontal_comparison.jpg", combo)
                    first_comparison_saved = True
                    print("Saved model2_frontal_comparison.jpg", flush=True)
                    
                frame_resized = frame_swapped
            except Exception:
                pass
                
        frame_file = os.path.join(frames_dir, f"frame_{frame_idx:04d}.jpg")
        cv2.imwrite(frame_file, frame_resized, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        if frame_idx % 12 == 0 or frame_idx == max_frames:
            elapsed = time.time() - t0
            print(f"[{frame_idx}/{max_frames}] {frame_idx/max_frames*100:.1f}% ({frame_idx/elapsed:.2f} fps, swapped={swapped_count})", flush=True)
            
    cap.release()
    
    print(f"All {frame_idx} frames saved. Calling ffmpeg...", flush=True)
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
