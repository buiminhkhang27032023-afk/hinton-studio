const fs = require('fs');
const path = 'd:/phim ai thời trang/lib/models.ts';
let content = fs.readFileSync(path, 'utf8');

const omnivoiceModel = `  {
    "id": "omnivoice:male-vn-v2",
    "label": "🎙️ OmniVoice · Giọng Nam Chuẩn Voice-Lock v2 (1.2x Tốc Độ)",
    "kind": "audio",
    "provider": "omnivoice",
    "description": "Tổng hợp giọng đọc chuẩn Hinton Media: Khóa giọng nam v2 (voice-lock), tốc độ 1.2x dứt khoát ~4.6 âm tiết/giây.",
    "config": {
      "endpoint": "/api/audio/tts",
      "method": "POST",
      "body": {
        "text": "{{prompt}}",
        "voice": "omnivoice",
        "speed": 1.2,
        "language": "vi"
      },
      "resultPath": "url",
      "timeout": 300
    }
  },`;

if (!content.includes('omnivoice:male-vn-v2')) {
  content = content.replace(
    /\{\s*"id":\s*"muse:voice-clone"/,
    `${omnivoiceModel}\n  {\n    "id": "muse:voice-clone"`
  );
  fs.writeFileSync(path, content, 'utf8');
  console.log('Inserted omnivoice model successfully');
} else {
  console.log('Already exists');
}
