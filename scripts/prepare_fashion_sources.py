import cv2, os
from PIL import Image, ImageOps

os.makedirs("fashion_sources", exist_ok=True)

# 1. Process garments to clean product frames
def process_garment(in_path, out_path, crop_box=None):
    img = Image.open(in_path).convert('RGB')
    if crop_box:
        img = img.crop(crop_box)
    img.thumbnail((800, 1200), Image.Resampling.LANCZOS)
    img.save(out_path, quality=95)
    print(f"Saved garment: {out_path} ({img.size})")

# Blazer
b_img = Image.open("temp_blazer.jpg")
bw, bh = b_img.size
process_garment("temp_blazer.jpg", "fashion_sources/garment_1_blazer.jpg", (0, int(bh*0.1), bw, int(bh*0.95)))

# Evening dress
d_img = Image.open("temp_evening_dress.jpg")
dw, dh = d_img.size
process_garment("temp_evening_dress.jpg", "fashion_sources/garment_2_evening_dress.jpg", (0, int(dh*0.1), dw, int(dh*0.95)))

# Trench coat
t_img = Image.open("temp_trench_coat.jpg")
tw, th = t_img.size
process_garment("temp_trench_coat.jpg", "fashion_sources/garment_3_trench_coat.jpg", (int(tw*0.15), 0, int(tw*0.85), th))

# Chic dress
c_img = Image.open("temp_chic_dress.jpg")
cw, ch = c_img.size
process_garment("temp_chic_dress.jpg", "fashion_sources/garment_4_chic_dress.jpg", (0, int(ch*0.05), cw, int(ch*0.95)))

# Model portrait references
# Model A (Asian luxury female model)
m1 = Image.open("user_model_face_2.png").convert('RGB')
m1.save("fashion_sources/model_ref_1.jpg", quality=95)

# Model B (Editorial model)
m2 = Image.open("user_model_face.png").convert('RGB')
m2.save("fashion_sources/model_ref_2.jpg", quality=95)
