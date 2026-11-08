const fs = require('fs');

let content = fs.readFileSync('components/canvas/nodes.tsx', 'utf8');

// 1. Wrap Media Card with relative container so handles ({children}) anchor to Media Card
const oldMediaCardSection = `      {/* Media Card (Xem video trực tiếp không bị bung popup che mất màn hình) */}
      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 transition-all duration-150 shadow-xl",
          selected ? "ring-2 ring-white/80 border-white/40 shadow-2xl" : "hover:border-white/20",
        )}
        style={frameStyle}
      >`;

const newMediaCardSection = `      {/* Media Card Container (Bọc Media Card và Cổng kết nối để Ports luôn cố định ở giữa Media Card) */}
      <div className="relative" style={{ width: frameWidth }}>
        <div
          className={clsx(
            "relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 transition-all duration-150 shadow-xl",
            selected ? "ring-2 ring-white/80 border-white/40 shadow-2xl" : "hover:border-white/20",
          )}
          style={frameStyle}
        >`;

if (content.includes(oldMediaCardSection)) {
  content = content.replace(oldMediaCardSection, newMediaCardSection);
  console.log('Step 1: Media Card wrapper applied');
} else {
  console.log('Step 1: Old media card section not found, checking with CRLF');
  const oldCRLF = oldMediaCardSection.replace(/\n/g, '\r\n');
  const newCRLF = newMediaCardSection.replace(/\n/g, '\r\n');
  if (content.includes(oldCRLF)) {
    content = content.replace(oldCRLF, newCRLF);
    console.log('Step 1: Media Card wrapper applied (CRLF)');
  } else {
    console.error('Step 1 FAILED');
  }
}

// 2. Close the Media Card Container around {children}
const oldChildrenSection = `      {/* KHUNG THAO TÁC (EDITOR) CHỈ HIỆN KHI BẤM CHỌN 1 THẺ DUY NHẤT (KHÔNG BUNG KHI KÉO CHỌN NHÓM) */}
      {isSingleSelected && editor && (
        <div className="nowheel nodrag mt-2.5 rounded-2xl border border-white/10 bg-[#121217]/95 p-3 shadow-2xl backdrop-blur-md relative z-30"
          onWheel={(e) => e.stopPropagation()}>
          {editor}
        </div>
      )}

      {children}
    </div>`;

const newChildrenSection = `        {/* Cổng kết nối (Ports) luôn gắn cố định vào sườn của Media Card */}
        {children}
      </div>

      {/* KHUNG THAO TÁC (EDITOR) CHỈ HIỆN KHI BẤM CHỌN 1 THẺ DUY NHẤT (KHÔNG BUNG KHI KÉO CHỌN NHÓM) */}
      {isSingleSelected && editor && (
        <div className="nowheel nodrag mt-2.5 rounded-2xl border border-white/10 bg-[#121217]/95 p-3 shadow-2xl backdrop-blur-md relative z-30"
          onWheel={(e) => e.stopPropagation()}>
          {editor}
        </div>
      )}
    </div>`;

if (content.includes(oldChildrenSection)) {
  content = content.replace(oldChildrenSection, newChildrenSection);
  console.log('Step 2: Ports moved to Media Card wrapper applied');
} else {
  const oldCRLF = oldChildrenSection.replace(/\n/g, '\r\n');
  const newCRLF = newChildrenSection.replace(/\n/g, '\r\n');
  if (content.includes(oldCRLF)) {
    content = content.replace(oldCRLF, newCRLF);
    console.log('Step 2: Ports moved to Media Card wrapper applied (CRLF)');
  } else {
    console.error('Step 2 FAILED');
  }
}

// 3. Remove e.stopPropagation() from <video> element so clicking video selects the node
const oldVideoElem = `<video
              src={withBasePath(activeVideo)}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />`;

const newVideoElem = `<video
              src={withBasePath(activeVideo)}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />`;

if (content.includes(oldVideoElem)) {
  content = content.replace(oldVideoElem, newVideoElem);
  console.log('Step 3: Removed e.stopPropagation from video element');
} else {
  const oldCRLF = oldVideoElem.replace(/\n/g, '\r\n');
  const newCRLF = newVideoElem.replace(/\n/g, '\r\n');
  if (content.includes(oldCRLF)) {
    content = content.replace(oldCRLF, newCRLF);
    console.log('Step 3: Removed e.stopPropagation from video element (CRLF)');
  } else {
    console.error('Step 3 FAILED');
  }
}

// 4. Fix extract-frame buttons (Đầu / Dừng / Cuối)
const oldExtractButtons = `{/* Cắt frame video (Đầu / Dừng / Cuối) */}
        {activeVideo && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto z-20">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: data.projectId, videoUrl: activeVideo, mode: "first" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", "Cảnh đầu video");
                  }
                } catch {}
              }}
              className="rounded bg-black/80 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition"
              title="Cắt cảnh đầu video (0.0s) đưa lên Canvas"
            >
              🎬 Đầu
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: data.projectId, videoUrl: activeVideo, mode: "current" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", "Cảnh dừng video");
                  }
                } catch {}
              }}
              className="rounded bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition"
              title="Cắt cảnh đang dừng video đưa lên Canvas"
            >
              ⏸️ Dừng
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: data.projectId, videoUrl: activeVideo, mode: "last" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", "Cảnh cuối video");
                  }
                } catch {}
              }}
              className="rounded bg-black/80 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition"
              title="Cắt cảnh cuối video đưa lên Canvas"
            >
              🏁 Cuối
            </button>
          </div>
        )}`;

const newExtractButtons = `{/* Cắt frame video (Đầu / Dừng / Cuối) */}
        {activeVideo && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto z-20">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const targetProjectId = (data.projectId as string) || (data.result as any)?.projectId || (activeVideo ? activeVideo.match(/\\/api\\/files\\/([^\\/]+)\\//)?.[1] : undefined) || "prj_06d6f1c9496a";
                  toast("Đang trích xuất cảnh đầu video (0.0s)...", "default");
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: targetProjectId, videoUrl: activeVideo, mode: "first" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", \`Cảnh đầu: \${data.name || "Video"}\`);
                    toast("Đã cắt cảnh đầu và tạo khối ảnh mới trên Canvas!", "success");
                  } else {
                    toast(resData.error || "Không thể cắt cảnh đầu", "error");
                  }
                } catch (err: any) {
                  toast(\`Lỗi khi cắt cảnh đầu: \${err.message || String(err)}\`, "error");
                }
              }}
              className="rounded bg-black/80 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition shadow-md"
              title="Cắt cảnh đầu video (0.0s) đưa lên Canvas làm khối ảnh"
            >
              🎬 Đầu
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const videoEl = (e.currentTarget.closest(".relative")?.querySelector("video") as HTMLVideoElement) || null;
                  const currentTime = videoEl?.currentTime || 0;
                  const targetProjectId = (data.projectId as string) || (data.result as any)?.projectId || (activeVideo ? activeVideo.match(/\\/api\\/files\\/([^\\/]+)\\//)?.[1] : undefined) || "prj_06d6f1c9496a";
                  toast(\`Đang trích xuất cảnh dừng (\${currentTime.toFixed(1)}s)...\`, "default");
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: targetProjectId, videoUrl: activeVideo, mode: "current", time: currentTime }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", \`Cảnh dừng: \${data.name || "Video"}\`);
                    toast("Đã cắt cảnh đang dừng và tạo khối ảnh mới trên Canvas!", "success");
                  } else {
                    toast(resData.error || "Không thể cắt cảnh dừng", "error");
                  }
                } catch (err: any) {
                  toast(\`Lỗi khi cắt cảnh dừng: \${err.message || String(err)}\`, "error");
                }
              }}
              className="rounded bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition shadow-md"
              title="Cắt cảnh đang dừng video đưa lên Canvas làm khối ảnh"
            >
              ⏸️ Dừng
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const targetProjectId = (data.projectId as string) || (data.result as any)?.projectId || (activeVideo ? activeVideo.match(/\\/api\\/files\\/([^\\/]+)\\//)?.[1] : undefined) || "prj_06d6f1c9496a";
                  toast("Đang trích xuất cảnh cuối video...", "default");
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: targetProjectId, videoUrl: activeVideo, mode: "last" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", \`Cảnh cuối: \${data.name || "Video"}\`);
                    toast("Đã cắt cảnh cuối và tạo khối ảnh mới trên Canvas!", "success");
                  } else {
                    toast(resData.error || "Không thể cắt cảnh cuối", "error");
                  }
                } catch (err: any) {
                  toast(\`Lỗi khi cắt cảnh cuối: \${err.message || String(err)}\`, "error");
                }
              }}
              className="rounded bg-black/80 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition shadow-md"
              title="Cắt cảnh cuối video đưa lên Canvas làm khối ảnh"
            >
              🏁 Cuối
            </button>
          </div>
        )}`;

if (content.includes(oldExtractButtons)) {
  content = content.replace(oldExtractButtons, newExtractButtons);
  console.log('Step 4: Fixed extract-frame buttons');
} else {
  const oldCRLF = oldExtractButtons.replace(/\n/g, '\r\n');
  const newCRLF = newExtractButtons.replace(/\n/g, '\r\n');
  if (content.includes(oldCRLF)) {
    content = content.replace(oldCRLF, newCRLF);
    console.log('Step 4: Fixed extract-frame buttons (CRLF)');
  } else {
    console.error('Step 4 FAILED');
  }
}

fs.writeFileSync('components/canvas/nodes.tsx', content, 'utf8');
console.log('Finished updating nodes.tsx');
