from PIL import Image

for name in ["blazer", "evening_dress", "trench_coat", "chic_dress"]:
    img = Image.open(f"temp_{name}.jpg")
    print(f"{name}: {img.size}, mode={img.mode}")
