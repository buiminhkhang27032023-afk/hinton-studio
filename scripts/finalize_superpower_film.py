import sqlite3
import json
import os
import subprocess
import time

PROJECT_ID = "prj_superpower_20s"
BASE_DIR = "d:/phim ai thời trang"
ASSET_DIR = f"{BASE_DIR}/data/assets/{PROJECT_ID}"

shot1 = f"{ASSET_DIR}/shot_1_tam_bao.mp4"
shot2 = f"{ASSET_DIR}/shot_2_loi_hoa.mp4"
shot3 = f"{ASSET_DIR}/shot_3_doi_dau.mp4"
shot4 = f"{ASSET_DIR}/shot_4_thuc_tinh.mp4"

shots = [shot1, shot2, shot3, shot4]
missing = [s for s in shots if not os.path.exists(s)]
if missing:
    print(f"Waiting for shots: {missing}")
    exit(1)

print("All 4 shots exist! Assembling 20s movie...")
list_file = f"{ASSET_DIR}/concat_list.txt"
with open(list_file, "w", encoding="utf-8") as f:
    for s in shots:
        safe_path = s.replace("\\", "/")
        f.write(f"file '{safe_path}'\n")

output_movie = f"{ASSET_DIR}/superpower_master_20s.mp4"
# Run ffmpeg concat
cmd = [
    "ffmpeg", "-y", "-f", "concat", "-safe", "0",
    "-i", list_file,
    "-c:v", "libx264", "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    output_movie
]
print("Running ffmpeg:", " ".join(cmd))
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("FFmpeg error:", res.stderr)
    exit(1)

print(f"Movie assembled successfully: {output_movie} ({os.path.getsize(output_movie)} bytes)")

# Update SQLite studio.db
conn = sqlite3.connect(f"{BASE_DIR}/data/studio.db")
c = conn.cursor()
now_ts = int(time.time() * 1000)

# Register assets
assets_data = [
    ("asset_shot_1", PROJECT_ID, "Shot 1 (0-5s): Tâm bão tình yêu", "video", "video/mp4", f"/api/files/{PROJECT_ID}/shot_1_tam_bao.mp4"),
    ("asset_shot_2", PROJECT_ID, "Shot 2 (5-10s): Lôi hỏa bùng nổ", "video", "video/mp4", f"/api/files/{PROJECT_ID}/shot_2_loi_hoa.mp4"),
    ("asset_shot_3", PROJECT_ID, "Shot 3 (10-15s): Đối đầu năng lượng", "video", "video/mp4", f"/api/files/{PROJECT_ID}/shot_3_doi_dau.mp4"),
    ("asset_shot_4", PROJECT_ID, "Shot 4 (15-20s): Nữ quyền thức tỉnh", "video", "video/mp4", f"/api/files/{PROJECT_ID}/shot_4_thuc_tinh.mp4"),
    ("asset_movie_master_20s", PROJECT_ID, "Phim Siêu Năng Lực 20s Hoàn Chỉnh", "video", "video/mp4", f"/api/files/{PROJECT_ID}/superpower_master_20s.mp4"),
]

for aid, pid, name, kind, mime, url in assets_data:
    c.execute("""
        INSERT OR REPLACE INTO assets(id, project_id, name, kind, mime, url, meta, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (aid, pid, name, kind, mime, url, json.dumps({"source": "runninghub:wan-2.6"}), now_ts))

# Update Graph nodes
row = c.execute("SELECT data FROM graphs WHERE project_id=?", (PROJECT_ID,)).fetchone()
if row:
    graph = json.loads(row[0])
    nodes = graph.get('nodes', [])
    for n in nodes:
        nid = n['id']
        if nid == 'node_tryon_nu':
            n['data']['status'] = 'done'
            n['data']['imageUrl'] = f"/api/files/{PROJECT_ID}/asset_07134c809a66-Th-----AI--N--ch-nh---V-y-d--h-i-h-ng.jpg"
            n['data']['result'] = {
                'id': 'asset_07134c809a66',
                'name': 'Thử đồ AI: Nữ chính + Váy dạ hội hồng',
                'kind': 'image',
                'url': f"/api/files/{PROJECT_ID}/asset_07134c809a66-Th-----AI--N--ch-nh---V-y-d--h-i-h-ng.jpg"
            }
        elif nid == 'node_shot_1':
            n['data']['status'] = 'done'
            n['data']['videoUrl'] = f"/api/files/{PROJECT_ID}/shot_1_tam_bao.mp4"
            n['data']['result'] = {
                'id': 'asset_shot_1',
                'name': 'Shot 1 (0-5s): Tâm bão tình yêu',
                'kind': 'video',
                'url': f"/api/files/{PROJECT_ID}/shot_1_tam_bao.mp4"
            }
        elif nid == 'node_shot_2':
            n['data']['status'] = 'done'
            n['data']['videoUrl'] = f"/api/files/{PROJECT_ID}/shot_2_loi_hoa.mp4"
            n['data']['result'] = {
                'id': 'asset_shot_2',
                'name': 'Shot 2 (5-10s): Lôi hỏa bùng nổ',
                'kind': 'video',
                'url': f"/api/files/{PROJECT_ID}/shot_2_loi_hoa.mp4"
            }
        elif nid == 'node_shot_3':
            n['data']['status'] = 'done'
            n['data']['videoUrl'] = f"/api/files/{PROJECT_ID}/shot_3_doi_dau.mp4"
            n['data']['result'] = {
                'id': 'asset_shot_3',
                'name': 'Shot 3 (10-15s): Đối đầu năng lượng',
                'kind': 'video',
                'url': f"/api/files/{PROJECT_ID}/shot_3_doi_dau.mp4"
            }
        elif nid == 'node_shot_4':
            n['data']['status'] = 'done'
            n['data']['videoUrl'] = f"/api/files/{PROJECT_ID}/shot_4_thuc_tinh.mp4"
            n['data']['result'] = {
                'id': 'asset_shot_4',
                'name': 'Shot 4 (15-20s): Nữ quyền thức tỉnh',
                'kind': 'video',
                'url': f"/api/files/{PROJECT_ID}/shot_4_thuc_tinh.mp4"
            }
        elif nid == 'node_result_movie':
            n['data']['status'] = 'done'
            n['data']['videoUrl'] = f"/api/files/{PROJECT_ID}/superpower_master_20s.mp4"
            n['data']['result'] = {
                'id': 'asset_movie_master_20s',
                'name': 'Phim Siêu Năng Lực 20s Hoàn Chỉnh',
                'kind': 'video',
                'url': f"/api/files/{PROJECT_ID}/superpower_master_20s.mp4"
            }

    c.execute("UPDATE graphs SET data=?, updated_at=? WHERE project_id=?", (json.dumps(graph), now_ts, PROJECT_ID))
    conn.commit()
    print("Database graphs & assets updated successfully!")
