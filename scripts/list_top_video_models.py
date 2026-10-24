import urllib.request
import json

url = "https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/models_registry.json"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode())

video_models = [m for m in data if m.get('output_type') == 'video' or 'video' in m.get('category', '').lower() or 'video' in m.get('endpoint', '').lower()]
print(f"Total video models: {len(video_models)}")

categories = {}
for m in video_models:
    cat = m.get('category', 'Other')
    if cat not in categories:
        categories[cat] = []
    categories[cat].append({
        'name': m.get('name_cn') or m.get('display_name') or m.get('name_en'),
        'endpoint': m.get('endpoint'),
        'class': m.get('class_name')
    })

for cat, models in sorted(categories.items()):
    print(f"\n=== Category: {cat} ({len(models)} models) ===")
    for m in models[:10]:
        print(f"  * {m['name']} -> {m['endpoint']}")
    if len(models) > 10:
        print(f"  ... and {len(models)-10} more")
