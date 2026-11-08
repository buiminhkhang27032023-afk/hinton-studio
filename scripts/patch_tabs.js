const fs = require('fs');

let content = fs.readFileSync('components/canvas/nodes.tsx', 'utf8');

// 1. Add state mediaTab
const oldStateAnchor = `  const nodeData = data as StudioNodeData;`;
const newStateAnchor = `  const nodeData = data as StudioNodeData;
  const [mediaTab, setMediaTab] = useState<"reference" | "first_last">("reference");`;

if (content.includes(oldStateAnchor)) {
  content = content.replace(oldStateAnchor, newStateAnchor);
  console.log('Added mediaTab state');
} else {
  const oldCRLF = oldStateAnchor.replace(/\n/g, '\r\n');
  const newCRLF = newStateAnchor.replace(/\n/g, '\r\n');
  content = content.replace(oldCRLF, newCRLF);
  console.log('Added mediaTab state (CRLF)');
}

// 2. Replace static Reference | First/Last frame with real interactive tabs & slot rendering
const oldTabsSection = `          {/* Dòng Reference Slot theo phong cách Ảnh 1 TapNow */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white/80">Reference</span>
                <span className="text-white/30">|</span>
                <span className="text-white/50 text-[10px]">First/Last frame</span>
              </div>
              <span className="text-[10px] text-neutral-500">{imageTags.length} ảnh kết nối</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">`;

const newTabsSection = `          {/* Dòng Reference Slot & First/Last frame Tabs */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10">
                <button
                  type="button"
                  onClick={() => setMediaTab("reference")}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition",
                    mediaTab === "reference" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white/80"
                  )}
                >
                  Reference
                </button>
                <button
                  type="button"
                  onClick={() => setMediaTab("first_last")}
                  className={clsx(
                    "px-2 py-0.5 rounded text-[10px] font-semibold transition",
                    mediaTab === "first_last" ? "bg-white/20 text-white shadow-sm" : "text-white/50 hover:text-white/80"
                  )}
                >
                  First/Last frame
                </button>
              </div>
              <span className="text-[10px] text-neutral-500">{imageTags.length} ảnh kết nối</span>
            </div>

            {mediaTab === "first_last" ? (
              <div className="flex items-center gap-2 py-1">
                {/* First frame slot */}
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-950/20 px-2 py-1 flex-1 cursor-pointer hover:border-sky-400 transition"
                  onClick={() => {
                    const tagCode = "[@Image 1]";
                    const cur = nodeData.prompt ?? "";
                    if (!cur.includes(tagCode)) update({ prompt: \`\${tagCode} \${cur}\` });
                  }}
                  title="Nhấp để chèn [@Image 1] (Cảnh đầu) vào câu lệnh"
                >
                  <div className="h-8 w-8 rounded border border-sky-500/40 bg-sky-950/40 shrink-0 overflow-hidden flex items-center justify-center">
                    {imageTags[0]?.preview ? (
                      <img src={withBasePath(imageTags[0].preview)} alt="" className="h-full w-full rounded object-cover" />
                    ) : (
                      <span className="text-[9px] text-sky-400 font-bold">#1 Đầu</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold text-sky-300 truncate">Khung đầu (0.0s)</span>
                    <span className="text-[9px] text-white/40 truncate">{imageTags[0]?.label || "Nối ảnh vào khối"}</span>
                  </div>
                </div>

                {/* Last frame slot */}
                <div
                  className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-950/20 px-2 py-1 flex-1 cursor-pointer hover:border-purple-400 transition"
                  onClick={() => {
                    const tagCode = "[@Image 2]";
                    const cur = nodeData.prompt ?? "";
                    if (!cur.includes(tagCode)) update({ prompt: \`\${cur} \${tagCode}\` });
                  }}
                  title="Nhấp để chèn [@Image 2] (Cảnh cuối) vào câu lệnh"
                >
                  <div className="h-8 w-8 rounded border border-purple-500/40 bg-purple-950/40 shrink-0 overflow-hidden flex items-center justify-center">
                    {imageTags[1]?.preview ? (
                      <img src={withBasePath(imageTags[1].preview)} alt="" className="h-full w-full rounded object-cover" />
                    ) : (
                      <span className="text-[9px] text-purple-400 font-bold">#2 Cuối</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold text-purple-300 truncate">Khung cuối</span>
                    <span className="text-[9px] text-white/40 truncate">{imageTags[1]?.label || "Nối ảnh vào khối"}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto py-1">`;

if (content.includes(oldTabsSection)) {
  content = content.replace(oldTabsSection, newTabsSection);
  console.log('Replaced tabs section');
} else {
  const oldCRLF = oldTabsSection.replace(/\n/g, '\r\n');
  const newCRLF = newTabsSection.replace(/\n/g, '\r\n');
  content = content.replace(oldCRLF, newCRLF);
  console.log('Replaced tabs section (CRLF)');
}

// And close the ternary `{mediaTab === "first_last" ? ... : (...)}`
const oldClosingReferenceDiv = `              {imageTags.length < 8 && (
                <div
                  className="h-8 w-8 rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/30 text-[12px] shrink-0"
                  title="Kéo dây từ khối ảnh vào cổng bên trái để thêm tham chiếu"
                >
                  +
                </div>
              )}
            </div>
          </div>`;

const newClosingReferenceDiv = `              {imageTags.length < 8 && (
                <div
                  className="h-8 w-8 rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/30 text-[12px] shrink-0"
                  title="Kéo dây từ khối ảnh vào cổng bên trái để thêm tham chiếu"
                >
                  +
                </div>
              )}
            </div>
            )}
          </div>`;

if (content.includes(oldClosingReferenceDiv)) {
  content = content.replace(oldClosingReferenceDiv, newClosingReferenceDiv);
  console.log('Closed ternary for tabs');
} else {
  const oldCRLF = oldClosingReferenceDiv.replace(/\n/g, '\r\n');
  const newCRLF = newClosingReferenceDiv.replace(/\n/g, '\r\n');
  content = content.replace(oldCRLF, newCRLF);
  console.log('Closed ternary for tabs (CRLF)');
}

fs.writeFileSync('components/canvas/nodes.tsx', content, 'utf8');
console.log('Finished updating tabs');
