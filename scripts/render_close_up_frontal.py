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
    input_video_path = "data/veo-fashion-1.mp4"
    output_video_path = "model2_close_up_frontal_video.mp4"
    frames_dir = "temp_frontal_close_frames"
    
    if os.path.exists(frames_dir):
        shutil.rmtree(frames_dir)
    os.makedirs(frames_dir, exist_ok=True)
    
    print("=== STARTING ULTRA CLOSE-UP FRONTAL FACE VIDEO ===", flush=True)
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
    
    # 3. Read video (take frames 24 to 72 = 48 frames, where the model is walking straight towards camera)
    cap = cv2.VideoCapture(input_video_path)
    start_frame = 24
    num_frames = 48 # 2 seconds
    fps = 24.0
    
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    
    out_w, out_h = 480, 640 # 3:4 portrait like a phone selfie
    last_target_face = None
    frame_idx = 0
    swapped_count = 0
    first_comparison_saved = False
    
    while cap.isOpened() and frame_idx < num_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        # Center of frame is x=640, y=210. Let's crop a 480x640 close-up window around the head/torso
        h_frame, w_frame = frame.shape[:2]
        crop_cx = 645
        crop_cy = 280
        
        crop_w = 450
        crop_h = 600
        
        x1 = max(0, crop_cx - crop_w // 2)
        x2 = min(w_frame, x1 + crop_w)
        y1 = max(0, crop_cy - crop_h // 2)
        y2 = min(h_frame, y1 + crop_h)
        
        cropped_portrait = frame[y1:y2, x1:x2]
        cropped_portrait = cv2.resize(cropped_portrait, (out_w, out_h), interpolation=cv2.INTER_AREA)
        
        # Detect face every 2 frames
        if frame_idx % 2 == 1 or last_target_face is None:
            faces = app.get(cropped_portrait)
            if faces:
                last_target_face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
            else:
                last_target_face = None
                
        if last_target_face is not None:
            try:
                frame_swapped = swapper.get(cropped_portrait, last_target_face, src_face, paste_back=True)
                swapped_count += 1
                
                if not first_comparison_saved:
                    # Save side-by-side comparison of user photo vs this close-up frontal frame
                    c_src = cv2.resize(src_img, (out_w, out_h))
                    combo = np.hstack([c_src, cropped_portrait, frame_swapped])
                    cv2.imwrite("model2_close_up_comparison.jpg", combo)
                    first_comparison_saved = True
                    print("Saved model2_close_up_comparison.jpg", flush=True)
                    
                cropped_portrait = frame_swapped
            except Exception:
                pass
                
        frame_file = os.path.join(frames_dir, f"frame_{frame_idx:04d}.jpg")
        cv2.imwrite(frame_file, cropped_portrait, [cv2.IMWRITE_JPEG_QUALITY, 95])
        
        if frame_idx % 12 == 0 or frame_idx == num_frames:
            elapsed = time.time() - t0
            print(f"[{frame_idx}/{num_frames}] {frame_idx/num_frames*100:.1f}% ({frame_idx/elapsed:.2f} fps, swapped={swapped_count})", flush=True)
            
    cap.release()
    
    print("Muxing video with ffmpeg...", flush=True)
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
