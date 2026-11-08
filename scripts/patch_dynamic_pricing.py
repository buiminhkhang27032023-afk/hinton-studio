import re

with open('d:/phim ai thời trang/components/canvas/nodes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_get_model_cost_badge = '''export function getModelCostBadge(
  modelId?: string,
  durationInput?: number,
  resolutionInput?: string
): string {
  if (!modelId) return "⚡ Sẵn sàng";
  const id = modelId.toLowerCase();
  const dur = Number(durationInput) || 10;
  const res = (resolutionInput || "").toLowerCase();
  const CNY_TO_VND = 3600;

  const fmtVnd = (cny: number) => {
    const vnd = Math.round(cny * CNY_TO_VND);
    if (vnd >= 1000) {
      return `${(vnd / 1000).toFixed(vnd % 1000 === 0 ? 0 : 1)}k đ`;
    }
    return `${vnd}đ`;
  };

  // 1. Seedance 2.5 官渠 (Kênh chính thức ByteDance: 0.70 Tệ / s)
  if (id.includes("seedance2.5 官渠") || id.includes("seedance 2.5 官渠") || id.includes("official")) {
    const total = Number((dur * 0.70).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${dur}s · ~${fmtVnd(total)})`;
  }

  // 2. Seedance 2.5 AT (Trọn gói 5–30s không đổi theo giây: 7.50 Tệ)
  if (id.includes("seedance2.5 at") || id.includes("seedance 2.5 at")) {
    return `🪙 7.50 Tệ (Trọn gói ${dur}s · ~${fmtVnd(7.5)})`;
  }

  // 3. Seedance 2.5 LJ (Trọn gói 1080p 5–30s: 4.50 Tệ)
  if (id.includes("seedance2.5 lj") || id.includes("seedance 2.5 lj")) {
    return `🪙 4.50 Tệ (Trọn gói ${dur}s · ~${fmtVnd(4.5)})`;
  }

  // 4. Seedance 2.0 Mini 全参 (Trọn gói 4–15s: 1.80 Tệ)
  if (id.includes("seedance2.0 mini 全参") || id.includes("mini 全参") || id.includes("seedance20-mini-all")) {
    return `🪙 1.80 Tệ (Trọn gói ${dur}s · ~${fmtVnd(1.8)})`;
  }

  // 5. Seedance 2.0 线路二 (15s cố định: 1.80 Tệ)
  if (id.includes("seedance20-line2") || id.includes("线路二")) {
    return `🪙 1.80 Tệ (Cố định 15s · ~${fmtVnd(1.8)})`;
  }

  // 6. Seedance 2.0 Đặc huệ (15s cố định: 1.50 Tệ)
  if (id.includes("seedance20-special")) {
    return `🪙 1.50 Tệ (Cố định 15s · ~${fmtVnd(1.5)})`;
  }

  // 7. Seedance 2.0 满血 (0.29 Tệ / s)
  if (id.includes("seedance 2.0 满血") || id.includes("满血")) {
    const rate = 0.29;
    const total = Number((dur * rate).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${dur}s · ~${fmtVnd(total)})`;
  }

  // 8. Seedance 2.0 Fast (0.18 Tệ / s)
  if (id.includes("seedance 2.0 fast") || id.includes("seedance 2.0 快速") || id.includes("fast")) {
    const rate = 0.18;
    const total = Number((dur * rate).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${dur}s · ~${fmtVnd(total)})`;
  }

  // 9. Omni Flash (10s: 720p 0.80 Tệ, 1080p 0.85 Tệ)
  if (id.includes("omni_flash") || id.includes("omni flash")) {
    const is1080 = res.includes("1080");
    const total = is1080 ? 0.85 : 0.80;
    return `🪙 ${total.toFixed(2)} Tệ (${is1080 ? "1080p" : "720p"} · ~${fmtVnd(total)})`;
  }

  // 10. Omni Video Editor (10s: 1.65 Tệ)
  if (id.includes("omni 可编辑") || id.includes("omni video editor") || id.includes("omni 可续画")) {
    return `🪙 1.65 Tệ (10s · ~${fmtVnd(1.65)})`;
  }

  // 11. MiniMax H3 / Hailuo (480p: 0.06/s, 720p: 0.10/s, 1080p: 0.18/s)
  if (id.includes("minimax") || id.includes("hailuo")) {
    const is1080 = res.includes("1080") || id.includes("1080");
    const is480 = res.includes("480");
    const rate = is1080 ? 0.18 : is480 ? 0.06 : 0.10;
    const total = Number((dur * rate).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${is1080 ? "1080p" : is480 ? "480p" : "720p"} · ${dur}s · ~${fmtVnd(total)})`;
  }

  // 12. GPT Image 2 (Ảnh 1K: 0.08, 2K: 0.12, 4K: 0.15 Tệ)
  if (id.includes("gpt-image-2") || id.includes("gpt image 2")) {
    const is4k = res.includes("4k") || id.includes("4k");
    const is2k = res.includes("2k");
    const total = is4k ? 0.15 : is2k ? 0.12 : 0.08;
    return `🪙 ${total.toFixed(2)} Tệ (${is4k ? "4K" : is2k ? "2K" : "1K"} · ~${fmtVnd(total)})`;
  }

  // 13. MuseTalk (LipSync: 0.05 Tệ / s)
  if (id.includes("musetalk") || id.includes("muse")) {
    const total = Number((dur * 0.05).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (LipSync ${dur}s · ~${fmtVnd(total)})`;
  }

  // 14. Seedance chung
  if (id.includes("seedance")) {
    const rate = 0.20;
    const total = Number((dur * rate).toFixed(2));
    return `🪙 ${total.toFixed(2)} Tệ (${dur}s · ~${fmtVnd(total)})`;
  }

  return "⚡ Sẵn sàng";
}'''

# Replace getModelCostBadge function
old_fn_pattern = r'function getModelCostBadge\(modelId\?: string\): string \{[\s\S]*?\n\}'
content = re.sub(old_fn_pattern, new_get_model_cost_badge, content, count=1)

# Replace the usage in GenerateNode
old_usage = '<span>{getModelCostBadge(model?.id)}</span>'
new_usage = '<span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold text-[10px] shadow-sm whitespace-nowrap">{getModelCostBadge(model?.id, nodeData.duration, nodeData.resolution)}</span>'

content = content.replace(old_usage, new_usage)

with open('d:/phim ai thời trang/components/canvas/nodes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("nodes.tsx successfully updated with dynamic pricing!")
