const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));

// Let's inspect the current graph of prj_06d6f1c9496a
const gRow = db.prepare("SELECT data FROM graphs WHERE project_id = 'prj_06d6f1c9496a'").get();
if (!gRow) {
  console.log("No graph found!");
  process.exit(1);
}

const graph = JSON.parse(gRow.data);

// 1. Arrange generate nodes vertically with 640px spacing
const genNodes = ["generate-s7de62", "generate-7k2q4l", "generate-pkhu1a", "generate-5wuhb5"];
genNodes.forEach((id, idx) => {
  const node = graph.nodes.find(n => n.id === id);
  if (node) {
    node.position = { x: 820, y: 100 + idx * 640 };
    node.data = node.data || {};
    node.data.aspect = "16:9";
    node.data.resolution = "720p";
    node.data.modelKind = "video";
    node.data.modelId = "iooai:seedance2.5 官渠";
  }
});

// Scene 1: generate-s7de62 (Minh đi tới sườn đê, thấy Linh ngồi một mình)
const s1 = graph.nodes.find(n => n.id === "generate-s7de62");
if (s1) {
  s1.data.status = "idle"; // reset status so user can run it fresh
  // keep the detailed prompt we crafted earlier
}

// Scene 2: generate-7k2q4l (Minh bước xuống ngồi xuống bậc cỏ cách Linh nửa mét, bắt đầu tâm sự)
const s2 = graph.nodes.find(n => n.id === "generate-7k2q4l");
if (s2) {
  s2.data.duration = 10;
  s2.data.status = "idle";
  s2.data.prompt = `[@Image 1]: Nhân vật nữ chính (Linh). Giữ chuẩn xác 100% ngũ quan khuôn mặt, ánh mắt có chiều sâu cảm xúc, mái tóc đen tự nhiên, chiếc váy thanh lịch trong ảnh đã duyệt.

[@Image 2]: Nhân vật nam chính (Minh). Giữ đúng cấu trúc khuôn mặt góc cạnh nam tính, kiểu tóc ngắn gọn gàng, áo sơ mi casual trong ảnh đã duyệt.

[@Image 3]: Bối cảnh sườn đê thoai thoải cạnh cầu thang bê tông và bờ sông đêm, phản chiếu ánh đèn le lói trên mặt nước, không gian yên bình.

CINEMATIC MASTERPIECE (10-SECOND CONTINUOUS LIVE-ACTION SCENE, 16:9 4K CINEMATIC TEXTURE):
Filmed on Arri Alexa Mini LF, 50mm Master Prime lens, f/2.0 shallow depth of field, authentic subtle film grain. Real human micro-textures: genuine skin pores, subtle fabric drape, loose strands of hair moving gently in the night river breeze. Natural cool moonlight key lighting paired with warm low-intensity distant streetlamp ambience.

CHOREOGRAPHED SHOT TIMELINE (0.00s – 10.00s):
• 0.00–4.00s (Sitting Down & Settling In):
Medium two-shot at eye level. Minh [@Image 2] takes the last step down the concrete staircase, walks softly across the grass, and sits down naturally on the grassy slope about half a meter beside Linh [@Image 1]. He leans his forearms against his knees, looking out at the reflective night river surface. Linh sits with her hands loosely resting on her lap, gazing sideways with a quiet, contemplative expression.

• 4.00–7.00s (Opening Dialogue & Concern):
Minh turns his head slightly toward Linh, his face caught in soft moonlight. With a caring, gentle expression, he speaks with authentic lip-sync: “Trễ rồi, gió sông lạnh đấy. Có chuyện gì buồn à?” (natural northern Vietnamese tone).

• 7.00–10.00s (Vulnerable Response):
Subtle slow push-in focusing slightly more on Linh [@Image 1]. Hearing his question, Linh looks down at the grass, her fingers gently pleating her dress hem before she turns slightly toward him. She replies with a soft, slightly wistful smile: “Không có gì đâu anh... Chỉ là thấy ngột ngạt quá thôi.” The night breeze softly sways her hair as the shot holds on their quiet connection.

AUDIO & SOUND DESIGN:
Riverside night ambient sound (quiet river ripples, soft night wind, gentle grass rustle). Crystal clear natural northern Vietnamese spoken dialogue matching lip motion. No music, no subtitles, smooth steady cinematography.`;
}

// Scene 3: generate-pkhu1a (Tâm sự sâu hơn bên bờ sông)
const s3 = graph.nodes.find(n => n.id === "generate-pkhu1a");
if (s3) {
  s3.data.duration = 10;
  s3.data.status = "idle";
  s3.data.prompt = `[@Image 1]: Nhân vật nữ chính (Linh). Giữ chuẩn xác 100% ngũ quan khuôn mặt, ánh mắt có chiều sâu cảm xúc, mái tóc đen tự nhiên, chiếc váy thanh lịch trong ảnh đã duyệt.

[@Image 2]: Nhân vật nam chính (Minh). Giữ đúng cấu trúc khuôn mặt góc cạnh nam tính, kiểu tóc ngắn gọn gàng, áo sơ mi casual trong ảnh đã duyệt.

[@Image 3]: Bối cảnh sườn đê cạnh bờ sông đêm, mặt nước lăn tăn phản chiếu ánh đèn thành phố từ xa.

CINEMATIC MASTERPIECE (10-SECOND CONTINUOUS LIVE-ACTION SCENE, 16:9 4K CINEMATIC TEXTURE):
Filmed on Arri Alexa Mini LF, 85mm portrait lens, f/1.8 optical bokeh. Atmospheric night lighting: soft directional moonlight (5600K) highlighting hair and facial contours, warm specular highlights on the dark river water behind.

CHOREOGRAPHED SHOT TIMELINE (0.00s – 10.00s):
• 0.00–5.00s (Linh's Introspection):
Close-up over-the-shoulder shot from behind Minh, focusing on Linh [@Image 1]. Her dark expressive eyes reflect the distant city lights across the river. Taking a slow breath, she speaks candidly with natural northern Vietnamese lip-sync: “Nhiều lúc em cứ nghĩ... nếu ngày trước mình quyết định khác đi...” Her voice is soft, honest, and contemplative.

• 5.00–10.00s (Minh's Reassurance):
Reverse close-up on Minh [@Image 2]. His masculine features soften with empathy. He looks into her eyes with a calm, reassuring smile, nodding gently as he speaks: “Chuyện qua rồi, quan trọng là hiện tại em thấy bình yên là được.” Linh's expression visibly relaxes, shoulders letting go of tension as she breathes out softly.

AUDIO & SOUND DESIGN:
Subtle riverside atmosphere, soft breeze, distant gentle night ambiance. Natural conversational northern Vietnamese voice with precise lip synchronization. No background music, cinematic realism.`;
}

// Scene 4: generate-5wuhb5 (Khoảnh khắc thấu hiểu & cùng đứng dậy)
const s4 = graph.nodes.find(n => n.id === "generate-5wuhb5");
if (s4) {
  s4.data.duration = 10;
  s4.data.status = "idle";
  s4.data.prompt = `[@Image 1]: Nhân vật nữ chính (Linh). Giữ chuẩn xác 100% ngũ quan khuôn mặt, ánh mắt có chiều sâu cảm xúc, mái tóc đen tự nhiên, chiếc váy thanh lịch trong ảnh đã duyệt.

[@Image 2]: Nhân vật nam chính (Minh). Giữ đúng cấu trúc khuôn mặt góc cạnh nam tính, kiểu tóc ngắn gọn gàng, áo sơ mi casual trong ảnh đã duyệt.

[@Image 3]: Bối cảnh bờ sông đêm, sườn đê và cầu thang bê tông, bầu trời đêm dịu mát.

CINEMATIC MASTERPIECE (10-SECOND CONTINUOUS LIVE-ACTION SCENE, 16:9 4K CINEMATIC TEXTURE):
Filmed on Arri Alexa Mini LF, 35mm lens, f/2.8 deep cinematic composition. Balanced night illumination, soft moonlight rim lighting around both characters.

CHOREOGRAPHED SHOT TIMELINE (0.00s – 10.00s):
• 0.00–5.00s (Shared Relief & Gratitude):
Medium two-shot framing both Linh [@Image 1] and Minh [@Image 2] sitting side-by-side on the grassy dyke slope. Linh looks at Minh and smiles a genuine, relieved smile, speaking warmly with natural lip movement: “Cảm ơn anh vì đã ngồi đây với em.” Minh gives a reassuring smile: “Ừ, về thôi, mai lại là một ngày mới rồi.”

• 5.00–10.00s (Standing Up Together):
Minh smoothly stands up from the grass, shakes off his knees, and offers a gentlemanly open hand to steady Linh. Linh gently takes his hand for support, rises to her feet, smooths her skirt, and together they turn toward the concrete stairs to walk up the dyke path side by side under the cool night sky. The camera slowly cranes back slightly, leaving a feeling of warmth and renewed hope.

AUDIO & SOUND DESIGN:
Riverside night ambient audio, gentle footsteps on grass, natural northern Vietnamese speech. Clean cinematic audio, natural realistic movement.`;
}

// Connect edges: ensure all 4 generate nodes have connections to Linh (image-oqdu1w), Minh (image-hfiad1), and Location (image-mkhwby)
const requiredEdges = [
  // Scene 1
  { source: "image-oqdu1w", target: "generate-s7de62" },
  { source: "image-hfiad1", target: "generate-s7de62" },
  { source: "image-mkhwby", target: "generate-s7de62" },
  { source: "image-7za4u1", target: "generate-s7de62" },
  // Scene 2
  { source: "image-oqdu1w", target: "generate-7k2q4l" },
  { source: "image-hfiad1", target: "generate-7k2q4l" },
  { source: "image-mkhwby", target: "generate-7k2q4l" },
  // Scene 3
  { source: "image-oqdu1w", target: "generate-pkhu1a" },
  { source: "image-hfiad1", target: "generate-pkhu1a" },
  { source: "image-mkhwby", target: "generate-pkhu1a" },
  // Scene 4
  { source: "image-oqdu1w", target: "generate-5wuhb5" },
  { source: "image-hfiad1", target: "generate-5wuhb5" },
  { source: "image-mkhwby", target: "generate-5wuhb5" },
];

requiredEdges.forEach(req => {
  const exists = graph.edges.some(e => e.source === req.source && e.target === req.target);
  if (!exists) {
    graph.edges.push({
      id: `xy-edge__${req.source}out-${req.target}in`,
      source: req.source,
      sourceHandle: "out",
      target: req.target,
      targetHandle: "in"
    });
  }
});

// Update graphs in database
db.prepare("UPDATE graphs SET data = ?, updated_at = ? WHERE project_id = 'prj_06d6f1c9496a'").run(
  JSON.stringify(graph),
  Date.now()
);

console.log("Graph updated successfully!");
console.log("Nodes count:", graph.nodes.length);
console.log("Edges count:", graph.edges.length);
