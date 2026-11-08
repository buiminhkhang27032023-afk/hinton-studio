const fs = require('fs');
const path = require('path');

function walk(dir) {
  let files = [];
  try {
    for (const item of fs.readdirSync(dir)) {
      if (item === 'node_modules' || item === '.next' || item === '.git' || item === '.venv') continue;
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        files = files.concat(walk(full));
      } else if (/\.(js|jsx|ts|tsx|json|py|md|html)$/.test(item)) {
        files.push(full);
      }
    }
  } catch (e) {}
  return files;
}

const all = walk('d:/phim ai thời trang');
console.log('Total files to scan:', all.length);
for (const f of all) {
  try {
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes('TTS Provider') || content.includes('tts-1') || content.includes('invalid_request_error')) {
      console.log('MATCH:', f);
      // print matching lines
      const lines = content.split('\n');
      lines.forEach((l, idx) => {
        if (l.includes('TTS Provider') || l.includes('tts-1') || l.includes('invalid_request_error')) {
          console.log(`  Line ${idx+1}: ${l.trim()}`);
        }
      });
    }
  } catch (e) {}
}
