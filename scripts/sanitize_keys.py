import os
import re

tts_path = r"d:\phim ai thời trang\app\api\audio\tts\route.ts"
with open(tts_path, "r", encoding="utf-8") as f:
    c = f.read()

target = """        if (!apiKey) {
          apiKey = "YOUR_ELEVENLABS_KEY";
        }"""

replacement = """        if (!apiKey) {
          const providerKey = db.prepare("SELECT value FROM settings WHERE key = 'provider_elevenlabs'").get() as { value: string } | undefined;
          if (providerKey?.value) {
            try {
              const p = JSON.parse(providerKey.value);
              apiKey = p.apiKey || p.key || "";
            } catch {
              apiKey = providerKey.value;
            }
          }
        }"""

if target in c:
    c = c.replace(target, replacement)
    with open(tts_path, "w", encoding="utf-8") as f:
        f.write(c)
    print("Sanitized app/api/audio/tts/route.ts")
else:
    print("Target not found in app/api/audio/tts/route.ts")

# Also check scripts with hardcoded keys
scripts_dir = r"d:\phim ai thời trang\scripts"
for fname in os.listdir(scripts_dir):
    fpath = os.path.join(scripts_dir, fname)
    if not os.path.isfile(fpath):
        continue
    try:
        with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        modified = False
        if "sk_30ecc" in content:
            content = re.sub(r'sk_30ecc[a-zA-Z0-9_-]+', 'YOUR_ELEVENLABS_KEY', content)
            modified = True
        if "sk-stali" in content:
            content = re.sub(r'sk-stali[a-zA-Z0-9_-]+', 'YOUR_STALI_KEY', content)
            modified = True
        if "sk-lU56" in content:
            content = re.sub(r'sk-lU56[a-zA-Z0-9_-]+', 'YOUR_IOOAI_KEY', content)
            modified = True
        if "YOUR_DUOMI_KEY" in content:
            content = content.replace("YOUR_DUOMI_KEY", "YOUR_DUOMI_KEY")
            modified = True
        if modified:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"Sanitized {fname}")
    except Exception as e:
        pass
