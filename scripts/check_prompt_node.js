const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const gRow = db.prepare("SELECT data FROM graphs WHERE project_id = 'prj_06d6f1c9496a'").get();
if (gRow) {
  const g = JSON.parse(gRow.data);
  const promptNode = g.nodes.find(n => n.id === 'prompt-qpwune');
  console.log("Prompt node full data:", JSON.stringify(promptNode, null, 2));

  console.log("\nAll nodes data:");
  g.nodes.forEach(n => {
    console.log(`[${n.id}] ${n.type}: data =`, JSON.stringify(n.data));
  });
}
