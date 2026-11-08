const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const gRow = db.prepare("SELECT data FROM graphs WHERE project_id = 'prj_06d6f1c9496a'").get();
if (gRow) {
  const g = JSON.parse(gRow.data);
  console.log("=== NODES ===");
  g.nodes.forEach(n => {
    console.log(`Node [${n.id}] (${n.type}):`);
    console.log(`  title: ${n.data?.title}`);
    console.log(`  label: ${n.data?.label}`);
    console.log(`  status: ${n.data?.status}`);
    console.log(`  duration: ${n.data?.duration}`);
    console.log(`  model: ${n.data?.model}`);
    console.log(`  imageUrl: ${n.data?.imageUrl}`);
    console.log(`  videoUrl: ${n.data?.videoUrl}`);
    console.log(`  prompt: ${n.data?.prompt ? n.data.prompt.substring(0, 150) + "..." : "none"}`);
  });
  console.log("\n=== EDGES ===");
  g.edges.forEach(e => {
    console.log(`Edge: ${e.source} (${e.sourceHandle || ''}) -> ${e.target} (${e.targetHandle || ''})`);
  });
}
