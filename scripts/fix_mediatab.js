const fs = require('fs');

let content = fs.readFileSync('components/canvas/nodes.tsx', 'utf8');

// Remove from PromptNode
content = content.replace(
  '  const nodeData = data as StudioNodeData;\r\n  const [mediaTab, setMediaTab] = useState<"reference" | "first_last">("reference");',
  '  const nodeData = data as StudioNodeData;'
);
content = content.replace(
  '  const nodeData = data as StudioNodeData;\n  const [mediaTab, setMediaTab] = useState<"reference" | "first_last">("reference");',
  '  const nodeData = data as StudioNodeData;'
);

// Add to GenerateNode
const genNodeAnchor = '  const isVideo = nodeData.modelKind === "video";';
const genNodeReplacement = '  const isVideo = nodeData.modelKind === "video";\r\n  const [mediaTab, setMediaTab] = useState<"reference" | "first_last">("reference");';

content = content.replace(genNodeAnchor, genNodeReplacement);

fs.writeFileSync('components/canvas/nodes.tsx', content, 'utf8');
console.log('Fixed mediaTab location');
