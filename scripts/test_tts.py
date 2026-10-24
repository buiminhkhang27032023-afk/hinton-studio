import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
prov = json.loads(settings.get('provider', '{}'))
api_key = prov.get('apiKey')
base_url = prov.get('baseUrl')

url = f"{base_url.rstrip('/')}/audio/speech"
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "tts-1",
    "input": "Dạ em chào các bác! Hôm nay em dẫn mọi người ghé thăm trực tiếp tổng kho kim khí lớn nhất miền Bắc, đầy đủ máy bắn đinh, máy khoan và phụ kiện giá tận xưởng nhé!",
    "voice": "nova"
}

print(f"Testing TTS on {url}...")
res = requests.post(url, headers=headers, json=payload, timeout=20)
print("Status:", res.status_code)
if res.status_code == 200:
    out_path = "d:/phim ai thời trang/data/assets/prj_hardware_10s/voice_vietnamese.mp3"
    with open(out_path, "wb") as f:
        f.write(res.content)
    print(f"Audio saved to {out_path} ({len(res.content)} bytes)")
else:
    print("TTS error:", res.text[:300])
