import urllib.request
import json

url = "https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/models_registry.json"
try:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print(f"Loaded registry! Total models: {len(data)}")
        # Look for video or wan or seedance models
        for item in data[:30]:
            print(f"- {item.get('name')} | id={item.get('id')} | category={item.get('category')} | endpoint={item.get('endpoint') or item.get('api_endpoint')}")
        # Search wan or seedance or kling
        matches = [m for m in data if any(k in str(m).lower() for k in ['wan', 'kling', 'seedance', 'hailuo', 'video'])]
        print(f"\nMatching video models ({len(matches)}):")
        for m in matches[:15]:
            print(f"  * {m.get('name')} | endpoint={m.get('endpoint') or m.get('api_path') or m.get('url')}")
            print("    Keys:", list(m.keys()))
except Exception as e:
    print("Error fetching models_registry.json:", e)
