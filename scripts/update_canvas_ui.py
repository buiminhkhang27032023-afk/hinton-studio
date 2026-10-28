with open('d:/phim ai thời trang/components/canvas/studio-canvas.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content_norm = content.replace('\r\n', '\n')

# Find where the Panel bottom-center is
old_start = '<Panel position="bottom-center" className="!mb-3">'
old_end = '</Panel>'

idx_start = content_norm.find(old_start)
if idx_start == -1:
    print("Could not find Panel bottom-center!")
    exit(1)

idx_end = content_norm.find(old_end, idx_start) + len(old_end)
old_panel = content_norm[idx_start:idx_end]

# Also find if selectedIds >= 2 panel is right below it
after_panel = content_norm[idx_end:]
idx_group_panel = after_panel.find('{selectedIds.length >= 2 && (')

new_replacement = """            {/* TapNow-Style Left Vertical Pill Dock (Image 4) */}
            <Panel position="top-left" className="m-3">
              <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/15 bg-[#121217]/95 p-1.5 shadow-2xl backdrop-blur-md">
                {/* Quick Add Node */}
                <button
                  type="button"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    openAddAt(rect.right + 12, rect.top);
                  }}
                  title="Thêm khối mới (+)"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black hover:bg-neutral-200 transition shadow"
                >
                  <Plus size={16} strokeWidth={2.4} />
                </button>
                {/* Search / Zoom to fit */}
                <button
                  type="button"
                  onClick={() => fitView({ padding: 0.25, duration: 400 })}
                  title="Căn chỉnh toàn bộ (Fit View)"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-300 hover:bg-white/10 hover:text-white transition"
                >
                  <Search size={14} />
                </button>
                {/* Media Upload */}
                <label
                  title="Tải ảnh / video vào canvas"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-ink-300 hover:bg-white/10 hover:text-white transition"
                >
                  <Upload size={14} />
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    hidden
                    onChange={(event) => {
                      const files = event.target.files ? Array.from(event.target.files) : [];
                      if (files.length > 0) handleUploadFiles(files);
                      event.target.value = "";
                    }}
                  />
                </label>
                {/* Flova Script Director */}
                <button
                  type="button"
                  onClick={() => setScriptDirectorOpen(true)}
                  title="Đạo diễn Kịch bản Flova"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 transition border border-amber-500/30"
                >
                  <Clapperboard size={13} />
                </button>
                {/* AI Copilot */}
                <button
                  type="button"
                  onClick={() => setCopilotOpen((v) => !v)}
                  title="Trợ lý AI Copilot"
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-lg transition",
                    copilotOpen ? "bg-violet-600 text-white" : "text-violet-400 hover:bg-violet-950/50",
                  )}
                >
                  <Bot size={14} />
                </button>
                <span className="h-px w-4 bg-white/10 my-0.5" />
                {/* Undo */}
                <button
                  type="button"
                  onClick={undo}
                  title="Hoàn tác (Ctrl+Z)"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-white/10 hover:text-white transition"
                >
                  <Undo2 size={13} />
                </button>
                {/* Redo */}
                <button
                  type="button"
                  onClick={redo}
                  title="Làm lại (Ctrl+Y)"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 hover:bg-white/10 hover:text-white transition"
                >
                  <Redo2 size={13} />
                </button>
              </div>
            </Panel>

            {/* Collapsible Main Toolbar (Image 3) */}
            <Panel position="bottom-center" className="!mb-3">
              {toolbarCollapsed ? (
                /* Collapsed Compact Floating Dock */
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#121217]/95 px-3 py-1.5 shadow-[0_16px_40px_-16px_rgba(0,0,0,.85)] backdrop-blur transition-all duration-300">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                    <Sparkles size={12} className="text-amber-400" />
                    HINTON
                  </span>
                  <span className="h-3 w-px bg-white/10" />
                  <button
                    type="button"
                    onClick={() => setScriptDirectorOpen(true)}
                    className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-semibold text-amber-300 hover:bg-amber-500/25 transition border border-amber-500/30"
                    title="Đạo diễn Kịch bản Flova"
                  >
                    <Clapperboard size={11} /> Flova
                  </button>
                  <button
                    type="button"
                    onClick={runSelected}
                    disabled={!selectedId || runningAll}
                    className="rounded-full px-2 py-0.5 text-[11px] text-ink-200 hover:bg-white/10 disabled:opacity-40"
                  >
                    {tr("canvas.toolbar.run")}
                  </button>
                  <button
                    type="button"
                    onClick={runAll}
                    disabled={runningAll || !nodes.length}
                    className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1 text-[11px] font-bold text-black hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 shadow-sm"
                  >
                    {runningAll ? <Spinner /> : <Play size={10} fill="currentColor" />}
                    {tr("canvas.toolbar.runAll")}
                  </button>
                  <span className="h-3 w-px bg-white/10" />
                  <button
                    type="button"
                    onClick={() => setToolbarCollapsed(false)}
                    className="rounded-full p-1 text-ink-400 hover:bg-white/10 hover:text-white transition"
                    title="Mở rộng đầy đủ thanh công cụ (Ctrl+B)"
                  >
                    <ChevronUp size={14} />
                  </button>
                </div>
              ) : (
                /* Expanded Full Floating Dock */
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#16161c]/95 p-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,.85)] backdrop-blur transition-all duration-300">
                  <button
                    type="button"
                    onClick={(event) => {
                      const rect = event.currentTarget.getBoundingClientRect();
                      openAddAt(rect.left, rect.top - 12);
                    }}
                    className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-950 shadow"
                  >
                    <Plus size={14} />
                    {tr("canvas.add")}
                  </button>
                  <label
                    title="Tải ảnh hoặc video từ máy tính (hoặc kéo thả / Ctrl+V)"
                    className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-emerald-300 transition hover:bg-white/10"
                  >
                    <Upload size={13} />
                    Tải ảnh / video
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      hidden
                      onChange={(event) => {
                        const files = event.target.files ? Array.from(event.target.files) : [];
                        if (files.length > 0) handleUploadFiles(files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={loadFilmTemplate}
                    className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[11.5px] text-sky-200 hover:bg-white/10"
                    title="Tạo sẵn khung cảnh làm phim"
                  >
                    <Clapperboard size={12.5} />
                    Làm phim
                  </button>
                  <button
                    type="button"
                    onClick={loadFashionTemplate}
                    className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[11.5px] text-amber-200 hover:bg-white/10"
                    title="Tạo sẵn mẫu phối đồ thời trang"
                  >
                    <Shirt size={12.5} />
                    Phối đồ
                  </button>
                  <button
                    type="button"
                    onClick={() => setScriptDirectorOpen(true)}
                    className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 py-1.5 text-[11.5px] font-semibold text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:border-amber-400 hover:from-amber-500/30 hover:to-orange-500/30 hover:text-white transition"
                    title="Đạo diễn Kịch bản Flova: Đọc hiểu ngữ nghĩa, bóc tách thực thể & lập kế hoạch phân cảnh"
                  >
                    <Sparkles size={12.5} className="text-amber-400" />
                    Đạo diễn Kịch bản (Flova)
                  </button>
                  <span className="mx-0.5 h-3.5 w-px bg-white/10" />
                  <button
                    type="button"
                    onClick={() => setCopilotOpen((v) => !v)}
                    className={clsx(
                      "flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-medium transition",
                      copilotOpen
                        ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.6)]"
                        : "border border-violet-500/30 bg-violet-950/40 text-violet-200 hover:bg-violet-900/60 hover:text-white",
                    )}
                    title="Trợ lý AI phòng dựng (gemini-3.5-flash)"
                  >
                    <Bot size={12.5} className="text-violet-300" />
                    Trợ lý AI
                  </button>
                  <button
                    type="button"
                    onClick={() => setGatewaysModalOpen(true)}
                    className="flex items-center gap-1 rounded-full border border-sky-500/30 bg-sky-950/40 px-2.5 py-1.5 text-[11.5px] font-medium text-sky-200 transition hover:bg-sky-900/60 hover:text-white"
                    title="Quản lý Cổng Nối API (Bùi Hữu Thắng, DuomiAPI, IOOAI, PiAPI, RunningHub...)"
                  >
                    <PlugZap size={12.5} className="text-sky-400" />
                    Cổng API
                  </button>
                  <span className="mx-0.5 h-4 w-px bg-white/10" />
                  <button
                    type="button"
                    onClick={undo}
                    title="Hoàn tác (Ctrl+Z)"
                    className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] text-ink-300 hover:bg-white/10 hover:text-white"
                  >
                    <Undo2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    title="Làm lại (Ctrl+Y)"
                    className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] text-ink-300 hover:bg-white/10 hover:text-white"
                  >
                    <Redo2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={runSelected}
                    disabled={!selectedId || runningAll}
                    className="rounded-full px-2.5 py-1.5 text-[12px] text-ink-100 hover:bg-white/10 disabled:opacity-40"
                  >
                    {tr("canvas.toolbar.run")}
                  </button>
                  <button
                    type="button"
                    onClick={runAll}
                    disabled={runningAll || !nodes.length}
                    className="flex items-center gap-1.5 rounded-full bg-brass-500 px-3 py-1.5 text-[12px] font-medium text-ink-950 hover:bg-brass-400 disabled:opacity-40"
                  >
                    {runningAll ? <Spinner /> : <Sparkles size={13} />}
                    {tr("canvas.toolbar.runAll")}
                  </button>
                  <span className="mx-0.5 h-3.5 w-px bg-white/10" />
                  {/* Collapse Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setToolbarCollapsed(true)}
                    className="rounded-full p-1.5 text-ink-400 hover:bg-white/10 hover:text-white transition"
                    title="Thu gọn thanh công cụ (Ctrl+B)"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              )}
            </Panel>"""

content_updated = content_norm[:idx_start] + new_replacement + content_norm[idx_end:]

# Update the Group Selected Button
old_grp_btn = """            {selectedIds.length >= 2 && (
              <Panel position="top-center">
                <button
                  onClick={groupSelected}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#16161c] px-3 py-1.5 text-[12px] font-medium text-ink-100 shadow-lg hover:bg-[#1e1e24]"
                >
                  <Layers size={13} />
                  Nhóm {selectedIds.length} khối đã chọn
                </button>
              </Panel>
            )}"""

new_grp_btn = """            {selectedIds.length >= 2 && (
              <Panel position="top-center" className="m-3">
                <button
                  onClick={groupSelected}
                  className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-[#161622]/95 px-4 py-2 text-[12.5px] font-bold text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] backdrop-blur hover:bg-amber-500/20 hover:border-amber-400 transition"
                >
                  <Layers size={14} className="text-amber-400" />
                  Gom nhóm {selectedIds.length} khối đã chọn (Ctrl+G)
                </button>
              </Panel>
            )}"""

if old_grp_btn in content_updated:
    content_updated = content_updated.replace(old_grp_btn, new_grp_btn)

with open('d:/phim ai thời trang/components/canvas/studio-canvas.tsx', 'w', encoding='utf-8') as f:
    f.write(content_updated)

print("Canvas UI successfully updated with TapNow Left Dock and Collapsible Toolbar!")
