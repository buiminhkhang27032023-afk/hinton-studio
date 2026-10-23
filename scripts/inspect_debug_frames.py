import cv2
import insightface
from insightface.app import FaceAnalysis

app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(320, 320))

for name in ['debug_lookbook_f0.jpg', 'debug_lookbook_f24.jpg', 'debug_lookbook_f48.jpg', 'debug_lookbook_f72.jpg', 'debug_lookbook_f90.jpg']:
    img = cv2.imread(name)
    # Check left side (0:648)
    left = img[:, :648]
    faces = app.get(left)
    print(f"{name} (Left panel 648x1920): {len(faces)} faces detected")
    for i, f in enumerate(faces):
        b = [int(v) for v in f.bbox]
        print(f"   Face {i}: bbox={b}, width={b[2]-b[0]}, height={b[3]-b[1]}")

print("\n--- Runway frames (960x540) ---")
for name in ['debug_runway_f0.jpg', 'debug_runway_f24.jpg', 'debug_runway_f48.jpg', 'debug_runway_f72.jpg', 'debug_runway_f90.jpg']:
    img = cv2.imread(name)
    faces = app.get(img)
    print(f"{name}: {len(faces)} faces detected")
    for i, f in enumerate(faces):
        b = [int(v) for v in f.bbox]
        print(f"   Face {i}: bbox={b}, width={b[2]-b[0]}, height={b[3]-b[1]}")
