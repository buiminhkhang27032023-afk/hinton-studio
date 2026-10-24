import urllib.request

for fname in ['core/task.py', 'core/rest.py', 'core/base.py']:
    url = f"https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/{fname}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode()
            print(f"\n=================== {fname} ===================")
            print(content[:1500])
    except Exception as e:
        print(f"Error fetching {fname}:", e)
