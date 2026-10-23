import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

print("Loading buffalo_l and inswapper_128...")
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(320, 320))

model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])

# Load source
src_bgr = cv2.imread("user_model_face_4.png")
src_faces = app.get(src_bgr)
print(f"Source faces detected: {len(src_faces)}")
src_face = sorted(src_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]

# Test on 3 different video frames:
targets = [
    ("studio_portrait", "frontal_portrait_raw.mp4", 24),
    ("runway_paris", r"data\assets\prj_6db5b4ce6484\asset_9bdc9026a3c8-C-nh-1--B--c-ra-s-n-di-n-th-i-trang-Paris-trong---m-d--h-i--.mp4", 24),
    ("catwalk_tracking", r"data\assets\prj_6db5b4ce6484\asset_8a3c0db6daa8-C-nh-2--S-i-b--c-catwalk-tracking-shot---Th-n-th-i-ki-u-sa.mp4", 24),
]

for label, vpath, fnum in targets:
    cap = cv2.VideoCapture(vpath)
    cap.set(cv2.CAP_PROP_POS_FRAMES, fnum)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        print(f"Cannot read frame from {vpath}")
        continue
        
    t_faces = app.get(frame)
    print(f"[{label}] detected {len(t_faces)} faces")
    if not t_faces:
        continue
    # Pick largest or central face
    t_face = sorted(t_faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
    
    # Raw swap
    swapped = swapper.get(frame, t_face, src_face, paste_back=True)
    
    # Save comparison crop: source face, target face before, target face after
    sb = [int(v) for v in src_face.bbox]
    tb = [int(v) for v in t_face.bbox]
    
    src_crop = cv2.resize(src_bgr[max(0,sb[1]):sb[3], max(0,sb[0]):sb[2]], (256, 256))
    before_crop = cv2.resize(frame[max(0,tb[1]):tb[3], max(0,tb[0]):tb[2]], (256, 256))
    after_crop = cv2.resize(swapped[max(0,tb[1]):tb[3], max(0,tb[0]):tb[2]], (256, 256))
    
    comp = np.hstack([src_crop, before_crop, after_crop])
    out_name = f"test_swap_{label}.jpg"
    cv2.imwrite(out_name, comp)
    print(f"Saved {out_name}")
