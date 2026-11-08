const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");

const m = db.prepare("SELECT config FROM models WHERE id = 'iooai:MiniMax H3'").get();
if (m) {
  const conf = JSON.parse(m.config);
  conf.body = {
    model: "MiniMax H3",
    prompt: "{{prompt}}",
    seconds: "{{duration}}",
    input_reference: "{{image}}"
  };
  db.prepare("UPDATE models SET config = ? WHERE id = 'iooai:MiniMax H3'").run(JSON.stringify(conf));
  console.log("Updated MiniMax H3 config to use input_reference!");
}
