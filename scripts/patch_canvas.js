const fs = require('fs');
let content = fs.readFileSync('components/canvas/studio-canvas.tsx', 'utf8');
const oldSnippet = `onNodeDoubleClick={(_event, node) => runNode(node.id).catch(() => {})}`;
const newSnippet = `onNodeDoubleClick={(_event, node) => {
              const url = (node.data?.videoUrl as string) || (node.data?.result as any)?.url || (node.data?.imageUrl as string);
              const kind = (node.data?.videoUrl || (node.data?.result as any)?.kind === "video") ? "video" : "image";
              if (url) {
                openLightbox({ url, kind, title: String(node.data?.name || "Chi tiết") });
              }
            }}`;

if (content.includes(oldSnippet)) {
  content = content.replace(oldSnippet, newSnippet);
  fs.writeFileSync('components/canvas/studio-canvas.tsx', content, 'utf8');
  console.log('Successfully patched onNodeDoubleClick in studio-canvas.tsx');
} else {
  console.log('Old snippet not found');
}
