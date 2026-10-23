import cv2
import numpy as np

cap = cv2.VideoCapture("output_lookbooks/lookbook_model3_studio_chic.mp4")
frames = []
for idx in [12, 36, 60]:
    cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
    ret, frame = cap.read()
    if ret:
        # Resize to 360x640 for preview
        resized = cv2.resize(frame, (360, 640), interpolation=cv2.INTER_AREA)
        cv2.putText(resized, f"Frame {idx}", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 255), 2)
        frames.append(resized)
cap.release()

if len(frames) == 3:
    combo = np.hstack(frames)
    cv2.imwrite("C:/Users/Chen Qianyu/.gemini/antigravity/brain/0e6c3b36-0208-4ea3-bdf5-994eea297105/studio_chic_progression.jpg", combo)
    print("Saved studio_chic_progression.jpg successfully!")
