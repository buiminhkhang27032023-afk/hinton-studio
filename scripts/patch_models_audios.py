with open('d:/phim ai thời trang/lib/models.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Update seedance 2.0 fast, seedance 2.0 满血, seedance2.5 官渠
old_str = '"images": "{{images}}"'
# We want to replace where model is seedance
import re
def replacer(match):
    return match.group(0).replace('"images": "{{images}}"', '"images": "{{images}}",\n        "audios": "{{audios}}"')

new_text = re.sub(r'("model":\s*"seedance[^"]*",[\s\S]*?"images":\s*"{{images}}")', replacer, text)

with open('d:/phim ai thời trang/lib/models.ts', 'w', encoding='utf-8') as f:
    f.write(new_text)

print('Done patching models.ts')
