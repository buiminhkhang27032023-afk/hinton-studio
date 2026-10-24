import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = "https://www.runninghub.cn/openapi/v2"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Host": "www.runninghub.cn"
}

def upload(path, name):
    with open(path, "rb") as f:
        files = {"file": (name, f, "image/jpeg" if path.endswith('.jpg') else "image/png")}
        res = requests.post(f"{base_url}/media/upload/binary", headers=headers, files=files, timeout=30)
        url = res.json()['data']['download_url']
        print(f"Uploaded {name} -> {url[:70]}...")
        return url

u_char = upload("d:/phim ai thời trang/data/assets/prj_hardware_10s/character_turnaround.jpg", "char.jpg")
u_warehouse = upload("d:/phim ai thời trang/data/assets/prj_hardware_10s/warehouse_ref.png", "warehouse.png")
u_host = upload("d:/phim ai thời trang/data/assets/prj_hardware_10s/host_vertical_9_16.jpg", "host_clean.jpg")

urls = {
    "char": u_char,
    "warehouse": u_warehouse,
    "host": u_host
}

with open("d:/phim ai thời trang/data/assets/prj_hardware_10s/public_urls.json", "w") as f:
    json.dump(urls, f, indent=2)

print("All 3 images uploaded and saved to public_urls.json!")
