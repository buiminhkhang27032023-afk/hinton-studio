const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const jobs = db.prepare("SELECT id, project_id, node_id, kind, model, status, error, provider_job, output, created_at, updated_at FROM jobs ORDER BY created_at DESC LIMIT 20").all();
console.log("Recent jobs count:", jobs.length);
console.log(JSON.stringify(jobs, null, 2));

const project = db.prepare("SELECT id, name, updated_at FROM projects ORDER BY updated_at DESC LIMIT 1").get();
console.log("\nActive project:", project);

if (project) {
  const graph = db.prepare("SELECT data FROM graphs WHERE project_id = ?").get(project.id);
  if (graph) {
    const parsed = JSON.parse(graph.data);
    console.log("\nGraph node count:", parsed.nodes ? parsed.nodes.length : 0);
    console.log("Nodes summary:", (parsed.nodes || []).map(n => ({
      id: n.id,
      type: n.type,
      title: n.data?.title,
      model: n.data?.model,
      duration: n.data?.duration,
      status: n.data?.status,
      prompt: n.data?.prompt ? n.data.prompt.slice(0, 100) + "..." : undefined
    })));
  }
}
