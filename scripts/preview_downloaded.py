from PIL import Image
import os

images = ["temp_blazer.jpg", "temp_evening_dress.jpg", "temp_trench_coat.jpg", "temp_chic_dress.jpg"]
canvas = Image.new("RGB", (1200, 400), (240, 240, 240))

for i, fname in enumerate(images):
    if os.path.exists(fname):
        im = Image.open(fname)
        im.thumbnail((300, 400))
        # paste centered in slot
        x_offset = i * 300 + (300 - im.width) // 2
        y_offset = (400 - im.height) // 2
        canvas.paste(im, (x_offset, y_offset))

canvas.save("temp_contact_sheet.jpg")
print("Saved temp_contact_sheet.jpg, size:", canvas.size)
