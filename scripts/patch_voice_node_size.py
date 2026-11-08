with open('d:/phim ai thời trang/components/canvas/voice-node.tsx', 'r', encoding='utf-8') as f:
    c = f.read()

# Make dialogue textarea larger
c = c.replace(
    'rows={2}\n                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-white placeholder-white/30 outline-none focus:border-cyan-400/50 resize-none"',
    'rows={4}\n                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-[12px] min-h-[95px] text-white placeholder-white/30 outline-none focus:border-cyan-400/50 resize-y leading-relaxed"'
)

# Make music prompt textarea larger
c = c.replace(
    'rows={2}\n                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-white placeholder-white/30 outline-none focus:border-amber-400/50 resize-none"',
    'rows={3}\n                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-[12px] min-h-[85px] text-white placeholder-white/30 outline-none focus:border-amber-400/50 resize-y leading-relaxed"'
)

# Make sfx prompt textarea larger
c = c.replace(
    'rows={2}\n                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-white placeholder-white/30 outline-none focus:border-cyan-400/50 resize-none"',
    'rows={3}\n                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-[12px] min-h-[85px] text-white placeholder-white/30 outline-none focus:border-cyan-400/50 resize-y leading-relaxed"'
)

with open('d:/phim ai thời trang/components/canvas/voice-node.tsx', 'w', encoding='utf-8') as f:
    f.write(c)

print('voice-node textareas enlarged')
