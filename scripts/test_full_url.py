import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = "https://www.runninghub.cn/openapi/v2"

img_path = "d:/phim ai thời trang/data/assets/prj_superpower_20s/asset_07134c809a66-Th-----AI--N--ch-nh---V-y-d--h-i-h-ng.jpg"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Host": "www.runninghub.cn"
}

with open(img_path, "rb") as f:
    files = {"file": ("tryon_female.jpg", f, "image/jpeg")}
    res = requests.post(f"{base_url}/media/upload/binary", headers=headers, files=files, timeout=30)
    data = res.json()
    full_url = data['data']['download_url']
    print("Full uploaded URL with signature:")
    print(full_url)
    # Check if download works
    check = requests.get(full_url, timeout=10)
    print("Download check status:", check.status_code, "Length:", len(check.content))
