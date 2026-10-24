import urllib.request
import json

url = "https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/models_registry.json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode())

matches = [m for m in data if any(k in str(m).lower() for k in ['lipsync', 'liveportrait', 'musetalk', 'sadtalker', 'wav2lip', 'audio2video', 'talking'])]
print(f"Talking head / Lip sync models: {len(matches)}")
for m in matches:
    print(f"- {m.get('name_cn') or m.get('display_name')} -> {m.get('endpoint')}")
