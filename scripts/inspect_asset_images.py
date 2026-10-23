import glob, os

images = glob.glob('data/assets/**/*.jpg', recursive=True) + glob.glob('data/assets/**/*.png', recursive=True)
print(f"Total images found: {len(images)}")
for img in images[:30]:
    print(img)
