import urllib.request

url = "https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/core/task.py"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    lines = resp.read().decode().splitlines()
    for i, line in enumerate(lines[308:350], 309):
        print(f"{i}: {line}")
