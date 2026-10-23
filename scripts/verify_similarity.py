import cv2
import numpy as np
import insightface
from insightface.app import FaceAnalysis

app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(256, 256))

im_src = cv2.imread("user_model_face_3.png")
im_swap = cv2.imread("crop_model3_swapped_face.jpg")

faces_src = app.get(im_src)
faces_swap = app.get(im_swap)

if faces_src and faces_swap:
    feat1 = faces_src[0].normed_embedding
    feat2 = faces_swap[0].normed_embedding
    sim = float(np.dot(feat1, feat2))
    print(f"Cosine Similarity (Source vs Swapped Face): {sim:.4f} (Threshold > 0.4 = same person)")
    if sim > 0.5:
        print("MATCH: Excellent Face Identity Preservation!")
else:
    print(f"Faces detected: src={len(faces_src)}, swap={len(faces_swap)}")
