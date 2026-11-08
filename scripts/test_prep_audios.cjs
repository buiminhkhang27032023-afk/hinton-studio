const path = require('path');
const fs = require('fs');

async function main() {
  const sources = [
    '/api/files/prj_06d6f1c9496a/asset_5ce858af-0bb-voice-omnivoice.wav',
    '/api/files/prj_06d6f1c9496a/asset_4262e34d-e3c-voice-omnivoice_custom.mp3'
  ];
  for (const s of sources) {
    const full = path.join('d:/phim ai thời trang/data/assets', s.replace('/api/files/', ''));
    console.log('File:', full, 'exists:', fs.existsSync(full));
  }
}
main();
