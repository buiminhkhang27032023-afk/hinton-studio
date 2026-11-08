with open(r'd:\phim ai thời trang\lib\provider-meta.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '  | "groq"\n  | "bailian"',
    '  | "groq"\n  | "muse"\n  | "bailian"'
).replace(
    '  | "groq"\r\n  | "bailian"',
    '  | "groq"\r\n  | "muse"\r\n  | "bailian"'
)

content = content.replace(
    '{ id: "groq", label: "Groq Cloud (LPU Ultra Fast)", short: "Groq", badge: "GROQ", icon: "⚡" },',
    '{ id: "groq", label: "Groq Cloud (LPU Ultra Fast)", short: "Groq", badge: "GROQ", icon: "⚡" },\r\n  { id: "muse", label: "Muse AI Gateway (MuseTalk LipSync / MuseV / MuseVoice)", short: "Muse AI", badge: "MUSE", icon: "🎭" },'
)

content = content.replace(
    'if (pid === "groq" || mid.startsWith("groq:")) return "groq";',
    'if (pid === "groq" || mid.startsWith("groq:")) return "groq";\r\n  if (pid === "muse" || mid.startsWith("muse:") || mid.includes("musetalk") || mid.includes("musev") || mid.includes("musevoice")) return "muse";'
)

with open(r'd:\phim ai thời trang\lib\provider-meta.ts', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print("Updated provider-meta.ts!")
