import os

path = r'd:\phim ai thời trang\app\api\audio\tts\route.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """          // Case B: Explicit Voice ID passed directly or custom voice
          if (!targetVoiceId) {
            if (customVoiceId) {
              targetVoiceId = String(customVoiceId).trim().replace(/^el_/, "");
            } else if (String(voice).startsWith("el_")) {
              targetVoiceId = String(voice).replace(/^el_/, "");
            } else if (/^[a-zA-Z0-9_-]{18,24}$/.test(String(voice))) {
              targetVoiceId = String(voice);
            } else {
              const isFemale = String(voice).toLowerCase().includes("female") || String(voice).toLowerCase().includes("nu") || String(voice).toLowerCase().includes("linh");
              targetVoiceId = isFemale ? "21m00Tcm4TlvDq8ikWAM" : "ErXwobaYiN019PkySvjV";
            }
          }

          // If targetVoiceId is valid, generate TTS with ElevenLabs Multilingual v2
          if (targetVoiceId) {
            const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
              method: "POST",
              headers: {
                "xi-api-key": key,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: cleanText,
                model_id: "eleven_multilingual_v2",
                voice_settings: {
                  stability: Number(stability) || 0.5,
                  similarity_boost: Number(similarityBoost) || 0.88,
                  style: 0.15,
                  use_speaker_boost: true,
                },
              }),
              signal: AbortSignal.timeout(45000),
            });

            if (elRes.ok) {
              const arr = await elRes.arrayBuffer();
              audioBuffer = Buffer.from(arr);
              ext = "mp3";
              mimeType = "audio/mpeg";
              engineUsed = isClonedVoice
                ? `ElevenLabs Instant Voice Clone (${targetVoiceId})`
                : `ElevenLabs Multilingual v2 (${targetVoiceId === "21m00Tcm4TlvDq8ikWAM" ? "Linh Nữ" : targetVoiceId === "ErXwobaYiN019PkySvjV" ? "Thắng Nam" : targetVoiceId})`;
            } else {
              console.warn("ElevenLabs TTS request returned", elRes.status, "- falling back to OmniVoice");
            }
          }"""

replacement = """          // Case B: Explicit Voice ID passed directly or custom voice
          if (!targetVoiceId) {
            // CRITICAL: If user requested Voice Clone from reference audio (wantsCloneFromRef),
            // and ElevenLabs failed to clone (e.g. Free account restricted from Instant Voice Cloning API),
            // DO NOT fall back to Antoni (ErXwobaYiN019PkySvjV) or Rachel! Doing so uses English phonemes on Vietnamese text,
            // which sounds like Thai / broken dialect!
            // Leave targetVoiceId as null so it falls right through to OmniVoice AI Local Server (Zero-Shot Clone in pure Vietnamese)!
            if (wantsCloneFromRef) {
              console.log("ElevenLabs API cannot clone via API on current account. Falling back to OmniVoice local zero-shot clone.");
            } else if (customVoiceId) {
              targetVoiceId = String(customVoiceId).trim().replace(/^el_/, "");
            } else if (String(voice).startsWith("el_")) {
              targetVoiceId = String(voice).replace(/^el_/, "");
            } else if (/^[a-zA-Z0-9_-]{18,24}$/.test(String(voice))) {
              targetVoiceId = String(voice);
            } else {
              const isFemale = String(voice).toLowerCase().includes("female") || String(voice).toLowerCase().includes("nu") || String(voice).toLowerCase().includes("linh");
              targetVoiceId = isFemale ? "21m00Tcm4TlvDq8ikWAM" : "ErXwobaYiN019PkySvjV";
            }
          }

          // If targetVoiceId is valid, generate TTS with ElevenLabs Flash v2.5 (official Vietnamese support)
          if (targetVoiceId) {
            const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
              method: "POST",
              headers: {
                "xi-api-key": key,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                text: cleanText,
                model_id: "eleven_flash_v2_5",
                language_code: "vi",
                voice_settings: {
                  stability: Number(stability) || 0.5,
                  similarity_boost: Number(similarityBoost) || 0.88,
                  style: 0.15,
                  use_speaker_boost: true,
                },
              }),
              signal: AbortSignal.timeout(45000),
            });

            if (elRes.ok) {
              const arr = await elRes.arrayBuffer();
              audioBuffer = Buffer.from(arr);
              ext = "mp3";
              mimeType = "audio/mpeg";
              engineUsed = isClonedVoice
                ? `ElevenLabs Instant Voice Clone (${targetVoiceId})`
                : `ElevenLabs Flash v2.5 Tiếng Việt (${targetVoiceId === "21m00Tcm4TlvDq8ikWAM" ? "Linh Nữ" : targetVoiceId === "ErXwobaYiN019PkySvjV" ? "Thắng Nam" : targetVoiceId})`;
            } else {
              console.warn("ElevenLabs TTS request returned", elRes.status, "- falling back to OmniVoice");
            }
          }"""

target_norm = target.replace('\r\n', '\n')
content_norm = content.replace('\r\n', '\n')

if target_norm in content_norm:
    new_content = content_norm.replace(target_norm, replacement.replace('\r\n', '\n'))
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('SUCCESS: Replaced target in route.ts')
else:
    print('FAILED: Target not found')
