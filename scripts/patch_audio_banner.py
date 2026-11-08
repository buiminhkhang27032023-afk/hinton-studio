path = 'd:/phim ai thời trang/components/canvas/nodes.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_block = '''          {/* Audio Connection Banner nếu có nối audio */}
          {audioTags.length > 0 && (
            <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10.5px]">
              <Volume2 size={13} className="text-cyan-400 shrink-0" />
              <span className="font-semibold text-cyan-300 shrink-0">Lồng tiếng:</span>
              <span className="truncate flex-1 text-white/90" title={audioTags[0].name}>
                {audioTags[0].name}
              </span>
              <button
                type="button"
                onClick={() => {
                  const cur = nodeData.prompt ?? "";
                  const tag = "[@Audio 1]";
                  if (!cur.includes(tag)) update({ prompt: `${cur} ${tag}` });
                }}
                className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 font-mono text-[9px] shrink-0"
                title="Chèn [@Audio 1] vào câu lệnh"
              >
                + Gắn vào Prompt
              </button>
            </div>
          )}'''

new_block = '''          {/* Audio Connection Banner nếu có nối audio */}
          {audioTags.length > 0 && (
            <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-[10.5px]">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 truncate">
                  <Volume2 size={13} className="text-cyan-400 shrink-0" />
                  <span className="font-semibold text-cyan-300">
                    {(nodeData.audioMode ?? "reference") === "mux" ? "Lồng tiếng (Mux):" : "Tham chiếu âm thanh (Guidance):"}
                  </span>
                  <span className="text-white/70 text-[10px]">({audioTags.length} audio)</span>
                </div>
                <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => update({ audioMode: "reference" })}
                    className={clsx(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-medium transition",
                      (nodeData.audioMode ?? "reference") === "reference"
                        ? "bg-cyan-500/30 text-cyan-200 border border-cyan-500/40"
                        : "text-white/50 hover:text-white/80"
                    )}
                    title="Chỉ dùng làm căn cứ tham chiếu cho Seedance/AI diễn xuất và khẩu hình, không đè tiếng gốc"
                  >
                    Tham chiếu AI
                  </button>
                  <button
                    type="button"
                    onClick={() => update({ audioMode: "mux" })}
                    className={clsx(
                      "px-1.5 py-0.5 rounded text-[9.5px] font-medium transition",
                      nodeData.audioMode === "mux"
                        ? "bg-amber-500/30 text-amber-200 border border-amber-500/40"
                        : "text-white/50 hover:text-white/80"
                    )}
                    title="Dùng FFmpeg ghép file âm thanh này đè vào video cuối"
                  >
                    Ghép tiếng
                  </button>
                </div>
              </div>

              {/* Danh sách các tag audio để click gắn nhanh vào prompt */}
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                <span className="text-[10px] text-white/50">Gắn vào prompt:</span>
                {audioTags.map((tag, idx) => {
                  const tagStr = `[@Audio ${idx + 1}]`;
                  const isIncluded = (nodeData.prompt ?? "").includes(tagStr);
                  return (
                    <button
                      key={tag.id || idx}
                      type="button"
                      onClick={() => {
                        const cur = nodeData.prompt ?? "";
                        if (!isIncluded) update({ prompt: `${cur} ${tagStr}`.trim() });
                      }}
                      className={clsx(
                        "px-1.5 py-0.5 rounded font-mono text-[9px] flex items-center gap-1 transition",
                        isIncluded
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                      )}
                      title={`Thêm ${tagStr} (${tag.name}) vào câu lệnh`}
                    >
                      <span>{tagStr}</span>
                      <span className="text-[8px] opacity-70 max-w-[70px] truncate">{tag.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}'''

c_norm = content.replace('\r\n', '\n')
old_norm = old_block.replace('\r\n', '\n')
new_norm = new_block.replace('\r\n', '\n')

if old_norm in c_norm:
    c_norm = c_norm.replace(old_norm, new_norm, 1)
    with open(path, 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(c_norm.replace('\n', '\r\n'))
    print('SUCCESS: Updated nodes.tsx!')
else:
    print('ERROR: old_norm not found in content!')
