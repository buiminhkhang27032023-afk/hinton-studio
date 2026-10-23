import os
import sys
import time
import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

def sharpen_face(frame, bbox, amount=0.35):
    x1, y1, x2, y2 = [int(v) for v in bbox]
    h, w, _ = frame.shape
    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(w, x2), min(h, y2)
    if x2 <= x1 or y2 <= y1:
        return frame
    
    roi = frame[y1:y2, x1:x2]
    # Unsharp mask
    gaussian = cv2.GaussianBlur(roi, (0, 0), 2.0)
    sharpened = cv2.addWeighted(roi, 1.0 + amount, gaussian, -amount, 0)
    frame[y1:y2, x1:x2] = sharpened
    return frame

def swap_wuxia_video(front_src_path, three_quarter_src_path, input_video_path, output_video_path):
    print(f"=== HIGH-FIDELITY FAST WUXIA FACE SWAP: {os.path.basename(input_video_path)} ===", flush=True)
    t0 = time.time()
    
    # 1. Source analyzer (detection + recognition)
    print("Loading source face recognition models...", flush=True)
    app_src = FaceAnalysis(name='buffalo_l', allowed_modules=['detection', 'recognition'], providers=['CPUExecutionProvider'])
    app_src.prepare(ctx_id=0, det_size=(640, 640))
    
    # 2. Target analyzer (detection only, det_size 320x320 for 16x speedup)
    print("Loading target detection engine (fast 320x320)...", flush=True)
    app_target = FaceAnalysis(name='buffalo_l', allowed_modules=['detection'], providers=['CPUExecutionProvider'])
    app_target.prepare(ctx_id=0, det_size=(320, 320))
    
    model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
    swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])
    
    # 3. Extract Front & Three-Quarter Source Embeddings
    print("Extracting multi-angle source embeddings...", flush=True)
    front_img = cv2.imread(front_src_path)
    front_faces = app_src.get(front_img)
    if not front_faces:
        raise ValueError("No face detected in front source image!")
    front_face = sorted(front_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
    
    tq_img = cv2.imread(three_quarter_src_path)
    tq_faces = app_src.get(tq_img)
    tq_face = sorted(tq_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0] if tq_faces else front_face
    print("Extracted front and 3/4 face embeddings successfully.", flush=True)
    
    # 4. Open Video
    cap = cv2.VideoCapture(input_video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"Input: {width}x{height} @ {fps}fps, {total_frames} total frames (~{total_frames/fps:.1f}s)", flush=True)
    
    temp_raw_out = output_video_path + ".temp.mp4"
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(temp_raw_out, fourcc, fps, (width, height))
    
    frame_idx = 0
    swapped_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        frame_idx += 1
        
        # Fast detection on EVERY frame
        faces = app_target.get(frame)
        if faces:
            # Pick primary character face
            main_face = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
            
            # Instantaneous geometric yaw calculation from 5 landmarks (kps)
            kps = main_face.kps
            d_eye = abs(kps[1][0] - kps[0][0])
            if d_eye > 5:
                yaw_ratio = abs((kps[2][0] - kps[0][0]) - (kps[1][0] - kps[2][0])) / d_eye
            else:
                yaw_ratio = 0
                
            chosen_src = tq_face if yaw_ratio > 0.22 else front_face
            
            try:
                frame = swapper.get(frame, main_face, chosen_src, paste_back=True)
                frame = sharpen_face(frame, main_face.bbox, amount=0.35)
                swapped_count += 1
            except Exception:
                pass
                
        out.write(frame)
        if frame_idx % 24 == 0 or frame_idx == total_frames:
            elapsed = time.time() - t0
            fps_proc = frame_idx / elapsed if elapsed > 0 else 0
            rem = (total_frames - frame_idx) / fps_proc if fps_proc > 0 else 0
            print(f"[{frame_idx}/{total_frames}] {frame_idx/total_frames*100:.1f}% ({fps_proc:.1f} fps, ~{rem:.0f}s left, swapped={swapped_count})", flush=True)
            
    cap.release()
    out.release()
    
    # 5. Mux Audio & Encode H.264
    print("Muxing audio and finalizing clean H.264...", flush=True)
    os.system(f'ffmpeg -y -i "{temp_raw_out}" -i "{input_video_path}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -map 0:v:0 -map 1:a:0? -c:a aac -b:a 192k "{output_video_path}"')
    if os.path.exists(temp_raw_out):
        try:
            os.remove(temp_raw_out)
        except Exception:
            pass
        
    print(f"=== COMPLETED in {time.time()-t0:.1f}s: {output_video_path} (swapped {swapped_count}/{total_frames} frames) ===", flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python high_fidelity_wuxia_swapper.py <front_src> <3q_src> <input_video> <output_video>")
        sys.exit(1)
    swap_wuxia_video(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
