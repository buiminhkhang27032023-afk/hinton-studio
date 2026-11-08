with open('components/canvas/nodes.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'kind: activeHistory.kind,' in line:
        lines[i] = '                    kind: (activeHistory.kind || "video") as "video" | "image",\n'
    if 'name: activeHistory.label || `Phiên bản v${selectedVersionIdx + 1}`,' in line:
        lines[i] = '                    name: activeHistory.label || activeHistory.name || `Phiên bản v${selectedVersionIdx + 1}`,\n'
    if 'export interface ImageTag {' in line:
        lines[i] = 'export interface ImageTag {\n  label: string;\n  preview?: string;\n  name?: string;\n  id?: string;\n}\n'
        lines[i+1] = ''
        lines[i+2] = ''
        lines[i+3] = ''
    if 'return [{ label: `Ảnh${index + 1}`, preview }];' in line:
        lines[i] = '    const name = sourceData.name || (source.data as { label?: string })?.label || `Ảnh ${index + 1}`;\n    return [{ label: `Ảnh${index + 1}`, preview, name, id: source.id }];\n'

with open('components/canvas/nodes.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Updated nodes.tsx successfully via script!')
