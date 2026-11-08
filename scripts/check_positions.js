const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const gRow = db.prepare("SELECT data FROM graphs WHERE project_id = 'prj_06d6f1c9496a'").get();
if (gRow) {
  const g = JSON.parse(gRow.data);
  console.log("Nodes positions:");
  g.nodes.forEach(n => {
    console.log(`[${n.id}] type=${n.type} x=${Math.round(n.position.x)} y=${Math.round(n.position.y)}`);
  });
}
