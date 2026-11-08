import json
import sqlite3
import time

muse_models = [
    {
        "id": "muse:musetalk",
        "label": "Muse AI · MuseTalk (Audio-Driven Real-time LipSync)",
        "kind": "video",
        "provider": "muse",
        "description": "MuseTalk đồng bộ khẩu hình môi thời gian thực từ file âm thanh/giọng nói vào ảnh hoặc video nhân vật.",
        "config": {
            "endpoint": "/musetalk/lip-sync",
            "method": "POST",
            "body": {
                "face_url": "{{image}}",
                "video_url": "{{video}}",
                "audio_url": "{{audio}}",
                "prompt": "{{prompt}}"
            },
            "jobPath": "id",
            "pollEndpoint": "/musetalk/status/{{job}}",
            "statusPath": "status",
            "doneValues": ["completed", "success", "succeeded"],
            "failedValues": ["failed", "error"],
            "resultPath": "output_url",
            "timeout": 600
        }
    },
    {
        "id": "muse:musev",
        "label": "Muse AI · MuseV (Virtual Human Video Generation)",
        "kind": "video",
        "provider": "muse",
        "description": "MuseV tạo video người ảo độ phân giải cao, chuyển động tự nhiên theo âm thanh/giọng nói và ảnh nhân vật.",
        "config": {
            "endpoint": "/musev/generate",
            "method": "POST",
            "body": {
                "image_url": "{{image}}",
                "audio_url": "{{audio}}",
                "prompt": "{{prompt}}",
                "ratio": "{{aspect}}"
            },
            "jobPath": "id",
            "pollEndpoint": "/musev/status/{{job}}",
            "statusPath": "status",
            "doneValues": ["completed", "success", "succeeded"],
            "failedValues": ["failed", "error"],
            "resultPath": "output_url",
            "timeout": 900
        }
    },
    {
        "id": "muse:voice-clone",
        "label": "Muse AI · MuseVoice (Voice Clone & Giọng nói từ âm thanh mẫu)",
        "kind": "audio",
        "provider": "muse",
        "description": "Nhân bản giọng nói (voice clone) từ file âm thanh mẫu; tổng hợp giọng đọc tiếng Việt/Anh chuẩn xác.",
        "config": {
            "endpoint": "/audio/voice-clone",
            "method": "POST",
            "body": {
                "text": "{{prompt}}",
                "reference_audio": "{{audio}}",
                "language": "vi",
                "speed": 1.0
            },
            "jobPath": "id",
            "pollEndpoint": "/audio/status/{{job}}",
            "statusPath": "status",
            "doneValues": ["completed", "success", "succeeded"],
            "failedValues": ["failed", "error"],
            "resultPath": "audio_url",
            "timeout": 300
        }
    }
]

# 1. Update models.ts file
with open(r'd:\phim ai thời trang\lib\models.ts', 'r', encoding='utf-8') as f:
    code = f.read()

presets_str = 'const PRESETS: Array<Omit<ModelRecord, "createdAt" | "builtin">> = ['
muse_json_blocks = ',\n'.join(json.dumps(m, ensure_ascii=False, indent=4) for m in muse_models)

if 'muse:musetalk' not in code:
    replacement = presets_str + '\n' + muse_json_blocks + ','
    code = code.replace(presets_str, replacement)
    with open(r'd:\phim ai thời trang\lib\models.ts', 'w', encoding='utf-8', newline='') as f:
        f.write(code)
    print("Updated lib/models.ts with Muse models!")

# 2. Insert into studio.db models table
conn = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = conn.cursor()
now_ms = int(time.time() * 1000)

for m in muse_models:
    c.execute('''INSERT OR REPLACE INTO models (id, label, kind, provider, description, config, builtin, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, 1, ?)''',
              (m['id'], m['label'], m['kind'], m['provider'], m['description'], json.dumps(m['config']), now_ms))

conn.commit()
print("Synced Muse models into studio.db!")
