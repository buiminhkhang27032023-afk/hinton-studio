const fs = require('fs');
const content = fs.readFileSync('d:/phim ai thời trang/lib/models.ts', 'utf8');

const regex = /\{\s*"id":\s*"(?:seedance|[^"]*seedance[^"]*)",[\s\S]*?"timeout":\s*\d+\s*\}\s*\}/gi;
let match;
while ((match = regex.exec(content)) !== null) {
  try {
    const obj = JSON.parse(match[0]);
    console.log('=== ID:', obj.id, '| Provider:', obj.provider, '| Endpoint:', obj.config?.endpoint);
    console.log('Body:', JSON.stringify(obj.config?.body, null, 2));
  } catch (e) {
    console.log('Raw snippet:', match[0].slice(0, 200));
  }
}
