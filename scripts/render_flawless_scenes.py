import os, sys, time, shutil, subprocess
import cv2, numpy as np
import insightface
from insightface.app import FaceAnalysis

print("Initializing InsightFace with optimized detection...", flush=True)
# Full model for source face embedding
app_full = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app_full.prepare(ctx_id=0, det_size=(320, 320))

# Fast detection-only model for video frames
app_det = FaceAnalysis(name='buffalo_l', allowed_modules=['detection'], providers=['CPUExecutionProvider'])
app_det.prepare(ctx_id=0, det_size=(320, 320))

swapper = insightface.model_zoo.get_model('models/inswapper_128.onnx', download=False, providers=['CPUExecutionProvider'])

src_img = cv2.imread('user_model_face_4.png')
src_faces = app_full.get(src_img)
src_face = sorted(src_faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
print(f"Source face loaded: bbox={src_face.bbox.astype(int)}, det={src_face.det_score:.2f}", flush=True)

def render_scene(input_path, output_path, start_frame, num_frames, pick_center=True, label="Scene"):
    print(f"\n==========================================", flush=True)
    print(f"Rendering {label}: {input_path}", flush=True)
    print(f"==========================================", flush=True)
    t0 = time.time()
    
    cap = cv2.VideoCapture(input_path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    
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
            print(f"  Warning: Reached end of video at frame {idx}")
            break
            
        h, w, _ = frame.shape
        # Ensure 1280x720
        if w != 1280 or h != 720:
            frame = cv2.resize(frame, (1280, 720), interpolation=cv2.INTER_AREA)
            w, h = 1280, 720
            
        faces = app_det.get(frame)
        if faces:
            if pick_center:
                # filter faces in the center 60% corridor
                cands = [f for f in faces if 0.20*w <= (f.bbox[0]+f.bbox[2])/2 <= 0.80*w]
                if cands:
                    if last_bbox is not None:
                        last_cx = (last_bbox[0] + last_bbox[2]) / 2
                        last_cy = (last_bbox[1] + last_bbox[3]) / 2
                        target = min(cands, key=lambda f: (((f.bbox[0]+f.bbox[2])/2 - last_cx)**2 + ((f.bbox[1]+f.bbox[3])/2 - last_cy)**2))
                    else:
                        target = sorted(cands, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
                else:
                    target = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
            else:
                target = sorted(faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]
                
            last_target = target
            last_bbox = target.bbox
            
            try:
                frame = swapper.get(frame, target, src_face, paste_back=True)
                swapped_count += 1
            except Exception as e:
                pass
        elif last_target is not None:
            # retry with previous target if tracking momentarily lost
            try:
                frame = swapper.get(frame, last_target, src_face, paste_back=True)
                swapped_count += 1
            except:
                pass
                
        out_f = os.path.join(temp_dir, f"f_{idx:04d}.jpg")
        cv2.imwrite(out_f, frame, [cv2.IMWRITE_JPEG_QUALITY, 96])
        
        if (idx + 1) % 24 == 0 or (idx + 1) == num_frames:
            cur_fps = (idx + 1) / (time.time() - t0)
            print(f"  [{label}] Frame {idx+1}/{num_frames} ({idx+1/num_frames*100:.0f}%, {cur_fps:.1f} fps, {swapped_count} swapped)", flush=True)
            
    cap.release()
    
    # Encode MP4
    cmd = [
        "ffmpeg", "-y", "-framerate", str(fps),
        "-i", os.path.join(temp_dir, "f_%04d.jpg"),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
        output_path
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    shutil.rmtree(temp_dir, ignore_errors=True)
    print(f"=== Successfully produced {output_path} ({os.path.getsize(output_path)} bytes) in {time.time()-t0:.1f}s ===", flush=True)

# Scene 1: Trench Coat Cyber Chic (veo-fashion-2.mp4, 84 frames = 3.5s)
render_scene("data/veo-fashion-2.mp4", "scene1_trench_cloned.mp4", start_frame=24, num_frames=84, pick_center=False, label="Scene 1 Trench")

# Scene 2: Emerald Evening Gown Catwalk (asset_c86555d90126, 84 frames = 3.5s)
p_green = r"D:\phim ai thời trang\data\assets\prj_dd30b182250a\asset_c86555d90126-C-nh-2--Catwalk-chuy-n-nghi-p---T--v-y-d--h-i.mp4"
render_scene(p_green, "scene2_emerald_cloned.mp4", start_frame=36, num_frames=84, pick_center=True, label="Scene 2 Emerald")

# Scene 3: Liquid Silver Finale Turn & Smile (asset_8af8d05355a3, 72 frames = 3.0s)
p_silver = r"D:\phim ai thời trang\data\assets\prj_dd30b182250a\asset_8af8d05355a3-C-nh-3--C-n-c-nh-th-n-th-i---C--xoay-ng--i-k-t.mp4"
render_scene(p_silver, "scene3_silver_cloned.mp4", start_frame=12, num_frames=72, pick_center=True, label="Scene 3 Silver")

print("\nALL 3 SCENES COMPLETED!", flush=True)
