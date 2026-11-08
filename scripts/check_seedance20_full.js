const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");

const m = db.prepare("SELECT id, config FROM models WHERE id = 'iooai:seedance 2.0 满血'").get();
console.log("Config for seedance 2.0 满血:", m ? JSON.parse(m.config) : "not found");
