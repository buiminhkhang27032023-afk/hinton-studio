import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')

img_path = "d:/phim ai thời trang/data/assets/prj_superpower_20s/asset_07134c809a66-Th-----AI--N--ch-nh---V-y-d--h-i-h-ng.jpg"

for host in ["https://www.runninghub.ai", "https://www.runninghub.cn"]:
    for ep in ["/openapi/v2/media/upload/binary", "/task/openapi/upload"]:
        url = f"{host}{ep}"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Host": host.replace("https://", "")
        }
        with open(img_path, "rb") as f:
            files = {"file": ("tryon_female.jpg", f, "image/jpeg")}
            data_param = {"apiKey": api_key}
            try:
                res = requests.post(url, headers=headers, files=files, data=data_param, timeout=10)
                print(f"[{url}] status={res.status_code}, resp={res.text[:200]}")
            except Exception as e:
                print(f"[{url}] err={e}")
