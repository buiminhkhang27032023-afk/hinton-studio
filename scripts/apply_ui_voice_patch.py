import re

# 1. Patch voice-node.tsx
path_vn = r'd:\phim ai thời trang\components\canvas\voice-node.tsx'
with open(path_vn, 'r', encoding='utf-8') as f:
    c = f.read()

# Update engine notes
c = c.replace(
    """                      {/* Engine Notes */}
                      {cloneEngine === "elevenlabs" ? (
                        <div className="text-[9px] text-amber-300/80 leading-relaxed pt-0.5">
                          {elevenSub?.tier === "free"
                            ? "💡 Gói ElevenLabs Free chưa mở Clone API: Hệ thống sẽ tự động dùng OmniVoice Cục bộ nhái theo file mẫu hoàn toàn miễn phí!"
                            : "✓ Đã kết nối ElevenLabs Instant Voice Clone & Multilingual v2."}
                        </div>
                      ) : (
                        <div className="text-[9px] text-cyan-300/80 leading-relaxed pt-0.5">
                          ✓ OmniVoice F5-TTS Cục bộ: Nhái 100% theo file âm thanh mẫu của bạn, không giới hạn.
                        </div>
                      )}""",
    """                      {/* Engine Notes */}
                      {cloneEngine === "elevenlabs" ? (
                        <div className="text-[9px] text-amber-300/80 leading-relaxed pt-0.5">
                          {elevenSub?.tier === "free" || !elevenSub?.canInstantClone
                            ? "💡 Gói ElevenLabs Free chưa hỗ trợ Clone qua API: Hệ thống sẽ tự động kích hoạt OmniVoice Cục bộ nhái giọng chuẩn Tiếng Việt 100% theo file mẫu (0đ)!"
                            : "✓ Đã kết nối ElevenLabs Instant Voice Clone & Flash v2.5 chuẩn Tiếng Việt."}
                        </div>
                      ) : (
                        <div className="text-[9px] text-cyan-300/80 leading-relaxed pt-0.5">
                          ✓ OmniVoice AI Cục bộ: Nhái 100% theo file âm thanh mẫu của bạn, chuẩn Tiếng Việt bản ngữ (0đ).
                        </div>
                      )}"""
)

# Update button text
c = c.replace(
    'voiceSubTab === "clone"\n                  ? (cloneEngine === "elevenlabs" ? "✨ Nhái giọng (ElevenLabs Clone)" : "🎙️ Nhái giọng (OmniVoice Clone)")',
    'voiceSubTab === "clone"\n                  ? (cloneEngine === "elevenlabs" ? (elevenSub?.tier === "free" || !elevenSub?.canInstantClone ? "✨ Nhái giọng (OmniVoice Tiếng Việt)" : "✨ Nhái giọng (ElevenLabs Clone)") : "🎙️ Nhái giọng (OmniVoice Tiếng Việt)")'
)

with open(path_vn, 'w', encoding='utf-8') as f:
    f.write(c)
print('Updated voice-node.tsx')

# 2. Patch test-gateway/route.ts
path_tg = r'd:\phim ai thời trang\app\api\settings\test-gateway\route.ts'
with open(path_tg, 'r', encoding='utf-8') as f:
    c_tg = f.read()

c_tg = c_tg.replace(
    'Sẵn sàng lồng tiếng Multilingual v2 & SFX!',
    'Sẵn sàng lồng tiếng Flash v2.5 Tiếng Việt & SFX!'
)
with open(path_tg, 'w', encoding='utf-8') as f:
    f.write(c_tg)
print('Updated test-gateway/route.ts')
