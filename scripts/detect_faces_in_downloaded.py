import cv2
from insightface.app import FaceAnalysis

app = FaceAnalysis(name='buffalo_l', root='insightface_models', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=-1, det_size=(640, 640))

for f in ["temp_blazer.jpg", "temp_evening_dress.jpg", "temp_trench_coat.jpg", "temp_chic_dress.jpg"]:
    img = cv2.imread(f)
    faces = app.get(img)
    print(f"{f}: shape={img.shape}, faces_detected={len(faces)}")
