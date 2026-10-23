import cv2
import insightface
from insightface.app import FaceAnalysis

app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(256, 256))

input_path = r"data\assets\prj_6db5b4ce6484\asset_9bdc9026a3c8-C-nh-1--B--c-ra-s-n-di-n-th-i-trang-Paris-trong---m-d--h-i--.mp4"
cap = cv2.VideoCapture(input_path)

frame_idx = 0
last_bbox = None
misfires = 0
correct = 0

out_w, out_h = 960, 540

while cap.isOpened() and frame_idx < 96:
    ret, frame = cap.read()
    if not ret: break
    frame_idx += 1
    
    frame_resized = cv2.resize(frame, (out_w, out_h), interpolation=cv2.INTER_AREA)
    faces = app.get(frame_resized)
    if not faces:
        print(f"Frame {frame_idx}: NO FACES!")
        continue
        
    valid_faces = []
    for f in faces:
        cx = (f.bbox[0] + f.bbox[2]) / 2
        cy = (f.bbox[1] + f.bbox[3]) / 2
        if 0.35 * out_w <= cx <= 0.65 * out_w and cy <= 0.50 * out_h:
            valid_faces.append(f)
            
    if valid_faces:
        if last_bbox is not None:
            last_cx = (last_bbox[0] + last_bbox[2]) / 2
            last_cy = (last_bbox[1] + last_bbox[3]) / 2
            chosen = min(valid_faces, key=lambda f: (((f.bbox[0]+f.bbox[2])/2 - last_cx)**2 + ((f.bbox[1]+f.bbox[3])/2 - last_cy)**2))
        else:
            chosen = min(valid_faces, key=lambda f: abs((f.bbox[0]+f.bbox[2])/2 - out_w / 2))
    else:
        chosen = min(faces, key=lambda f: abs((f.bbox[0]+f.bbox[2])/2 - out_w / 2))
        
    last_bbox = chosen.bbox
    cx = (chosen.bbox[0] + chosen.bbox[2]) / 2
    cy = (chosen.bbox[1] + chosen.bbox[3]) / 2
    
    # Is it the model? Model has cx in [430:520], cy in [80:180]
    if 400 <= cx <= 550 and 80 <= cy <= 200:
        correct += 1
    else:
        misfires += 1
        print(f"Misfire at frame {frame_idx}: chosen bbox={chosen.bbox}, cx={cx:.1f}, cy={cy:.1f}")

cap.release()
print(f"\nResult on 96 frames: Correct Model Tracks = {correct}/96, Misfires = {misfires}")
