try {
  // Let's check typescript compilation on models.ts alone
  const { execSync } = require("node:child_process");
  const out = execSync("npx tsc --noEmit lib/models.ts", { encoding: "utf8" });
  console.log("TypeScript check passed:", out || "CLEAN! NO ERRORS!");
} catch (e) {
  console.log("TypeScript error:", e.stdout || e.message);
}
