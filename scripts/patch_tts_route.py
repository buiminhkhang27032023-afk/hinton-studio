import re

with open('d:/phim ai thời trang/app/api/audio/tts/route.ts', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's check parameters destructured in POST:
# const { projectId, text, voice = "omnivoice", speed = 1.2, model = "omnivoice", referenceAudio, instruct, voiceDescription, } = body;
new_params = """    const {
      projectId,
      text,
      voice = "omnivoice",
      speed = 1.2,
      model = "omnivoice",
      referenceAudio,
      instruct,
      voiceDescription,
      cloneEngine,
      similarityBoost = 0.88,
      stability = 0.5,
      voiceId: customVoiceId,
    } = body;"""

code = re.sub(r'const\s*\{\s*projectId[\s\S]*?\}\s*=\s*body;', new_params, code, count=1)

# Now replace the synthesis block (lines 137 to 226)
old_block_pattern = r'const shouldUseOmniServer =[\s\S]*?if \(!audioBuffer\) \{\s*if \(resolvedRefPath\)'

new_block = """    const isEleven = Boolean(
      voice && (
        String(voice).toLowerCase().includes("eleven") ||
        String(voice).startsWith("el_") ||
        cloneEngine === "elevenlabs" ||
        /^[a-zA-Z0-9_-]{18,24}$/.test(String(voice))
      )
    );

    // 1. ELEVENLABS PIPELINE (Instant Voice Clone, Custom Cloned Voices, Multilingual v2)
    if (isEleven) {
      try {
        const db = getDb();
        const storedKey = db.prepare("SELECT value FROM settings WHERE key = 'elevenlabs_api_key'").get() as { value: string } | undefined;
        let apiKey = process.env.ELEVENLABS_API_KEY || "";
        if (!apiKey && storedKey?.value) {
          try { apiKey = JSON.parse(storedKey.value); } catch { apiKey = storedKey.value; }
        }
        if (!apiKey) {
          apiKey = "YOUR_ELEVENLABS_KEY";
        }

        if (apiKey && apiKey.trim()) {
          const key = apiKey.trim();
          let targetVoiceId: string | null = null;
          let isClonedVoice = false;

          // Case A: User uploaded/selected reference audio for ElevenLabs Instant Voice Cloning
          const wantsCloneFromRef = Boolean(resolvedRefPath) && (voice === "elevenlabs_clone" || cloneEngine === "elevenlabs" || voice === "omnivoice_custom");
          if (wantsCloneFromRef && resolvedRefPath && fs.existsSync(resolvedRefPath)) {
            try {
              const fileName = path.basename(resolvedRefPath);
              const cloneName = `Clone_${path.basename(resolvedRefPath, path.extname(resolvedRefPath)).slice(0, 15)}`;
              
              const form = new FormData();
              form.append("name", cloneName);
              form.append("description", `SeeCut Studio Auto Voice Clone for ${fileName}`);
              const fileBuf = fs.readFileSync(resolvedRefPath);
              const mime = fileName.endsWith(".wav") ? "audio/wav" : "audio/mpeg";
              form.append("files", new Blob([fileBuf], { type: mime }), fileName);

              const cloneRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
                method: "POST",
                headers: { "xi-api-key": key },
                body: form,
                signal: AbortSignal.timeout(30000),
              });

              if (cloneRes.ok) {
                const cloneData = await cloneRes.json();
                if (cloneData.voice_id) {
                  targetVoiceId = cloneData.voice_id;
                  isClonedVoice = true;
                  console.log(`ElevenLabs voice cloned successfully: ${targetVoiceId} (${cloneName})`);
                }
              } else {
                const errJson = await cloneRes.json().catch(() => ({}));
                console.warn("ElevenLabs Instant Voice Cloning unavailable or restricted:", errJson);
                // Will automatically fall back to OmniVoice below
              }
            } catch (cloneErr) {
              console.warn("Exception during ElevenLabs voice clone:", cloneErr);
            }
          }

          // Case B: Explicit Voice ID passed directly or custom voice
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
          }
        }
      } catch (elevenErr) {
        console.warn("ElevenLabs execution error:", elevenErr);
      }
    }

    // 2. OMNIVOICE AI LOCAL SERVER (Zero-Shot Voice Cloning & Voice-Lock v2)
    // Runs when ElevenLabs fell back OR when user selects OmniVoice / Free Voice Cloning
    if (!audioBuffer) {
      const shouldUseOmni = isOmni || Boolean(resolvedRefPath) || Boolean(activeDescription) || isEleven;
      if (shouldUseOmni) {
        try {
          const controller = new AbortController();
          const timeoutMs = resolvedRefPath ? 75000 : 35000;
          const timeout = setTimeout(() => controller.abort(), timeoutMs);

          const payload: Record<string, unknown> = {
            text: cleanText,
            speed: Number(speed) || 1.2,
            language: "vi",
          };
          if (resolvedRefPath) {
            payload.custom_ref = resolvedRefPath;
          }
          if (activeDescription) {
            payload.instruct = activeDescription;
          }

          const srvRes = await fetch(`${OMNIVOICE_ENDPOINT.replace(/\/+$/, "")}/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (srvRes.ok) {
            const raw = await srvRes.arrayBuffer();
            audioBuffer = Buffer.from(raw);
            const isWav = audioBuffer.slice(0, 4).toString() === "RIFF";
            ext = isWav ? "wav" : "mp3";
            mimeType = isWav ? "audio/wav" : "audio/mpeg";
            const refName = resolvedRefPath ? path.basename(resolvedRefPath) : null;
            engineUsed = refName
              ? (isEleven ? `OmniVoice AI Voice Clone (Miễn phí Cục bộ theo mẫu "${refName}")` : `OmniVoice AI Voice Cloning (${refName})`)
              : activeDescription
              ? `OmniVoice Voice Design (${activeDescription})`
              : "OmniVoice (Voice-Lock v2 Server)";
          }
        } catch (err) {
          console.warn("OmniVoice HTTP server error:", err);
        }
      }
    }

    // 3. Fallback: Edge-TTS
    if (!audioBuffer) {
      if (resolvedRefPath)"""

code = re.sub(old_block_pattern, new_block, code, count=1)

with open('d:/phim ai thời trang/app/api/audio/tts/route.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("app/api/audio/tts/route.ts successfully patched!")
