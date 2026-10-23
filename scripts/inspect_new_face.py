import cv2
from PIL import Image
import insightface
from insightface.app import FaceAnalysis

img = cv2.imread("user_model_face_3.png")
h, w = img.shape[:2]
print(f"Image dimensions: {w}x{h}")

app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(320, 320))
faces = app.get(img)
print(f"Detected faces: {len(faces)}")

if faces:
    f = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0])*(x.bbox[3]-x.bbox[1]), reverse=True)[0]
    bbox = [int(v) for v in f.bbox]
    print(f"Main face bbox: {bbox}")
    
    # Save face crop
    pad = int((bbox[3] - bbox[1]) * 0.2)
    y1 = max(0, bbox[1] - pad)
    y2 = min(h, bbox[3] + pad)
    x1 = max(0, bbox[0] - pad)
    x2 = min(w, bbox[2] + pad)
    crop = img[y1:y2, x1:x2]
    cv2.imwrite("crop_user_model_face_3.jpg", crop)
    print("Saved crop_user_model_face_3.jpg")
