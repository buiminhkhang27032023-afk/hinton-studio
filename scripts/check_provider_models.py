import urllib.request
import json
import sqlite3

conn = sqlite3.connect('data/studio.db')
val = conn.cursor().execute("SELECT value FROM settings WHERE key='provider'").fetchone()[0]
prov = json.loads(val)
conn.close()

base_url = prov['baseUrl']
api_key = prov['apiKey']

req = urllib.request.Request(f'{base_url}/models', headers={'Authorization': f'Bearer {api_key}'})
with urllib.request.urlopen(req) as resp:
    models = json.loads(resp.read().decode())
    for m in models.get('data', []):
        mid = m['id'].lower()
        if any(k in mid for k in ['image', 'dall', 'flux', 'omni', 'midjourney', 'sd', 'recraft', 'ideogram', 'kling']):
            print('  Model:', m['id'], 'Type:', m.get('type'), 'Display:', m.get('display_name'))
