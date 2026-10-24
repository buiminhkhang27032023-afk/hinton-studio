import urllib.request
import json

url = "https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/models_registry.json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode())

for ep in ['rhart-video/sparkvideo-2.0-fast/text-to-video', 'rhart-video/sparkvideo-2.0-fast/image-to-video', 'alibaba/wan-2.6/text-to-video']:
    m = next((x for x in data if x.get('endpoint') == ep), None)
    if m:
        print(f"\nEndpoint: {ep}")
        print("Params:", json.dumps(m.get('params'), indent=2))
