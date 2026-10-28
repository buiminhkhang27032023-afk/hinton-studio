with open('d:/phim ai thời trang/components/brand/logo.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content_norm = content.replace('\r\n', '\n')

old_chunk = """      <span className="flex items-baseline gap-1.5 font-sans leading-none">
        <span className="flex items-center tracking-[0.04em] text-[18px] font-extrabold uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-200 to-amber-500">
          {word.split("").map((char, i) => (
            <span
              key={i}
              ref={(el) => {
                lettersRef.current[i] = el;
              }}
              className="inline-block transition-transform hover:-translate-y-0.5"
            >
              {char}
            </span>
          ))}
        </span>
        <span className="text-[14px] font-bold lowercase tracking-tight text-amber-200/90">
          studio
        </span>
      </span>
      <span
        ref={subRef}
        className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.24em] text-amber-200/60"
      >
        AI CINEMATIC
      </span>"""

new_chunk = """      <span className="flex items-center tracking-[0.04em] text-[18px] font-black uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#fff5dd] via-[#eec988] to-[#d4a04d]">
        {word.split("").map((char, i) => (
          <span
            key={i}
            ref={(el) => {
              lettersRef.current[i] = el;
            }}
            className="inline-block transition-transform duration-200 hover:-translate-y-0.5"
          >
            {char}
          </span>
        ))}
      </span>
      <span
        ref={subRef}
        className="-mt-0.5 block text-[10.5px] font-bold lowercase tracking-[0.28em] text-[#e8c98d]"
      >
        studio
      </span>"""

if old_chunk in content_norm:
    content_updated = content_norm.replace(old_chunk, new_chunk)
    with open('d:/phim ai thời trang/components/brand/logo.tsx', 'w', encoding='utf-8') as f:
        f.write(content_updated)
    print("SUCCESS: Updated logo cleanly without AI CINEMATIC!")
else:
    print("Could not find exact chunk, searching for subRef...")
    lines = content_norm.split('\n')
    for idx, l in enumerate(lines):
        if 'AI CINEMATIC' in l:
            lines[idx] = '        studio'
        if 'mt-1 block text-[8px]' in l:
            lines[idx] = '        className="-mt-0.5 block text-[10.5px] font-bold lowercase tracking-[0.28em] text-[#e8c98d]"'
        if '<span className="text-[14px] font-bold lowercase tracking-tight' in l:
            # remove line and closing tag
            lines[idx] = ''
            if 'studio' in lines[idx+1]: lines[idx+1] = ''
            if '</span>' in lines[idx+2]: lines[idx+2] = ''
    with open('d:/phim ai thời trang/components/brand/logo.tsx', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print("FALLBACK REPLACEMENT DONE!")
