import cv2
import numpy as np

img = cv2.imread("test_swap_studio_portrait.jpg")
h, w = img.shape[:2]
pw = w // 3

src_face = img[:, :pw]
before_face = img[:, pw:2*pw]
after_face = img[:, 2*pw:]

print("Source face mean BGR:", src_face.mean(axis=(0,1)).astype(int))
print("Before face mean BGR:", before_face.mean(axis=(0,1)).astype(int))
print("After face mean BGR: ", after_face.mean(axis=(0,1)).astype(int))
