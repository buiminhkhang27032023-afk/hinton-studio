import sqlite3
import json
import requests
import time
import os

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
iooai_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = iooai_cfg.get('apiKey')
base_url = "https://api.iooai.cn/v1"

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

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

payload = {
    "model": "omni_flash_10s",
    "prompt": prompt_text,
    "images": images,
    "seconds": "10",
    "ratio": "9:16",
    "resolution": "720p"
}

print("Submitting to omni_flash_10s with 6 images...")
res = requests.post(f"{base_url}/videos", headers=headers, json=payload, timeout=20)
print("Status code:", res.status_code)
print("Response:", res.text)

if res.status_code == 200:
    tid = res.json().get('id')
    dest_dir = r"d:\phim ai thời trang\data\assets\prj_a9c0d8476382"
    dest_file = os.path.join(dest_dir, "lookbook_omni_multi_outfit_10s.mp4")
    print(f"Task ID: {tid}, polling...")

    for i in range(35):
        time.sleep(5)
        p = requests.get(f"{base_url}/videos/{tid}", headers=headers, timeout=10).json()
        st = p.get('status')
        prog = p.get('progress')
        print(f"[{i+1}] Status: {st}, Progress: {prog}%")
        if st == 'completed':
            vurl = p.get('output_url') or p.get('video_url') or (p.get('videos', [{}])[0].get('url'))
            print("SUCCESS! Video URL:", vurl)
            if vurl:
                vres = requests.get(vurl, timeout=60)
                with open(dest_file, "wb") as f:
                    f.write(vres.content)
                print(f"Saved to {dest_file} ({len(vres.content)} bytes)")

                # Update studio.db graph and assets
                asset_id = "asset_lookbook_omni_10s"
                c.execute("""
                    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, size, path, meta, created_at, updated_at)
                    VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?, ?, ?)
                """, (
                    asset_id,
                    'prj_a9c0d8476382',
                    'Lookbook-Omni-Multi-10s',
                    len(vres.content),
                    'lookbook_omni_multi_outfit_10s.mp4',
                    json.dumps({'model': 'omni_flash_10s', 'duration': 10}),
                    int(time.time() * 1000),
                    int(time.time() * 1000)
                ))

                # Update graph result and video node
                for n in graph.get('nodes', []):
                    if n.get('id') == 'video':
                        n['data']['status'] = 'succeeded'
                        n['data']['modelId'] = 'iooai:omni_flash_10s'
                    if n.get('id') == 'result':
                        n['data']['status'] = 'succeeded'
                        n['data']['result'] = {
                            'id': asset_id,
                            'projectId': 'prj_a9c0d8476382',
                            'name': 'Lookbook-Omni-Multi-10s',
                            'kind': 'video',
                            'mime': 'video/mp4',
                            'url': f"/api/files/prj_a9c0d8476382/lookbook_omni_multi_outfit_10s.mp4",
                            'size': len(vres.content)
                        }
                c.execute("UPDATE graphs SET data = ?, updated_at = ? WHERE project_id='prj_a9c0d8476382'",
                          (json.dumps(graph), int(time.time() * 1000)))
                conn.commit()
                print("Canvas prj_a9c0d8476382 updated with new video!")
            break
        elif st in ['failed', 'error', 'cancelled']:
            print("Failed:", p)
            break
