with open('d:/phim ai thời trang/lib/execute.ts', 'r', encoding='utf-8') as f:
    code = f.read()

target = '''  const taggedPrompt = cleanPrompt;
  const aspect = (data.aspect as string | undefined) ?? "16:9";'''

replacement = '''  // 3. Tự động nhận diện, ánh xạ và chuẩn hóa tag Audio ([@Audio 1], @Âm_thanh_nam_chính...)
  const availableAudios = (inputs.audios && inputs.audios.length > 0
    ? inputs.audios
    : inputs.audioUrl ? [inputs.audioUrl] : []
  ).filter(Boolean);
  const maxAvailableAudio = availableAudios.length;

  if (maxAvailableAudio > 0) {
    // Ánh xạ tag đặt tên tiếng Việt (@Âm_thanh_nam_chính, @Audio_nữ...)
    const namedAudioMap = new Map<string, number>();
    let nextAud = 1;
    cleanPrompt = cleanPrompt.replace(/@(?:Âm_thanh|âm_thanh|Audio|audio|Giọng|giọng)[_-]([a-zA-Z0-9_\\u00C0-\\u024F\\u1E00-\\u1EFF]+)/gi, (match, name) => {
      const key = name.toLowerCase();
      if (!namedAudioMap.has(key)) {
        const assigned = Math.min(maxAvailableAudio, nextAud);
        namedAudioMap.set(key, assigned);
        nextAud++;
      }
      return `[@Audio ${namedAudioMap.get(key) || 1}]`;
    });

    // Chuẩn hóa và giới hạn số thứ tự [@Audio N] không vượt quá số lượng audio đang kết nối
    cleanPrompt = cleanPrompt.replace(/\\[@(?:Audio|audio)\\s*(\\d+)\\]/gi, (match, n1) => {
      const num = Math.min(maxAvailableAudio, Math.max(1, Number(n1)));
      return `[@Audio ${num}]`;
    });
  } else {
    // Nếu chưa nối file audio nào, xóa tag [@Audio N] để ByteDance không báo lỗi "Prompt references a missing audio"
    cleanPrompt = cleanPrompt.replace(/\\[@(?:Audio|audio)\\s*\\d+\\]\\s*:\\s*[^\\n\\.]*[\\n\\.]?/gi, "");
    cleanPrompt = cleanPrompt.replace(/\\[@(?:Audio|audio)\\s*\\d+\\]/gi, "");
    cleanPrompt = cleanPrompt.replace(/@(?:Âm_thanh|âm_thanh|Audio|audio|Giọng|giọng)[_-][a-zA-Z0-9_\\u00C0-\\u024F\\u1E00-\\u1EFF]+/gi, "giọng thoại");
  }

  const taggedPrompt = cleanPrompt;
  const aspect = (data.aspect as string | undefined) ?? "16:9";'''

if target in code:
    code = code.replace(target, replacement, 1)
    with open('d:/phim ai thời trang/lib/execute.ts', 'w', encoding='utf-8') as f:
        f.write(code)
    print("SUCCESS: Patched execute.ts with audio tag normalization!")
else:
    print("ERROR: Target not found in execute.ts")
