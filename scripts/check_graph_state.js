const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");

const project = db.prepare("SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC LIMIT 1").get();
console.log("Active project:", project);

const graphRow = db.prepare("SELECT data FROM graphs WHERE project_id = ?").get(project.id);
if (graphRow) {
  const g = JSON.parse(graphRow.data);
  console.log("Nodes in graph:");
  g.nodes.forEach(n => {
    if (n.type === 'generate') {
      console.log(`[${n.id}] status=${n.data?.status} modelId=${n.data?.modelId} duration=${n.data?.duration}`);
      console.log("  prompt preview:", (n.data?.prompt || '').slice(0, 100));
    }
  });
}
