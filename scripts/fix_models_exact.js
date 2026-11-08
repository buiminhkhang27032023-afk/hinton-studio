const fs = require("node:fs");
const path = require("path");

const filePath = path.join(__dirname, "../lib/models.ts");
let lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);

const cleanSnippet = [
  '  {',
  '    "id": "iooai:seedance 2.0 满血",',
  '    "label": "IOOAI · Seedance 2.0 满血 (Bản Đầy Đủ Cao Cấp)",',
  '    "kind": "video",',
  '    "provider": "iooai",',
  '    "description": "Bản Full-blood của Seedance 2.0, chuyển động mượt mà và biểu cảm nét.",',
  '    "config": {',
  '      "endpoint": "/videos",',
  '      "method": "POST",',
  '      "body": {',
  '        "model": "seedance 2.0 满血",',
  '        "prompt": "{{prompt}}",',
  '        "seconds": "{{duration}}",',
  '        "images": "{{images}}"',
  '      },',
  '      "jobPath": "id",',
  '      "pollEndpoint": "/videos/{{job}}",',
  '      "statusPath": "status",',
  '      "doneValues": [',
  '        "completed",',
  '        "success"',
  '      ],',
  '      "failedValues": [',
  '        "failed",',
  '        "error"',
  '      ],',
  '      "resultPath": "video_url",',
  '      "timeout": 900',
  '    }',
  '  },',
  '  {',
  '    "id": "iooai:seedance2.5 官渠",',
  '    "label": "IOOAI · Seedance 2.5 Kênh Chính Thức (Video 15s Chuẩn Gốc · 10.5 Tệ)",',
  '    "kind": "video",',
  '    "provider": "iooai",',
  '    "description": "Kênh chính hãng ByteDance trực tiếp qua IOOAI, độ phân giải cao và tính toàn vẹn nhân vật cao nhất.",',
  '    "config": {',
  '      "endpoint": "/videos",',
  '      "method": "POST",',
  '      "body": {',
  '        "model": "seedance2.5 官渠",',
  '        "prompt": "{{prompt}}",',
  '        "seconds": "15",',
  '        "ratio": "{{aspect}}",',
  '        "images": "{{images}}"',
  '      },',
  '      "jobPath": "id",',
  '      "pollEndpoint": "/videos/{{job}}",',
  '      "statusPath": "status",',
  '      "doneValues": [',
  '        "completed",',
  '        "succeeded",',
  '        "success"',
  '      ],',
  '      "failedValues": [',
  '        "failed",',
  '        "error"',
  '      ],',
  '      "resultPath": "video_url",',
  '      "timeout": 900',
  '    }',
  '  },'
];

let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('"id": "iooai:seedance 2.0 满血"')) {
    startIdx = i - 1; // pointing to '  {'
  }
  if (lines[i].includes('"id": "kling:v1.5-pro"') && startIdx !== -1) {
    endIdx = i - 1; // pointing to '  {' of kling
    break;
  }
}

console.log("Replacing lines from", startIdx, "to", endIdx);
if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx, ...cleanSnippet);
  fs.writeFileSync(filePath, lines.join("\r\n"));
  console.log("Successfully replaced snippet in lib/models.ts!");
} else {
  console.error("Could not find startIdx or endIdx");
}
