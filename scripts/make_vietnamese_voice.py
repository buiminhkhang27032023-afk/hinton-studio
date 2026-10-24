from gtts import gTTS
import os
import subprocess

text = "Dạ em chào các bác! Hôm nay em dẫn mọi người ghé thăm trực tiếp tổng kho kim khí lớn nhất miền Bắc, đầy đủ máy bắn đinh, máy khoan và phụ kiện giá tận xưởng nhé!"
tts = gTTS(text=text, lang='vi', slow=False)
raw_audio = "d:/phim ai thời trang/data/assets/prj_hardware_10s/raw_voice_vi.mp3"
tts.save(raw_audio)
print("Saved raw voice:", os.path.getsize(raw_audio), "bytes")

# Speed up slightly (1.15x) to fit ~9.5s
final_audio = "d:/phim ai thời trang/data/assets/prj_hardware_10s/voice_vi_final.mp3"
cmd = [
    "ffmpeg", "-y", "-i", raw_audio,
    "-filter:a", "atempo=1.12",
    final_audio
]
subprocess.run(cmd, check=True)
print("Final voice saved:", os.path.getsize(final_audio), "bytes")
