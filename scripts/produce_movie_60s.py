import os
import sys
import time
import json
import uuid
import sqlite3
import requests
import subprocess

# Retired: this script bypassed durable app jobs and could submit an entire
# batch again on restart. Keep it inert; generation must use /api/run.
raise SystemExit('Legacy batch submission is disabled. Use the Studio canvas with its duplicate-task lock.')

PROJECT_ID = 'prj_1507511d78c4'
BASE_DIR = r'd:\phim ai thời trang'
ASSET_DIR = os.path.join(BASE_DIR, 'data', 'assets', PROJECT_ID)
DB_PATH = os.path.join(BASE_DIR, 'data', 'studio.db')

os.makedirs(ASSET_DIR, exist_ok=True)

# Connect DB
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
settings = dict(c.execute('SELECT key, value FROM settings').fetchall())
if json.loads(settings.get('model_calls_paused', 'false')):
    print('Model/API calls are paused by the user. No request sent.')
    sys.exit(0)

rh_cfg = json.loads(settings.get('provider_runninghub', '{}'))
ioo_cfg = json.loads(settings.get('provider_iooai', '{}'))

rh_key = rh_cfg.get('apiKey')
ioo_key = ioo_cfg.get('apiKey')

if not rh_key or not ioo_key:
    print('Error: Missing API keys for RunningHub or IOOAI')
    sys.exit(1)

rh_headers = {'Authorization': f'Bearer {rh_key}', 'Host': 'www.runninghub.cn'}
ioo_headers = {'Authorization': f'Bearer {ioo_key}', 'Content-Type': 'application/json'}

def upload_to_rh(local_filename):
    fpath = os.path.join(ASSET_DIR, local_filename)
    if not os.path.exists(fpath):
        raise FileNotFoundError(f'Not found: {fpath}')
    with open(fpath, 'rb') as fp:
        mime = 'image/jpeg' if local_filename.endswith('.jpg') else 'image/png'
        files = {'file': (local_filename, fp, mime)}
        res = requests.post('https://www.runninghub.cn/openapi/v2/media/upload/binary', headers=rh_headers, files=files, timeout=30)
        data = res.json()
        if data.get('code') != 0:
            raise RuntimeError(f'RH upload failed: {data}')
        return data['data']['download_url']

print('--- [1/4] Chuan bi anh tham chieu va CDN ---')
keyframes = {
    'video-1': 'asset_348ba6071b22-generate-06-58-37.jpg',
    'video-2': 'asset_ae616e874a51-kf-2.jpg',
    'video-3': 'asset_21a2e5e4abd0-kf-3.jpg',
    'video-4': 'asset_b8a02c7bf21d-generate-06-58-35.jpg'
}

cdn_urls = {}
for vid, kf in keyframes.items():
    print(f'Uploading {kf}...')
    url = upload_to_rh(kf)
    cdn_urls[vid] = url
    print(f' -> {vid} CDN URL: {url[:60]}...')

prompts = {
    'video-1': (
        "Phim ngắn tình cảm Việt Nam, người thật, quay như phim điện ảnh, dọc 9:16, 15 giây. "
        "Giữ đúng khuôn mặt và trang phục nhân vật Linh (áo cardigan kem, váy xanh nhạt, giày bệt trắng, túi vải be) và Nam (sơ mi xanh nhạt xắn tay, quần tây xám). Bối cảnh quán cà phê nhỏ cạnh trạm xe buýt chiều mưa Hà Nội. "
        "00–07s: Linh đứng dưới mái hiên nhìn màn mưa. Cô mở túi vải tìm ô nhưng chỉ thấy một cuốn sách, khẽ thở dài. Bên kia đường xe buýt chạy tới trạm, tiếng phanh xe rít nhẹ. "
        "07–15s: Một chiếc ô navy bật mở ngay bên cạnh cô. Linh quay lại: Nam đứng cách cô một bước, vai áo lấm tấm nước. Anh đưa cán ô về phía cô. "
        "Nam: 'Ô của em.' Lời thoại nói TIẾNG VIỆT giọng miền Bắc, tự nhiên, nhỏ nhẹ, khẩu hình khớp lời. Tiếng mưa rơi đều, ánh đèn vàng ấm áp. Không phụ đề, không logo."
    ),
    'video-2': (
        "Phim ngắn tình cảm Việt Nam, người thật, quay như phim điện ảnh, dọc 9:16, 15 giây. "
        "Giữ đúng khuôn mặt và trang phục nhân vật Linh và Nam dưới tán ô navy có miếng vá hình đám mây. "
        "00–07s: Linh chạm nhẹ ngón tay vào miếng vá hình đám mây rồi rút tay về. Nam vẫn giữ ô giữa hai người. "
        "Linh (khẽ): 'Em tưởng anh bỏ rồi.' Nam: 'Nó chỉ rách một chút.' "
        "07–15s: Linh ngước nhìn Nam. Anh hiểu câu chuyện không còn chỉ là chiếc ô, anh hạ mắt, lấy từ túi áo ra một tấm vé tàu cũ gấp đôi. "
        "Nam (trầm): 'Hôm đó anh đã đi.' Một nhịp im lặng. Nam: 'Nhưng lẽ ra anh phải nói với em.' "
        "Lời thoại nói TIẾNG VIỆT giọng miền Bắc, cảm xúc kìm nén, tiếng mưa rơi đều. Không phụ đề, không logo."
    ),
    'video-3': (
        "Phim ngắn tình cảm Việt Nam, người thật, quay như phim điện ảnh, dọc 9:16, 15 giây. "
        "Chiều mưa Hà Nội dưới mái hiên quán cà phê. "
        "00–07s: Linh không nhận tấm vé. Cô nhìn sang chiếc xe buýt đang mở cửa đợi khách bên kia đường. "
        "Linh (giọng nghẹn): 'Em đã chờ một cuộc gọi.' Nam: 'Anh biết. Anh xin lỗi.' Nam cất vé lại vào túi áo, lùi nửa bước để cô có thể đi. "
        "07–15s: Cửa xe buýt đóng lại, xe từ từ rời trạm. Linh bước xuống bậc hiên ra mưa. Nam đưa chiếc ô cho cô, còn mình đứng lại dưới mái che. "
        "Nam: 'Em cầm đi. Anh đợi tạnh.' Linh cầm cán ô nhưng chưa đi, đứng lặng dưới mưa. "
        "Lời thoại nói TIẾNG VIỆT, diễn xuất tinh tế. Không phụ đề, không logo."
    ),
    'video-4': (
        "Phim ngắn tình cảm Việt Nam, người thật, quay như phim điện ảnh, dọc 9:16, 15 giây. "
        "00–07s: Linh quay lại, nâng ô về phía Nam. Anh ngước lên. Cô dịch sang một bên, chừa chỗ dưới tán ô. "
        "Linh: 'Quán còn mở.' Ngừng nhẹ. Linh: 'Anh có muốn nói cho hết không?' "
        "07–15s: Nam bước tới dưới tán ô. Hai người cùng đi vào quán, chưa nắm tay. Tiếng chuông cửa quán leng keng. "
        "Qua cửa kính mờ hơi nước: bên trong ánh đèn vàng, Linh kéo chiếc ghế đối diện mình ra, Nam ngồi xuống. Nhạc piano nhẹ nhàng bắt đầu, kết thúc ấm áp. "
        "Lời thoại nói TIẾNG VIỆT giọng miền Bắc, chân thực 100%. Không phụ đề, không logo."
    )
}

print('\n--- [2/4] Gui 4 phan doan len IOOAI Seedance ---')
tasks = {}

for vid in ['video-1', 'video-2', 'video-3', 'video-4']:
    payload = {
        'model': 'seedance2.0 线路二',
        'prompt': prompts[vid],
        'images': [cdn_urls[vid]],
        'seconds': '15',
        'ratio': '9:16'
    }
    r = requests.post('https://api.iooai.cn/v1/videos', headers=ioo_headers, json=payload, timeout=25)
    if r.status_code == 200:
        res = r.json()
        task_id = res.get('id')
        tasks[vid] = {'task_id': task_id, 'status': 'queued'}
        print(f' -> {vid} submit OK: task_id={task_id}')
        
        # Save to jobs table
        job_id = f'job_{vid}_{uuid.uuid4().hex[:8]}'
        c.execute('''INSERT OR REPLACE INTO jobs (id, project_id, node_id, kind, model, status, input, provider_job, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (job_id, PROJECT_ID, vid, 'video', 'seedance2.0 线路二', 'running', json.dumps(payload), task_id, int(time.time()*1000), int(time.time()*1000)))
        conn.commit()
    else:
        print(f' -> {vid} submit FAILED {r.status_code}: {r.text}')

# Update graph status to running
graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', (PROJECT_ID,)).fetchone()[0]
g = json.loads(graph_raw)
for n in g.get('nodes', []):
    if n['id'] in tasks:
        n['data']['status'] = 'running'
        n['data']['error'] = None
c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), PROJECT_ID))
conn.commit()

print('\n--- [3/4] Theo doi tien do va tai video hoan thien ---')
finished_files = {}

start_time = time.time()
while len(finished_files) < len(tasks):
    all_done = True
    for vid, info in tasks.items():
        if vid in finished_files:
            continue
        tid = info['task_id']
        try:
            r = requests.get(f'https://api.iooai.cn/v1/videos/{tid}', headers=ioo_headers, timeout=15)
            if r.status_code == 200:
                data = r.json()
                status = data.get('status')
                progress = data.get('progress', 0)
                info['status'] = status
                print(f'[{time.strftime("%H:%M:%S")}] {vid} ({tid}) -> {status} ({progress}%)')
                
                if status in ['succeeded', 'completed', 'done', 'success']:
                    v_url = data.get('video_url') or data.get('url') or (data.get('videos', [{}])[0].get('url'))
                    if v_url:
                        print(f' >>> {vid} FINISHED! Downloading from {v_url}...')
                        v_bytes = requests.get(v_url, timeout=120).content
                        fname = f'{vid}-seedance-15s.mp4'
                        fpath = os.path.join(ASSET_DIR, fname)
                        with open(fpath, 'wb') as fp:
                            fp.write(v_bytes)
                        
                        asset_id = f'asset_{uuid.uuid4().hex[:12]}'
                        rel_url = f'/api/files/{PROJECT_ID}/{fname}'
                        now_ms = int(time.time() * 1000)
                        
                        c.execute('''INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                                  (asset_id, PROJECT_ID, fname, 'video', 'video/mp4', rel_url, json.dumps({'model': 'seedance2.0 线路二', 'task_id': tid}), now_ms))
                        
                        # Update graph node
                        for n in g.get('nodes', []):
                            if n['id'] == vid:
                                n['data']['status'] = 'done'
                                n['data']['videoUrl'] = rel_url
                                n['data']['result'] = {
                                    'id': asset_id,
                                    'projectId': PROJECT_ID,
                                    'name': fname,
                                    'kind': 'video',
                                    'mime': 'video/mp4',
                                    'url': rel_url,
                                    'createdAt': now_ms
                                }
                        c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), PROJECT_ID))
                        conn.commit()
                        finished_files[vid] = fpath
                        print(f' >>> {vid} SAVED to {fpath}')
                elif status in ['failed', 'error', 'cancelled']:
                    err_msg = data.get('error', {}).get('message') or data.get('error') or status
                    print(f' !!! {vid} FAILED: {err_msg}')
                    finished_files[vid] = None
        except Exception as poll_err:
            print(f'Poll exception for {vid}: {poll_err}')
    
    if len(finished_files) < len(tasks):
        time.sleep(15)

print('\n--- [4/4] Tong hop va ghep thanh phim 60s hoan chinh ---')
valid_parts = [finished_files[f'video-{i}'] for i in range(1, 5) if finished_files.get(f'video-{i}')]

if len(valid_parts) == 4:
    concat_txt = os.path.join(ASSET_DIR, 'concat_list.txt')
    with open(concat_txt, 'w', encoding='utf-8') as fp:
        for p in valid_parts:
            # Escape path for ffmpeg
            clean_p = p.replace('\\', '/')
            fp.write(f"file '{clean_p}'\n")
    
    output_full = os.path.join(ASSET_DIR, 'chiec_o_de_quen_full_60s.mp4')
    cmd = ['ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', concat_txt, '-c', 'copy', output_full]
    subprocess.run(cmd, check=True)
    print(f'Master film rendered: {output_full}')
    
    rel_full = f'/api/files/{PROJECT_ID}/chiec_o_de_quen_full_60s.mp4'
    now_ms = int(time.time() * 1000)
    full_asset_id = f'asset_{uuid.uuid4().hex[:12]}'
    
    c.execute('''INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
              (full_asset_id, PROJECT_ID, 'chiec_o_de_quen_full_60s.mp4', 'video', 'video/mp4', rel_full, json.dumps({'type': 'full_movie', 'duration': 60}), now_ms))
    
    # Check if a result node or master video node exists
    for n in g.get('nodes', []):
        if n['id'] in ['result-1', 'result-2', 'result-3', 'result-4']:
            n['data']['status'] = 'done'
            n['data']['result'] = {
                'id': full_asset_id,
                'projectId': PROJECT_ID,
                'name': 'Chiếc Ô Để Quên (Full 60s)',
                'kind': 'video',
                'mime': 'video/mp4',
                'url': rel_full
            }
    c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), PROJECT_ID))
    conn.commit()
    print('Project prj_1507511d78c4 is 100% COMPLETE!')
else:
    print('Some parts could not be completed:', finished_files)
