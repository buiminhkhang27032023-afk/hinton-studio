import asyncio
import edge_tts
import os

PROJECT_ID = "prj_hardware_10s"
BASE_DIR = "d:/phim ai thời trang"
ASSET_DIR = f"{BASE_DIR}/data/assets/{PROJECT_ID}"

TEXT = "Dạ em chào các bác! Hôm nay em dẫn mọi người ghé thăm trực tiếp tổng kho kim khí lớn nhất miền Bắc, đầy đủ máy bắn đinh, máy khoan và phụ kiện giá tận xưởng nhé!"
VOICE = "vi-VN-HoaiMyNeural"
OUTPUT_AUDIO = f"{ASSET_DIR}/voiceover_vietnamese.mp3"

async def main():
    print(f"Generating Vietnamese voiceover with {VOICE}...")
    communicate = edge_tts.Communicate(TEXT, VOICE, rate="+10%")
    await communicate.save(OUTPUT_AUDIO)
    print(f"Audio saved to {OUTPUT_AUDIO} ({os.path.getsize(OUTPUT_AUDIO)} bytes)")

if __name__ == "__main__":
    asyncio.run(main())
