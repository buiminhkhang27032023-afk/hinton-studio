import sqlite3
import json
import requests

db = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = db.cursor()
settings = dict(c.execute('SELECT key, value FROM settings').fetchall())
ioo_cfg = json.loads(settings.get('provider_iooai', '{}'))
api_key = ioo_cfg.get('apiKey')
headers = {'Authorization': f'Bearer {api_key}'}

tasks = {
    'video-1': 'task_wgqYrKy2EtD47sHSG6schKbpcFeJoAu8',
    'video-2': 'task_L4dA3Rx9hQJ3zM4ekk4XiA6ta7xQOw16',
    'video-3': 'task_nYLhyDpS2hA2a5WdtBYlqfqje1itKalj',
    'video-4': 'task_2e6AXD5Ub6IFTLZlrRGUe3IAVqcxAjC0'
}

print(f"Using API Key: {api_key[:6]}...{api_key[-4:] if api_key else 'None'}")
for name, tid in tasks.items():
    try:
        r = requests.get(f'https://api.iooai.cn/v1/videos/{tid}', headers=headers, timeout=15)
        print(f"[{name}] {tid}: HTTP {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            status = data.get('status')
            progress = data.get('progress')
            video_url = data.get('video_url') or data.get('url') or (data.get('videos', [{}])[0].get('url'))
            error = data.get('error')
            print(f"  status: {status}, progress: {progress}%")
            if video_url:
                print(f"  video_url: {video_url}")
            if error:
                print(f"  error: {error}")
        else:
            print(f"  response: {r.text}")
    except Exception as e:
        print(f"  exception: {e}")
