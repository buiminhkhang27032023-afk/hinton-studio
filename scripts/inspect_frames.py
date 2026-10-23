import cv2, os
import numpy as np

for f in os.listdir("temp_fashion_scan"):
    if f.endswith(".jpg"):
        p = os.path.join("temp_fashion_scan", f)
        img = cv2.imread(p)
        h, w = img.shape[:2]
        # Calculate average color
        avg_color = img.mean(axis=(0,1))
        # Center crop
        center = img[h//4:3*h//4, w//4:3*w//4]
        avg_center = center.mean(axis=(0,1))
        print(f"{f}: size={w}x{h}, avg_bgr={avg_color.astype(int)}, center_bgr={avg_center.astype(int)}")
