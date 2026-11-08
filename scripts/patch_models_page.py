# 1. Patch app/(studio)/models/page.tsx
with open('app/(studio)/models/page.tsx', 'r', encoding='utf-8') as f:
    t = f.read().replace('\r\n', '\n')

t = t.replace('chat: "Chat / phân tích",\n};', 'chat: "Chat / phân tích",\n  audio: "Âm thanh",\n  voice: "Giọng nói",\n};')
t = t.replace('chat: "default",\n};', 'chat: "default",\n  audio: "brass",\n  voice: "brass",\n};')

with open('app/(studio)/models/page.tsx', 'w', encoding='utf-8') as f:
    f.write(t)

# 2. Patch components/canvas/nodes.tsx
with open('components/canvas/nodes.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'name: activeHistory.label || activeHistory.name' in line:
        if lines[i+1].strip() == '},':
            lines[i+1] = '                  } as any,\n'

with open('components/canvas/nodes.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Patched successfully via script!')
