import time
import cv2
import insightface
from insightface.app import FaceAnalysis

print("Testing fast face swapper initialization...")
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(320, 320))

model_path = r"d:\phim ai thời trang\models\inswapper_128.onnx"
swapper = insightface.model_zoo.get_model(model_path, download=False, providers=['CPUExecutionProvider'])

src_img = cv2.imread(r"C:\Users\Chen Qianyu\.gemini\antigravity\brain\4149a5ae-666d-4654-a6f8-20a00b1b99a6\.user_uploaded\media_1792494550051_9176e5a1.jpg")
src_faces = app.get(src_img)
src_face = src_faces[0]
print("Source face ready.")

# Test on 10 frames of catwalk
frame = cv2.imread(r"d:\phim ai thời trang\temp_verify_master_1.jpg")
t0 = time.time()
for i in range(10):
    faces = app.get(frame)
    if faces:
        res = swapper.get(frame, faces[0], src_face, paste_back=True)
elapsed = time.time() - t0
print(f"10 frames swapped in {elapsed:.2f}s ({10/elapsed:.2f} fps)")
