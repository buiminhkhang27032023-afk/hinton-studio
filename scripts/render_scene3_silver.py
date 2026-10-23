import os, sys, time, shutil, subprocess
import cv2, numpy as np
import insightface
from insightface.app import FaceAnalysis

print("Initializing InsightFace for Scene 3 Silver...", flush=True)
app_full = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app_full.prepare(ctx_id=0, det_size=(320, 320))

app_det = FaceAnalysis(name='buffalo_l', allowed_modules=['detection'], providers=['CPUExecutionProvider'])
app_det.prepare(ctx_id=0, det_size=(320, 320))

swapper = insightface.model_zoo.get_model('models/inswapper_128.onnx', download=False, providers=['CPUExecutionProvider'])

src_img = cv2.imread('user_model_face_4.png')
src_faces = app_full.get(src_img)
src_face = sorted(src_faces, key=lambda f: (f.bbox[2]-f.bbox[0])*(f.bbox[3]-f.bbox[1]), reverse=True)[0]

dir_p = r"D:\phim ai thời trang\data\assets\prj_dd30b182250a"
filename = [f for f in os.listdir(dir_p) if '8af8d05355a3' in f][0]
input_path = os.path.join(dir_p, filename)
output_path = "scene3_silver_cloned.mp4"
start_frame = 12
num_frames = 72

print(f"Input: {input_path}")
print(f"Output: {output_path}")

cap = cv2.VideoCapture(input_path)
cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
fps = cap.get(cv2.CAP_PROP_FPS) or 24.0

temp_dir = "temp_flawless_scene3_silver"
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)
os.makedirs(temp_dir, exist_ok=True)

last_target = None
last_bbox = None
swapped_count = 0
t0 = time.time()

for idx in range(num_frames):
    ret, frame = cap.read()
    if not ret:
        print(f"End at frame {idx}")
        break
        
    h, w, _ = frame.shape
    if w != 1280 or h != 720:
        frame = cv2.resize(frame, (1280, 720), interpolation=cv2.INTER_AREA)
        w, h = 1280, 720
        
    faces = app_det.get(frame)
    if faces:
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
            
        last_target = target
        last_bbox = target.bbox
        
        try:
            frame = swapper.get(frame, target, src_face, paste_back=True)
            swapped_count += 1
        except Exception:
            pass
    elif last_target is not None:
        try:
            frame = swapper.get(frame, last_target, src_face, paste_back=True)
            swapped_count += 1
        except:
            pass
            
    out_f = os.path.join(temp_dir, f"f_{idx:04d}.jpg")
    cv2.imwrite(out_f, frame, [cv2.IMWRITE_JPEG_QUALITY, 96])
    
    if (idx + 1) % 24 == 0 or (idx + 1) == num_frames:
        cur_fps = (idx + 1) / (time.time() - t0)
        print(f"  [Scene 3 Silver] Frame {idx+1}/{num_frames} ({idx+1/num_frames*100:.0f}%, {cur_fps:.1f} fps, {swapped_count} swapped)", flush=True)

cap.release()

cmd = [
    "ffmpeg", "-y", "-framerate", str(fps),
    "-i", os.path.join(temp_dir, "f_%04d.jpg"),
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
    output_path
]
subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
shutil.rmtree(temp_dir, ignore_errors=True)
print(f"=== Successfully produced {output_path} ({os.path.getsize(output_path)} bytes) in {time.time()-t0:.1f}s ===", flush=True)
