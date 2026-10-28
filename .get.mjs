import { DatabaseSync } from "node:sqlite";
const db = new DatabaseSync("data/studio.db");
const ioo = JSON.parse(db.prepare("SELECT value FROM settings WHERE key='provider_iooai'").get().value);
const r = await fetch("https://api.iooai.cn/v1/models", { headers: { Authorization: "Bearer " + ioo.apiKey } });
const j = await r.json();
console.log("status", r.status);
for (const m of j.data ?? []) console.log(m.id, "|", (m.supported_endpoint_types||[]).join(","));
