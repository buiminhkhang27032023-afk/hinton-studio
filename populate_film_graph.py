import sqlite3
import json
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()

nodes = [
    {
        'id': 'char-female',
        'type': 'image',
        'position': {'x': 40, 'y': 240},
        'data': {
            'name': 'Nữ chính (Tham chiếu)',
            'imageUrl': '/api/files/prj_breakup_30s/female_turnaround.jpg',
            'result': {
                'id': 'asset_char_female',
                'name': 'Nhân vật Nữ',
                'kind': 'image',
                'url': '/api/files/prj_breakup_30s/female_turnaround.jpg'
            },
            'status': 'done'
        }
    },
    {
        'id': 'char-male',
        'type': 'image',
        'position': {'x': 40, 'y': 620},
        'data': {
            'name': 'Nam chính (Tham chiếu)',
            'imageUrl': '/api/files/prj_breakup_30s/male_turnaround.jpg',
            'result': {
                'id': 'asset_char_male',
                'name': 'Nhân vật Nam',
                'kind': 'image',
                'url': '/api/files/prj_breakup_30s/male_turnaround.jpg'
            },
            'status': 'done'
        }
    },
    {
        'id': 'script-overview',
        'type': 'prompt',
        'position': {'x': 320, 'y': 80},
        'data': {
            'text': 'Kịch bản Master 30s: Cơn Mưa Chia Tay\nThể loại: Phim ngắn tình cảm tâm lý lãng mạn điện ảnh.\nBối cảnh: Chiều mưa tầm tã trước hiên quán cafe hoài cổ, ánh đèn vàng ấm áp.\nÂm thanh: Tiếng mưa rơi, lời thoại nghẹn ngào tự nhiên.'
        }
    },
    {
        'id': 'scene-1-prompt',
        'type': 'prompt',
        'position': {'x': 320, 'y': 300},
        'data': {
            'text': 'Cảnh 1 (00:00–00:10): Toàn cảnh quán cafe kính mờ buổi chiều mưa. Hai nhân vật đứng trú mưa dưới mái hiên. Chàng trai cất lời: "Em... chúng ta thật sự phải thế này sao?"'
        }
    },
    {
        'id': 'scene-1-video',
        'type': 'generate',
        'position': {'x': 660, 'y': 300},
        'data': {
            'modelKind': 'video',
            'modelId': 'iooai:omni_flash_10s',
            'aspect': '16:9',
            'duration': 10,
            'resolution': '720p',
            'status': 'done',
            'result': {
                'id': 'asset_scene_1',
                'name': 'Cảnh 1: Quán Cafe Trú Mưa',
                'kind': 'video',
                'url': '/api/files/prj_breakup_30s/scene_1.mp4'
            }
        }
    },
    {
        'id': 'scene-2-prompt',
        'type': 'prompt',
        'position': {'x': 320, 'y': 620},
        'data': {
            'text': 'Cảnh 2 (00:10–00:20): Cận cảnh gương mặt nữ chính sau tròng kính tròn và kẹp tóc thỏ hồng. Mắt ngấn lệ, giọt nước mắt lăn chậm trên má. Cô thì thầm: "Em xin lỗi... Em trả lại tự do cho anh. Mình dừng lại thôi nhé."'
        }
    },
    {
        'id': 'scene-2-video',
        'type': 'generate',
        'position': {'x': 660, 'y': 620},
        'data': {
            'modelKind': 'video',
            'modelId': 'iooai:omni_flash_10s',
            'aspect': '16:9',
            'duration': 10,
            'resolution': '720p',
            'status': 'done',
            'result': {
                'id': 'asset_scene_2',
                'name': 'Cảnh 2: Cận Cảnh Giọt Nước Mắt',
                'kind': 'video',
                'url': '/api/files/prj_breakup_30s/scene_2.mp4'
            }
        }
    },
    {
        'id': 'scene-3-prompt',
        'type': 'prompt',
        'position': {'x': 320, 'y': 940},
        'data': {
            'text': 'Cảnh 3 (00:20–00:30): Chàng trai giơ tay định níu lấy nhưng buông xuôi bất lực. Cô gái bung chiếc ô trong suốt bước vào màn mưa. Bóng lưng xa dần trong ánh đèn xe lung linh.'
        }
    },
    {
        'id': 'scene-3-video',
        'type': 'generate',
        'position': {'x': 660, 'y': 940},
        'data': {
            'modelKind': 'video',
            'modelId': 'iooai:omni_flash_10s',
            'aspect': '16:9',
            'duration': 10,
            'resolution': '720p',
            'status': 'done',
            'result': {
                'id': 'asset_scene_3',
                'name': 'Cảnh 3: Buông Tay & Bước Đi',
                'kind': 'video',
                'url': '/api/files/prj_breakup_30s/scene_3.mp4'
            }
        }
    },
    {
        'id': 'master-film',
        'type': 'result',
        'position': {'x': 1020, 'y': 560},
        'data': {
            'status': 'done',
            'result': {
                'id': 'asset_breakup_master_30s',
                'name': 'Phim ngắn 30s: Cơn Mưa Chia Tay (Master)',
                'kind': 'video',
                'url': '/api/files/prj_breakup_30s/asset_master_breakup_film_30s.mp4'
            }
        }
    }
]

edges = [
    {'id': 'e-char-f-s1', 'source': 'char-female', 'target': 'scene-1-video', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {'legacyHandle': 'images'}},
    {'id': 'e-char-m-s1', 'source': 'char-male', 'target': 'scene-1-video', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {'legacyHandle': 'images'}},
    {'id': 'e-p1-s1', 'source': 'scene-1-prompt', 'target': 'scene-1-video', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {'legacyHandle': 'prompt'}},
    
    {'id': 'e-char-f-s2', 'source': 'char-female', 'target': 'scene-2-video', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {'legacyHandle': 'images'}},
    {'id': 'e-p2-s2', 'source': 'scene-2-prompt', 'target': 'scene-2-video', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {'legacyHandle': 'prompt'}},
    
    {'id': 'e-char-f-s3', 'source': 'char-female', 'target': 'scene-3-video', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {'legacyHandle': 'images'}},
    {'id': 'e-char-m-s3', 'source': 'char-male', 'target': 'scene-3-video', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {'legacyHandle': 'images'}},
    {'id': 'e-p3-s3', 'source': 'scene-3-prompt', 'target': 'scene-3-video', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {'legacyHandle': 'prompt'}},
    
    {'id': 'e-s1-m', 'source': 'scene-1-video', 'target': 'master-film', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {}},
    {'id': 'e-s2-m', 'source': 'scene-2-video', 'target': 'master-film', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {}},
    {'id': 'e-s3-m', 'source': 'scene-3-video', 'target': 'master-film', 'sourceHandle': 'out', 'targetHandle': 'in', 'data': {}}
]

graph_data = {
    'nodes': nodes,
    'edges': edges,
    'viewport': {'x': 100, 'y': 50, 'zoom': 0.75}
}

c.execute('UPDATE graphs SET data = ?, updated_at = ? WHERE project_id = ?', (json.dumps(graph_data), int(time.time()*1000), 'prj_breakup_30s'))
conn.commit()
print('Graph updated with full film pipeline successfully!')
