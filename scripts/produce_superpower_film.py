import sqlite3
import json
import requests
import time
import os
import subprocess

PROJECT_ID = "prj_superpower_20s"
BASE_DIR = "d:/phim ai thời trang"
ASSET_DIR = f"{BASE_DIR}/data/assets/{PROJECT_ID}"
os.makedirs(ASSET_DIR, exist_ok=True)

# 1. Connect to DB and get settings
conn = sqlite3.connect(f"{BASE_DIR}/data/studio.db")
c = conn.cursor()
settings = dict(c.execute("SELECT key, value FROM settings").fetchall())
rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
api_key = rh_cfg.get('apiKey')
base_url = "https://www.runninghub.cn/openapi/v2"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Host": "www.runninghub.cn"
}

def upload_to_rh(local_path, filename):
    print(f"Uploading {filename} to RunningHub...")
    with open(local_path, "rb") as f:
        files = {"file": (filename, f, "image/jpeg")}
        res = requests.post(f"{base_url}/media/upload/binary", headers=headers, files=files, timeout=30)
        data = res.json()
        if data.get('code') != 0:
            raise Exception(f"Upload failed: {data}")
        url = data['data']['download_url']
        print(f"  -> Uploaded: {url[:80]}...")
        return url

def run_wan_i2v(img_url, prompt, duration="5", resolution="720p"):
    payload = {
        "imageUrl": img_url,
        "prompt": prompt,
        "duration": str(duration),
        "resolution": resolution,
        "shotType": "single"
    }
    print(f"Submitting Wan 2.6 i2v...")
    res = requests.post(f"{base_url}/alibaba/wan-2.6/image-to-video", headers=headers, json=payload, timeout=30)
    data = res.json()
    task_id = data.get('taskId')
    if not task_id:
        raise Exception(f"Submit error: {data}")
    print(f"  -> Task ID: {task_id}, polling...")
    start = time.time()
    while time.time() - start < 300:
        time.sleep(5)
        poll_res = requests.post(f"{base_url}/query", headers=headers, json={"taskId": task_id}, timeout=10)
        pdata = poll_res.json()
        st = pdata.get('status')
        elapsed = int(time.time() - start)
        print(f"     [{elapsed}s] Status: {st}")
        if st == 'SUCCESS':
            video_url = pdata['results'][0]['url']
            print(f"  -> Video ready: {video_url}")
            return video_url
        if st in ['FAILED', 'CANCEL']:
            raise Exception(f"Task failed: {pdata}")
    raise Exception("Polling timed out!")

def download_file(url, out_path):
    print(f"Downloading {url[:60]}... to {out_path}")
    res = requests.get(url, stream=True, timeout=60)
    res.raise_for_status()
    with open(out_path, "wb") as f:
        for chunk in res.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"  -> Saved {os.path.getsize(out_path)} bytes.")

# Assets paths
path_nam_1 = f"{BASE_DIR}/data/assets/_library/asset_0sx4le5m-nam_chinh_1.jpg"
path_nam_2 = f"{BASE_DIR}/data/assets/_library/asset_zfkvnstf-nam_chinh_2.jpg"
path_tryon_nu = f"{ASSET_DIR}/asset_07134c809a66-Th-----AI--N--ch-nh---V-y-d--h-i-h-ng.jpg"

# Shot 1 is already finished!
shot1_remote_url = "https://rh-images-1252422369.cos.ap-beijing.myqcloud.com/43eec6d9fadedca43f92aba8168e7293/output/d031b793-e079-47f1-9963-45485000225c.mp4"
shot1_local = f"{ASSET_DIR}/shot_1_tam_bao.mp4"
if not os.path.exists(shot1_local):
    download_file(shot1_remote_url, shot1_local)

# Shot 2: Nam chính 1 (Áo đen - Lôi Hỏa)
shot2_local = f"{ASSET_DIR}/shot_2_loi_hoa.mp4"
if not os.path.exists(shot2_local):
    print("\n=== GENERATING SHOT 2: NAM CHÍNH 1 (LÔI HỎA BÙNG NỔ) ===")
    nam1_url = upload_to_rh(path_nam_1, "nam_chinh_1.jpg")
    p2 = "Cinematic 5s superhero action shot, low-angle slow-motion camera pan. The muscular Asian man in black polo shirt clenches his fists as blazing crimson lightning and fiery sparks erupt around his muscular body, eyes glowing fiery red with intense determination, crackling ground embers, heat distortion, 8k IMAX cinematography."
    shot2_remote = run_wan_i2v(nam1_url, p2)
    download_file(shot2_remote, shot2_local)
else:
    print("Shot 2 already exists!")

# Shot 3: Nam chính 2 (Suit xám - Từ trường & Va chạm siêu năng lực)
shot3_local = f"{ASSET_DIR}/shot_3_doi_dau.mp4"
if not os.path.exists(shot3_local):
    print("\n=== GENERATING SHOT 3: NAM CHÍNH 2 (ĐỐI ĐẦU NĂNG LƯỢNG) ===")
    nam2_url = upload_to_rh(path_nam_2, "nam_chinh_2.jpg")
    p3 = "Epic 5s superhero battle clash, dynamic 180-degree camera rotation. The handsome Asian man in dark suit raises his hand projecting a massive luminous cyan telekinetic gravity shield. In the foreground, crimson fire-lightning beams crash into the cyan gravity barrier, creating a blinding explosion of electrical shockwaves, shattering stone pillars, Hollywood visual effects, photorealistic 8k."
    shot3_remote = run_wan_i2v(nam2_url, p3)
    download_file(shot3_remote, shot3_local)
else:
    print("Shot 3 already exists!")

# Shot 4: Nữ chính (Váy dạ hội hồng - Nữ quyền thức tỉnh & Hào quang chế ngự)
shot4_local = f"{ASSET_DIR}/shot_4_thuc_tinh.mp4"
if not os.path.exists(shot4_local):
    print("\n=== GENERATING SHOT 4: NỮ CHÍNH (NỮ QUYỀN THỨC TỈNH) ===")
    nu_url = upload_to_rh(path_tryon_nu, "nu_chinh_vay_hong.jpg")
    p4 = "Cinematic 5s dramatic climax shot, crane down to medium close-up. The stunning Asian woman in the dusty rose silk evening gown steps majestically into the center, raising both hands as a dazzling celestial golden-white aura erupts and expands outwards, instantly freezing and absorbing both red and blue superpowers. Her hair and pink gown flutter with goddess grace. Epic film finale, shallow depth of field, 8k."
    shot4_remote = run_wan_i2v(nu_url, p4)
    download_file(shot4_remote, shot4_local)
else:
    print("Shot 4 already exists!")

print("\nALL 4 SHOTS ARE GENERATED SUCCESSFULLY!")
