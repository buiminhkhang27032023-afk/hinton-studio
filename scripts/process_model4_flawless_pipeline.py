import os, sys, time, shutil, subprocess
import cv2, numpy as np
import insightface
from insightface.app import FaceAnalysis

print("Initializing InsightFace...", flush=True)
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(320, 320))

swapper = insightface.model_zoo.get_model('models/inswapper_128.onnx', download=False, providers=['CPUExecutionProvider'])

# Load source face
src_img = cv2.imread('user_model_face_4.png')
src_faces = app.get(src_img)
src_face = sorted(src_faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
print(f"Source face loaded: bbox={src_face.bbox.astype(int)}, det={src_face.det_score:.2f}", flush=True)

def swap_clip(input_path, output_path, start_frame=0, num_frames=84, pick_center=True, label="Clip"):
    print(f"\n--- Processing {label} ({num_frames} frames) ---", flush=True)
    t0 = time.time()
    cap = cv2.VideoCapture(input_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # We will output at 1280x720
    out_w, out_h = 1280, 720
    temp_dir = f"temp_flawless_{label.lower().replace(' ', '_')}"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir, exist_ok=True)
    
    last_target = None
    last_bbox = None
    swapped_count = 0
    
    for idx in range(num_frames):
        ret, frame = cap.read()
        if not ret:
            break
        if frame.shape[1] != out_w or frame.shape[0] != out_h:
            frame = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
            
        # Detect face every 2 frames for speed, or if no target face yet
        if idx % 2 == 0 or last_target is None:
            faces = app.get(frame)
            if faces:
                if pick_center:
                    cands = [f for f in faces if 0.20*out_w <= (f.bbox[0]+f.bbox[2])/2 <= 0.80*out_w]
                    if cands:
                        if last_bbox is not None:
                            last_cx = (last_bbox[0] + last_bbox[2]) / 2
                            last_cy = (last_bbox[1] + last_bbox[3]) / 2
                            last_target = min(cands, key=lambda f: (((f.bbox[0]+f.bbox[2])/2 - last_cx)**2 + ((f.bbox[1]+f.bbox[3])/2 - last_cy)**2))
                        else:
                            last_target = sorted(cands, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
                    else:
                        last_target = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
                else:
                    last_target = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
                last_bbox = last_target.bbox
            else:
                last_target = None
                
        if last_target is not None:
            try:
                frame = swapper.get(frame, last_target, src_face, paste_back=True)
                swapped_count += 1
            except Exception as e:
                pass
                
        out_f = os.path.join(temp_dir, f"f_{idx:04d}.jpg")
        cv2.imwrite(out_f, frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if (idx + 1) % 24 == 0 or (idx + 1) == num_frames:
            print(f"  [{label}] Frame {idx+1}/{num_frames} ({swapped_count} swapped, {time.time()-t0:.1f}s)", flush=True)
            
    cap.release()
    
    # Encode with ffmpeg
    cmd = [
        "ffmpeg", "-y", "-framerate", str(fps),
        "-i", os.path.join(temp_dir, "f_%04d.jpg"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "fast",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"Finished {output_path} ({os.path.getsize(output_path)} bytes) in {time.time()-t0:.1f}s", flush=True)

# 1. Clip 1: Tokyo Cyber Trench Coat (veo-fashion-2.mp4) - 84 frames (3.5s)
swap_clip("data/veo-fashion-2.mp4", "model4_flawless_look1.mp4", start_frame=24, num_frames=84, pick_center=False, label="Look 1 Trench")

# 2. Clip 2: Emerald Beaded Evening Gown (asset_c86555d90126) - 84 frames (3.5s)
p_green = r"D:\phim ai thời trang\data\assets\prj_dd30b182250a\asset_c86555d90126-C-nh-2--Catwalk-chuy-n-nghi-p---T--v-y-d--h-i.mp4"
swap_clip(p_green, "model4_flawless_look2.mp4", start_frame=36, num_frames=84, pick_center=True, label="Look 2 Emerald")

# 3. Clip 3: Liquid Silver Finale Turn (asset_8af8d05355a3) - 72 frames (3.0s)
p_silver = r"D:\phim ai thời trang\data\assets\prj_dd30b182250a\asset_8af8d05355a3-C-nh-3--C-n-c-nh-th-n-th-i---C--xoay-ng--i-k-t.mp4"
swap_clip(p_silver, "model4_flawless_look3.mp4", start_frame=12, num_frames=72, pick_center=True, label="Look 3 Silver")

print("\n=== ALL 3 FLAWLESS CLIPS PRODUCED SUCCESSFULLY! ===", flush=True)
