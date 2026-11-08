import re

# Read getModelCostBadge from nodes.tsx and simulate it
def getModelCostBadge(modelId, durationInput, resolutionInput):
    if not modelId:
        return "⚡ Sẵn sàng"
    id = modelId.lower()
    dur = float(durationInput or 10)
    res = (resolutionInput or "").lower()
    CNY_TO_VND = 3600

    def fmtVnd(cny):
        vnd = round(cny * CNY_TO_VND)
        if vnd >= 1000:
            return f"{vnd / 1000:.1f}k đ" if vnd % 1000 != 0 else f"{int(vnd / 1000)}k đ"
        return f"{vnd}đ"

    if "seedance2.5 官渠" in id or "seedance 2.5 官渠" in id:
        total = round(dur * 0.70, 2)
        return f"🪙 {total:.2f} Tệ ({int(dur)}s · ~{fmtVnd(total)})"
    if "seedance2.5 at" in id:
        return f"🪙 7.50 Tệ (Trọn gói {int(dur)}s · ~{fmtVnd(7.5)})"
    if "minimax" in id or "hailuo" in id:
        is1080 = "1080" in res or "1080" in id
        is480 = "480" in res
        rate = 0.18 if is1080 else (0.06 if is480 else 0.10)
        total = round(dur * rate, 2)
        mode = "1080p" if is1080 else ("480p" if is480 else "720p")
        return f"🪙 {total:.2f} Tệ ({mode} · {int(dur)}s · ~{fmtVnd(total)})"
    return "⚡ Ready"

print("Seedance 2.5 官渠 5s:", getModelCostBadge("iooai:seedance2.5 官渠", 5, "720p"))
print("Seedance 2.5 官渠 10s:", getModelCostBadge("iooai:seedance2.5 官渠", 10, "720p"))
print("Seedance 2.5 官渠 15s:", getModelCostBadge("iooai:seedance2.5 官渠", 15, "720p"))
print("MiniMax 720p 10s:", getModelCostBadge("iooai:MiniMax H3", 10, "720p"))
print("MiniMax 1080p 10s:", getModelCostBadge("iooai:MiniMax H3", 10, "1080p"))
print("Seedance 2.5 AT 5s vs 30s:", getModelCostBadge("iooai:seedance2.5 AT", 5, "720p"), "|", getModelCostBadge("iooai:seedance2.5 AT", 30, "720p"))
