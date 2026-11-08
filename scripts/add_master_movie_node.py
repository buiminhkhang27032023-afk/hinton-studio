import sqlite3
import json

conn = sqlite3.connect(r'd:\phim ai thời trang\data\studio.db')
c = conn.cursor()

raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', ('prj_1507511d78c4',)).fetchone()[0]
g = json.loads(raw)

full_movie_url = '/api/files/prj_1507511d78c4/chiec_o_de_quen_full_60s.mp4'

# Check if result-master already exists
master_node = next((n for n in g.get('nodes', []) if n['id'] == 'result-master'), None)

if not master_node:
    # Find position of result-4
    r4 = next((n for n in g.get('nodes', []) if n['id'] == 'result-4'), None)
    pos_x = (r4['position']['x'] + 320) if r4 else 1800
    pos_y = r4['position']['y'] if r4 else 200
    
    master_node = {
        'id': 'result-master',
        'type': 'image',
        'position': {'x': pos_x, 'y': pos_y},
        'data': {
            'name': '🎬 PHIM HOÀN CHỈNH 60S: CHIẾC Ô ĐỂ QUÊN',
            'status': 'done',
            'videoUrl': full_movie_url,
            'result': {
                'id': 'asset_master_60s',
                'name': 'Chiếc Ô Để Quên (Bản Đầy Đủ 60s)',
                'kind': 'video',
                'mime': 'video/mp4',
                'url': full_movie_url
            }
        }
    }
    g['nodes'].append(master_node)
    
    # Add edge from result-4 to result-master
    g['edges'].append({
        'id': 'edge-r4-master',
        'source': 'result-4',
        'target': 'result-master',
        'type': 'studio'
    })
    
    c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), 'prj_1507511d78c4'))
    conn.commit()
    print("Master 60s movie node added to canvas!")
else:
    print("Master node already exists.")
