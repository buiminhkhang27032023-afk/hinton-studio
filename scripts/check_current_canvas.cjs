const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("d:/phim ai thời trang/data/studio.db");
const row = db.prepare("SELECT data FROM graphs WHERE project_id = ?").get("prj_06d6f1c9496a");
const g = JSON.parse(row.data || "{}");
console.log("Nodes count:", g.nodes?.length, "Edges count:", g.edges?.length);
g.nodes?.forEach(n => {
  console.log(`[${n.id}] [${n.type}] name="${n.data?.name || n.data?.label || ''}" model="${n.data?.model || ''}" voice="${n.data?.voice || ''}" text="${(n.data?.prompt || n.data?.text || '').slice(0, 40)}" audioUrl="${n.data?.audioUrl || ''}" ref="${n.data?.referenceAudioUrl || ''}"`);
});
console.log("\nEdges:");
g.edges?.forEach(e => {
  console.log(`${e.source} (${e.sourceHandle || 'def'}) -> ${e.target} (${e.targetHandle || 'def'})`);
});
