const fs = require("node:fs");
const path = require("path");

const filePath = path.join(__dirname, "../lib/models.ts");
let lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

// Remove the dangling lines between line 719 and line 752
// Let's find index of line 719: end of iooai:seedance 2.0 满血
let idxStart = -1;
let idxEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"model": "seedance 2.0 满血"')) {
    // find closing of this model
    for (let j = i; j < i + 30; j++) {
      if (lines[j].trim() === "},") {
        idxStart = j + 1; // start of dangling
        break;
      }
    }
  }
  if (lines[i].includes('"id": "iooai:seedance2.5 官渠"') && idxStart !== -1) {
    idxEnd = i; // start of seedance2.5 官渠
    break;
  }
}

console.log("Dangling range:", idxStart, "to", idxEnd);
if (idxStart !== -1 && idxEnd !== -1 && idxEnd > idxStart) {
  lines.splice(idxStart, idxEnd - idxStart);
  fs.writeFileSync(filePath, lines.join("\r\n"));
  console.log("Successfully removed dangling lines from lib/models.ts!");
} else {
  console.log("Could not find exact range.");
}
