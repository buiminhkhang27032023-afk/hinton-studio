with open('components/canvas/nodes.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if '{/* Chi phí ước tính badge */}' in line:
        lines[i] = '            {/* Bộ đếm ký tự & Chi phí ước tính badge (chuẩn Ảnh 1) */}\n'
        # find the next span
        if 'className="text-[10px] text-neutral-400 font-mono ml-auto"' in lines[i+1]:
            lines[i+1] = '''            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono ml-auto">
              <span
                className={clsx(
                  (nodeData.prompt ?? "").length > 2000
                    ? "text-rose-400 font-bold"
                    : (nodeData.prompt ?? "").length > 1700
                      ? "text-amber-400"
                      : "text-white/40",
                )}
                title="Số ký tự hiện tại / Tối đa 2.000 ký tự"
              >
                {(nodeData.prompt ?? "").length}/2000
              </span>
              <span>{model?.id?.includes("seedance") ? "🪙 1.8 Tệ" : model?.id?.includes("minimax") ? "🪙 1.3 Tệ" : "⚡ Ready"}</span>
            </div>\n'''
            lines[i+2] = ''
            lines[i+3] = ''
            break

with open('components/canvas/nodes.tsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Updated counter successfully!')
