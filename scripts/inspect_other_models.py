import urllib.request
import json

url = "https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/models_registry.json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode())

targets = [
    'pixverse-v6/image-to-video',
    'vidu/image-to-video-q2-turbo',
    'vidu/image-to-video-q2-pro',
    'rhart-video-s-official/image-to-video-realistic'
]

for ep in targets:
    m = next((x for x in data if x.get('endpoint') == ep), None)
    if m:
        print(f"\n=================== {ep} ===================")
        print("Name:", m.get('name_cn') or m.get('display_name'))
        for p in m.get('params', []):
            print(f"  - {p.get('fieldKey')} ({p.get('type')}, req={p.get('required')}): default={p.get('defaultValue')}")
