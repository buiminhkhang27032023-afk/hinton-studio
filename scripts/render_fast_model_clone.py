import os
import sys
import time
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

def main():
    src_img_path = "user_model_face_2.png"
    input_video_path = "data/veo-fashion-1.mp4"
    output_video_path = "model2_catwalk_cloned_3s.mp4"
    
    print("=== STARTING FAST 3S FASHION CLONE ===", flush=True)
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
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    max_frames = 72 # 3 seconds
    
    # Target resolution: 854x480 for fast rendering and clean mobile view
    out_w, out_h = 854, 480
    temp_raw = "temp_fast_out.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw, fourcc, fps, (out_w, out_h))
    
    last_target_face = None
    frame_idx = 0
    swapped_count = 0
    
    # First frame comparison save
    first_comparison_saved = False
    
    while cap.isOpened() and frame_idx < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        # Resize to 854x480
        frame_resized = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
        
        # Detect face every 3 frames or if None
        if frame_idx % 3 == 1 or last_target_face is None:
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
                    # Save a clear side-by-side comparison image
                    c_src = cv2.resize(src_img, (int(src_img.shape[1] * (out_h / src_img.shape[0])), out_h))
                    combo = np.hstack([c_src, frame_resized, frame_swapped])
                    cv2.imwrite("model2_face_comparison.jpg", combo)
                    first_comparison_saved = True
                    print("Saved model2_face_comparison.jpg", flush=True)
                    
                frame_resized = frame_swapped
            except Exception as e:
                pass
                
        out.write(frame_resized)
        
        if frame_idx % 12 == 0 or frame_idx == max_frames:
            elapsed = time.time() - t0
            print(f"[{frame_idx}/{max_frames}] {frame_idx/max_frames*100:.1f}% ({frame_idx/elapsed:.1f} fps, swapped={swapped_count})", flush=True)
            
    cap.release()
    out.release()
    
    print("Muxing H.264 video with ffmpeg...", flush=True)
    os.system(f'ffmpeg -y -i "{temp_raw}" -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p "{output_video_path}"')
    if os.path.exists(temp_raw):
        try:
            os.remove(temp_raw)
        except:
            pass
            
    print(f"=== FINISHED in {time.time()-t0:.1f}s: {output_video_path} ===", flush=True)

if __name__ == "__main__":
    main()
