import urllib.request

url = "https://raw.githubusercontent.com/HM-RunningHub/ComfyUI_RH_OpenAPI/main/core/upload.py"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as resp:
    lines = resp.read().decode().splitlines()
    for i, line in enumerate(lines[40:80], 41):
        print(f"{i}: {line}")
