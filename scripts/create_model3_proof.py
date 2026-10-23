import cv2
import numpy as np

img = cv2.imread("comparison_runway_catwalk.jpg")
h, w = img.shape[:2]

# Slice panels:
# c_src: [0 : 474]
# c_orig: [474 : 1434]
# c_swapped: [1434 : 2394]

c_src = img[:, :474]
c_orig = img[:, 474:1434]
c_swapped = img[:, 1434:2394]

# Let's crop face area in swapped (center ~480, height ~180-380)
# Find face in swapped
import insightface
from insightface.app import FaceAnalysis
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(256, 256))

f_src = app.get(c_src)[0]
f_swap = app.get(c_swapped)[0]

def get_face_crop(image, face, target_size=(360, 360)):
    b = [int(v) for v in face.bbox]
    cx = (b[0] + b[2]) // 2
    cy = (b[1] + b[3]) // 2
    sz = int(max(b[2]-b[0], b[3]-b[1]) * 1.5)
    y1 = max(0, cy - sz // 2)
    y2 = min(image.shape[0], cy + sz // 2)
    x1 = max(0, cx - sz // 2)
    x2 = min(image.shape[1], cx + sz // 2)
    crop = image[y1:y2, x1:x2]
    return cv2.resize(crop, target_size, interpolation=cv2.INTER_AREA)

crop_src = get_face_crop(c_src, f_src)
crop_swap = get_face_crop(c_swapped, f_swap)

# Put label headers
cv2.putText(crop_src, "Anh Goc Cua Ban", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 255), 2)
cv2.putText(crop_swap, "Nhan Ban San Dien", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

proof = np.hstack([crop_src, crop_swap])
cv2.imwrite("proof_face_clone_model3.jpg", proof)
print("Saved proof_face_clone_model3.jpg")
