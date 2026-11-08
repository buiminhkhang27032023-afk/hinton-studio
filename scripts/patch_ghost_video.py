import os

path = r'd:\phim ai thời trang\lib\execute.ts'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

target = """      video: inputs.videoUrl ?? (data.videoUrl as string | undefined),
      videoUrl: inputs.videoUrl ?? (data.videoUrl as string | undefined),
      audio: inputs.audioUrl ?? (data.audioUrl as string | undefined),
      audioUrl: inputs.audioUrl ?? (data.audioUrl as string | undefined),"""

replacement = """      video: inputs.videoUrl,
      videoUrl: inputs.videoUrl,
      audio: inputs.audioUrl,
      audioUrl: inputs.audioUrl,"""

target_norm = target.replace('\r\n', '\n')
c_norm = c.replace('\r\n', '\n')

if target_norm in c_norm:
    c_new = c_norm.replace(target_norm, replacement.replace('\r\n', '\n'))
    with open(path, 'w', encoding='utf-8') as f:
        f.write(c_new)
    print("SUCCESS: Patched execute.ts to prevent ghost video/audio leakage")
else:
    print("FAILED: Target not found")
