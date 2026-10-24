import urllib.request
import json

url = "https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/models_registry.json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode())

targets = [
    'kling-v2.6-pro/image-to-video',
    'kling-video-o1/image-to-video',
    'minimax/hailuo-2.3/image-to-video-pro',
    'minimax/hailuo-2.3/i2v-standard',
    'alibaba/wan-2.7/image-to-video',
    'vidu/image-to-video-q3-pro',
    'rhart-video-s-official/image-to-video-realistic'
]

for ep in targets:
    m = next((x for x in data if x.get('endpoint') == ep), None)
    if m:
        print(f"\n=================== {ep} ===================")
        print("Name:", m.get('name_cn') or m.get('display_name'))
        for p in m.get('params', []):
            field = p.get('fieldKey')
            ptype = p.get('type')
            req = p.get('required')
            dval = p.get('defaultValue')
            opts = [o.get('value') for o in p.get('options', [])] if p.get('options') else None
            print(f"  - {field} ({ptype}, req={req}): default={dval}, options={opts}")
