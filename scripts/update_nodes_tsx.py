with open(r'd:\phim ai thời trang\components\canvas\nodes.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Imports
import_model3d = 'import { Model3DNode } from "./model3d-node";\r\nimport { VoiceNode } from "./voice-node";\r\n'
code = import_model3d + code

# 2. Add video quick frame cut in TapFrame hover overlay
target_hover = '{menu?.reuse && ('
replacement_hover = '''{video && (
              <div className="flex items-center gap-1 mb-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      const res = await fetch("/api/video/extract-frame", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ projectId: data.projectId, videoUrl: video, mode: "first" }),
                      });
                      const resData = await res.json();
                      if (resData.url && menu?.reuse) {
                        menu.reuse(id, resData.url, "image", "Cảnh đầu video");
                      }
                    } catch {}
                  }}
                  className="flex-1 rounded bg-black/80 hover:bg-amber-500 hover:text-black py-0.5 text-[9.5px] font-medium text-amber-200 backdrop-blur-md transition text-center"
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
                        body: JSON.stringify({ projectId: data.projectId, videoUrl: video, mode: "current" }),
                      });
                      const resData = await res.json();
                      if (resData.url && menu?.reuse) {
                        menu.reuse(id, resData.url, "image", "Cảnh dừng video");
                      }
                    } catch {}
                  }}
                  className="flex-1 rounded bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500 hover:text-black py-0.5 text-[9.5px] font-medium text-amber-200 backdrop-blur-md transition text-center"
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
                        body: JSON.stringify({ projectId: data.projectId, videoUrl: video, mode: "last" }),
                      });
                      const resData = await res.json();
                      if (resData.url && menu?.reuse) {
                        menu.reuse(id, resData.url, "image", "Cảnh cuối video");
                      }
                    } catch {}
                  }}
                  className="flex-1 rounded bg-black/80 hover:bg-amber-500 hover:text-black py-0.5 text-[9.5px] font-medium text-amber-200 backdrop-blur-md transition text-center"
                  title="Cắt cảnh cuối video đưa lên Canvas"
                >
                  🏁 Cuối
                </button>
              </div>
            )}
            {menu?.reuse && ('''

code = code.replace(target_hover, replacement_hover)

# 3. Add to NODE_TYPES
types_target = '  group: GroupNode,\r\n};'
types_replace = '''  group: GroupNode,
  model3d: Model3DNode,
  "3d": Model3DNode,
  voice: VoiceNode,
  audio: VoiceNode,
};'''

if types_target in code:
    code = code.replace(types_target, types_replace)
else:
    types_target_lf = '  group: GroupNode,\n};'
    code = code.replace(types_target_lf, types_replace)

with open(r'd:\phim ai thời trang\components\canvas\nodes.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("Updated nodes.tsx successfully!")
