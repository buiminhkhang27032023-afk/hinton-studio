import os, glob, cv2
from PIL import Image

output_dir = "temp_fashion_scan"
os.makedirs(output_dir, exist_ok=True)

# Scan videos
videos = [
    ("veo_fashion_1", "data/veo-fashion-1.mp4"),
    ("veo_fashion_2", "data/veo-fashion-2.mp4"),
    ("female_catwalk_1", "data/assets/prj_6db5b4ce6484/asset_9bdc9026a3c8-C-nh-1--B--c-ra-s-n-di-n-th-i-trang-Paris-trong---m-d--h-i--.mp4"),
    ("female_catwalk_2", "data/assets/prj_6db5b4ce6484/asset_8a3c0db6daa8-C-nh-2--S-i-b--c-catwalk-tracking-shot---Th-n-th-i-ki-u-sa.mp4"),
    ("female_catwalk_3", "data/assets/prj_6db5b4ce6484/asset_361dbde1a829-C-nh-3--T-o-d-ng-th-n-th-i---u-s-n-catwalk---C--xoay-ng--i-k.mp4"),
    ("female_master_20s", "data/assets/prj_6db5b4ce6484/asset_5ea46c0edaab-Video-S-n-Di-n-Th-i-Trang-20s---Ng--i-M-u-M-i--Master-.mp4"),
    ("beach_12s", "data/beach-12s.mp4"),
    ("frontal_portrait", "frontal_portrait_raw.mp4"),
]

for label, vpath in videos:
    if not os.path.exists(vpath):
        print(f"File not found: {vpath}")
        continue
    cap = cv2.VideoCapture(vpath)
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 24
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    # Grab middle frame
    cap.set(cv2.CAP_PROP_POS_FRAMES, min(24, count - 1))
    ret, frame = cap.read()
    if ret:
        thumb_path = os.path.join(output_dir, f"{label}_frame.jpg")
        cv2.imwrite(thumb_path, frame)
        print(f"{label}: {w}x{h}, {count/fps:.1f}s -> {thumb_path}")
    cap.release()
