const fs = require('fs');
let content = fs.readFileSync('lib/models.ts', 'utf8');
content = content.replace(
  'IOOAI · Seedance 2.5 Kênh Chính Thức (Video 15s Chuẩn Gốc · 10.5 Tệ)',
  'IOOAI · Seedance 2.5 官渠 (Kênh Chính Thức ByteDance · 0.70 Tệ)'
);
content = content.replace(
  `"model": "seedance2.5 官渠",\r\n        "prompt": "{{prompt}}",\r\n        "seconds": "15"`,
  `"model": "seedance2.5 官渠",\r\n        "prompt": "{{prompt}}",\r\n        "seconds": "{{seconds}}"`
);
fs.writeFileSync('lib/models.ts', content, 'utf8');
console.log('Successfully patched lib/models.ts');
