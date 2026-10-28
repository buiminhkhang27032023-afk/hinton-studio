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

# Public base url
public_url = "https://roman-manitoba-occurring-scratch.trycloudflare.com"

# Project images
img_names = [
    "asset_3106e08099f9-Nh-n-di-n-ng--i-m-u.png",
    "asset_558e078dec9e-Trang-ph-c-1.png",
    "asset_53d2b4807987-Trang-ph-c-2.png",
    "asset_e4f27c84e82f-Trang-ph-c-3.png",
    "asset_27d95ae5ebbd-Trang-ph-c-4.png",
    "asset_065aca5f1622-Trang-ph-c-5.png"
]

images = [f"{public_url}/api/files/prj_a9c0d8476382/{name}" for name in img_names]

# Get prompt from prj_a9c0d8476382 graph
row = c.execute("SELECT data FROM graphs WHERE project_id='prj_a9c0d8476382'").fetchone()
graph = json.loads(row[0])
prompt_text = ""
for n in graph.get('nodes', []):
    if n.get('id') == 'script':
        prompt_text = n.get('data', {}).get('text') or n.get('data', {}).get('prompt')

print("Prompt length:", len(prompt_text))
print("Images count:", len(images))

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# Try submitting to seedance2.0 线路二 with 1 image
payload = {
    "model": "seedance2.0 线路二",
    "prompt": prompt_text,
    "images": [images[0]],
    "seconds": "15"
}

print("Submitting to seedance2.0 线路二 with 1 image...")
res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=20)
print("Status code:", res.status_code)
print("Response:", res.text)
