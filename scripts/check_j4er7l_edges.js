const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");

const graphRow = db.prepare("SELECT data FROM graphs WHERE project_id = 'prj_06d6f1c9496a'").get();
if (graphRow) {
  const g = JSON.parse(graphRow.data);
  const edges = g.edges.filter(e => e.target === 'generate-j4er7l');
  console.log("Edges into generate-j4er7l:");
  edges.forEach((e, idx) => {
    const srcNode = g.nodes.find(n => n.id === e.source);
    console.log(`Slot #${idx + 1}: [${e.source}] -> ${srcNode?.data?.imageUrl}`);
  });
}
