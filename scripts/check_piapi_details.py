import requests
import json
import sqlite3

c = sqlite3.connect('d:/phim ai thời trang/data/studio.db').cursor()
cfg = json.loads(dict(c.execute('SELECT key, value FROM settings').fetchall())['provider_piapi'])

res = requests.post(
    'https://api.piapi.ai/api/v1/task',
    headers={'X-API-Key': cfg['apiKey'], 'Content-Type': 'application/json'},
    json={
        'model': 'seedance',
        'task_type': 'seedance-2-fast-less-restriction',
        'input': {
            'prompt': 'A cinematic video of a woman walking',
            'mode': 'text_to_video',
            'duration': 5,
            'aspect_ratio': '16:9'
        }
    }
)
print("Response JSON:")
print(json.dumps(res.json(), indent=2))
