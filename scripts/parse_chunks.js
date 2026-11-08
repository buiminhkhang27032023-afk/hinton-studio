const fs = require('fs');

const html = fs.readFileSync('scripts/xai_page.html', 'utf8');
const chunks = html.split('self.__next_f.push(');
console.log('Total chunks:', chunks.length);

for (let i = 0; i < chunks.length; i++) {
  const c = chunks[i];
  if (c.includes('minhkhang') || c.includes('Trợ Lý') || c.includes('Shorts') || c.includes('VO')) {
    console.log(`\n=== Chunk ${i} (length: ${c.length}) ===`);
    try {
      // Decode escaped json
      const cleaned = c.slice(0, 4000).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      console.log(cleaned);
    } catch {
      console.log(c.slice(0, 1000));
    }
  }
}
