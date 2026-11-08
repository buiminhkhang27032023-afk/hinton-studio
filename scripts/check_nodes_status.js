const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const gRow = db.prepare("SELECT data FROM graphs WHERE project_id = 'prj_06d6f1c9496a'").get();
if (gRow) {
  const g = JSON.parse(gRow.data);
  const genNodes = g.nodes.filter(n => n.type === 'generate');
  console.log("Generate nodes status:");
  genNodes.forEach(n => {
    console.log(`[${n.id}] status=${n.data?.status} modelId=${n.data?.modelId} videoUrl=${n.data?.videoUrl ? n.data.videoUrl.slice(0, 40) : 'none'} error=${n.data?.error}`);
  });
}
