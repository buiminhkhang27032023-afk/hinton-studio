import re

with open('d:/phim ai thời trang/components/canvas/nodes.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add useLayoutEffect to imports
if 'useLayoutEffect' not in content:
    content = content.replace(
        'import { memo, useCallback, useMemo, useEffect, useRef, useState, type ReactNode } from "react";',
        'import { memo, useCallback, useMemo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";'
    )
    print("Added useLayoutEffect import")

# 2. Update handleDoubleClick in TapFrame:
old_handle_double_click = """  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, video, audio")) return;
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);"""

new_handle_double_click = """  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a")) return;
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);"""

content = content.replace(old_handle_double_click, new_handle_double_click)

# 3. Update activeVideo and activePreview containers to toggle isExpanded on double-click
old_video_block = """        {activeVideo ? (
          <div className="relative h-full w-full bg-black group/video">
            <video
              src={withBasePath(activeVideo)}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
            />
          </div>
        ) : activePreview ? (
          <div
            className="h-full w-full cursor-pointer bg-neutral-950"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox({ url: activePreview!, kind: "image", title: data.name || label });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={withBasePath(activePreview)} alt="" className="h-full w-full object-contain" />
          </div>"""

new_video_block = """        {activeVideo ? (
          <div
            className="relative h-full w-full bg-black group/video cursor-pointer"
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
          >
            <video
              src={withBasePath(activeVideo)}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
            />
          </div>
        ) : activePreview ? (
          <div
            className="h-full w-full cursor-pointer bg-neutral-950"
            onDoubleClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={withBasePath(activePreview)} alt="" className="h-full w-full object-contain" />
          </div>"""

content = content.replace(old_video_block, new_video_block)

# 4. Patch MentionTextarea to keep cursor position with useLayoutEffect & cursorRef
old_mention_textarea_start = """  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || localRef;
  const [query, setQuery] = useState<string | null>(null);
  const [caretPos, setCaretPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [searchFilter, setSearchFilter] = useState("");
  const lastMentionRef = useRef<{ start: number; end: number; query: string } | null>(null);
  const lastCaretRef = useRef<number>(0);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const allNodes = useNodes();"""

new_mention_textarea_start = """  const localRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef || localRef;
  const cursorRef = useRef<{ start: number; end: number } | null>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [caretPos, setCaretPos] = useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [searchFilter, setSearchFilter] = useState("");
  const lastMentionRef = useRef<{ start: number; end: number; query: string } | null>(null);
  const lastCaretRef = useRef<number>(0);
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const allNodes = useNodes();

  useLayoutEffect(() => {
    if (cursorRef.current && ref.current && document.activeElement === ref.current) {
      const { start, end } = cursorRef.current;
      ref.current.setSelectionRange(start, end);
    }
  }, [value]);"""

content = content.replace(old_mention_textarea_start, new_mention_textarea_start)

# 5. In MentionTextarea onChange, record cursorRef before calling onChange
old_onchange_block = """        onChange={(event) => {
          const next = event.target.value;
          onChange(next);
          const selStart = event.target.selectionStart ?? next.length;
          const selEnd = event.target.selectionEnd ?? selStart;
          lastCaretRef.current = selStart;
          lastSelectionRef.current = { start: selStart, end: selEnd };
          onSelectionChange?.({ start: selStart, end: selEnd });"""

new_onchange_block = """        onChange={(event) => {
          const next = event.target.value;
          const selStart = event.target.selectionStart ?? next.length;
          const selEnd = event.target.selectionEnd ?? selStart;
          cursorRef.current = { start: selStart, end: selEnd };
          lastCaretRef.current = selStart;
          lastSelectionRef.current = { start: selStart, end: selEnd };
          onSelectionChange?.({ start: selStart, end: selEnd });
          onChange(next);"""

content = content.replace(old_onchange_block, new_onchange_block)

# 6. Increase min-h of MentionTextarea across nodes
content = content.replace(
    'className="field nodrag min-h-[84px] max-h-[360px] resize-y text-[12.5px] leading-relaxed"',
    'className="field nodrag min-h-[160px] max-h-[480px] resize-y text-[13px] leading-relaxed p-3"'
)
content = content.replace(
    'className="field nodrag min-h-[96px] max-h-[360px] resize-y text-[13px]"',
    'className="field nodrag min-h-[160px] max-h-[480px] resize-y text-[13px] leading-relaxed p-3"'
)
content = content.replace(
    'className="field nodrag min-h-[90px] max-h-[360px] resize-y text-[12.5px]"',
    'className="field nodrag min-h-[160px] max-h-[480px] resize-y text-[13px] leading-relaxed p-3"'
)

with open('d:/phim ai thời trang/components/canvas/nodes.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("nodes.tsx successfully patched!")
