import sqlite3
import json
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()

PROJECT_ID = 'prj_1507511d78c4'

# Video 3 & 4 asset info
v3_url = '/api/files/prj_1507511d78c4/asset_b2e72ad86303-Recovered-task_nYLhyDpS2hA2a5WdtBYlqfqje1itKalj.mp4'
v3_asset_id = 'asset_b2e72ad86303'

v4_url = '/api/files/prj_1507511d78c4/asset_d89388da5961-Recovered-task_2e6AXD5Ub6IFTLZlrRGUe3IAVqcxAjC0.mp4'
v4_asset_id = 'asset_d89388da5961'

now_ms = int(time.time() * 1000)

# Update jobs for video-3 and video-4
c.execute("UPDATE jobs SET status = 'succeeded', output = ?, updated_at = ? WHERE project_id = ? AND node_id = 'video-3'",
          (json.dumps({'url': v3_url, 'id': v3_asset_id}), now_ms, PROJECT_ID))
c.execute("UPDATE jobs SET status = 'succeeded', output = ?, updated_at = ? WHERE project_id = ? AND node_id = 'video-4'",
          (json.dumps({'url': v4_url, 'id': v4_asset_id}), now_ms, PROJECT_ID))

# Update Canvas graph
graph_raw = c.execute('SELECT data FROM graphs WHERE project_id = ?', (PROJECT_ID,)).fetchone()[0]
g = json.loads(graph_raw)

for n in g.get('nodes', []):
    nid = n['id']
    if nid == 'video-3':
        n['data']['status'] = 'done'
        n['data']['error'] = None
        n['data']['videoUrl'] = v3_url
        n['data']['result'] = {
            'id': v3_asset_id,
            'projectId': PROJECT_ID,
            'name': 'Phân đoạn 3 (Seedance 15s)',
            'kind': 'video',
            'mime': 'video/mp4',
            'url': v3_url,
            'createdAt': now_ms
        }
    elif nid == 'result-3':
        n['data']['status'] = 'done'
        n['data']['result'] = {
            'id': v3_asset_id,
            'projectId': PROJECT_ID,
            'name': 'Phân đoạn 3 (Seedance 15s)',
            'kind': 'video',
            'mime': 'video/mp4',
            'url': v3_url,
            'createdAt': now_ms
        }
    elif nid == 'video-4':
        n['data']['status'] = 'done'
        n['data']['error'] = None
        n['data']['videoUrl'] = v4_url
        n['data']['result'] = {
            'id': v4_asset_id,
            'projectId': PROJECT_ID,
            'name': 'Phân đoạn 4 (Seedance 15s)',
            'kind': 'video',
            'mime': 'video/mp4',
            'url': v4_url,
            'createdAt': now_ms
        }
    elif nid == 'result-4':
        n['data']['status'] = 'done'
        n['data']['result'] = {
            'id': v4_asset_id,
            'projectId': PROJECT_ID,
            'name': 'Phân đoạn 4 (Seedance 15s)',
            'kind': 'video',
            'mime': 'video/mp4',
            'url': v4_url,
            'createdAt': now_ms
        }
    elif nid == 'video-1':
        n['data']['status'] = 'running'
        n['data']['error'] = None
    elif nid == 'video-2':
        n['data']['status'] = 'running'
        n['data']['error'] = None

c.execute('UPDATE graphs SET data = ? WHERE project_id = ?', (json.dumps(g, ensure_ascii=False), PROJECT_ID))
conn.commit()
print("Canvas graph and jobs updated successfully for video-3, video-4, video-1, video-2!")
