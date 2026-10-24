import sqlite3
import json
import requests
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')
base_url = "https://api.iooai.cn/v1"

with open("d:/phim ai thời trang/data/assets/prj_hardware_10s/public_urls.json") as f:
    urls = json.load(f)

# Prompt for hardware warehouse advertising:
# Referencing @Ảnh1 (character turnaround) and @Ảnh2 (warehouse aisle)
prompt = (
    "Sử dụng @Ảnh1 làm tham chiếu nhận diện nhân vật (cô gái trẻ châu Á, tóc ngắn uốn lượn vai màu nâu hạt dẻ, gương mặt thanh tú) "
    "và @Ảnh2 làm tham chiếu bối cảnh kho hàng kim khí. "
    "Cô gái đứng giữa lối đi kho hàng kim khí, tay cầm micro hoặc hướng tay giới thiệu các kệ hàng cơ khí, máy móc, linh kiện kim khí. "
    "Gương mặt mỉm cười tự tin, nói chuyện nhiệt tình, phong thái chuyên nghiệp như một MC/KOL livestream bán hàng kho kim khí. "
    "Khung hình dọc 9:16, chuyển động mượt mà, ánh sáng kho hàng rõ nét, chân thực 100%."
)

payload = {
    "model": "omni_flash_10s",
    "prompt": prompt,
    "seconds": "10",
    "resolution": "720p",
    "ratio": "9:16",
    "images": [urls["char"], urls["warehouse"]]
}

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

print("Submitting IOOAI Omni Flash 10s...")
res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=30)
print("Status code:", res.status_code)
print("Response text:", res.text)

if res.status_code == 200:
    data = res.json()
    job_id = data.get('id')
    print(f"Job ID: {job_id}, polling...")
    for i in range(30):
        time.sleep(5)
        poll_res = requests.get(f"{base_url}/videos/{job_id}", headers=headers, timeout=10)
        pdata = poll_res.json()
        status = pdata.get('status')
        print(f"[{i+1}] Status: {status}")
        if status == 'completed':
            print("SUCCESS! Output video URL:", pdata.get('output_url'))
            break
        elif status in ['failed', 'error', 'cancelled']:
            print("Failed:", pdata)
            break
