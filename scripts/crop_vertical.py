from PIL import Image

im = Image.open('d:/phim ai thời trang/data/assets/prj_hardware_10s/asset_002faa08bce9-N--MC-Kho-Kim-Kh---Gh-p-nh-n-v-t-v-o-b-i-c-nh-.jpg')
w, h = im.size
print(f"Original size: {w}x{h}")

# If we crop to 9:16: target height = h, target width = int(h * 9 / 16)
target_w = int(h * 9 / 16)
left = (w - target_w) // 2
right = left + target_w
crop_im = im.crop((left, 0, right, h))
crop_im.save('d:/phim ai thời trang/data/assets/prj_hardware_10s/host_vertical_9_16.jpg', quality=95)
print(f"Saved 9:16 crop: {crop_im.size}")
