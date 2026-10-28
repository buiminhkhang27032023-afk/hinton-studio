import sqlite3
import json
import time
import os

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()

dest_file = r'd:\phim ai thời trang\data\assets\prj_a9c0d8476382\lookbook_omni_multi_outfit_10s.mp4'
file_size = os.path.getsize(dest_file)
asset_id = 'asset_lookbook_omni_10s'
url = '/api/files/prj_a9c0d8476382/lookbook_omni_multi_outfit_10s.mp4'

c.execute("""
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
""", (
    asset_id,
    'prj_a9c0d8476382',
    'Lookbook-Omni-Multi-10s',
    url,
    json.dumps({'model': 'iooai:omni_flash_10s', 'duration': 10, 'size': file_size}),
    int(time.time() * 1000)
))

# Update graph result and video node
row = c.execute("SELECT data FROM graphs WHERE project_id='prj_a9c0d8476382'").fetchone()
if row:
    graph = json.loads(row[0])
    for n in graph.get('nodes', []):
        if n.get('id') == 'video':
            n['data']['status'] = 'succeeded'
            n['data']['modelId'] = 'iooai:omni_flash_10s'
            n['data']['model'] = 'IOOAI · Omni ảnh → video · 10s'
        if n.get('id') == 'result':
            n['data']['status'] = 'succeeded'
            n['data']['result'] = {
                'id': asset_id,
                'projectId': 'prj_a9c0d8476382',
                'name': 'Lookbook-Omni-Multi-10s',
                'kind': 'video',
                'mime': 'video/mp4',
                'url': url,
                'size': file_size
            }
    c.execute("UPDATE graphs SET data = ?, updated_at = ? WHERE project_id='prj_a9c0d8476382'",
              (json.dumps(graph), int(time.time() * 1000)))

conn.commit()
print("Registered asset and updated canvas graph successfully!")
