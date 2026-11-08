import sqlite3
import json
import requests
import time
import os

task_id = "task_83z8bGI3IiFQMi1g5IzmVIbLC1LFsd24"
project_id = "prj_1507511d78c4"
node_id = "generate-3bs3pw"

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
c.execute("SELECT key, value FROM settings WHERE key = 'provider_iooai'")
ioo_cfg = json.loads(c.fetchone()[1])
key = ioo_cfg.get("apiKey")
headers = {"Authorization": f"Bearer {key}"}

print(f"Monitoring MiniMax H3 task {task_id} for node {node_id}...")

start_time = time.time()
while time.time() - start_time < 900: # 15 minutes timeout
    try:
        res = requests.get(f"https://api.iooai.cn/v1/videos/{task_id}", headers=headers, timeout=20)
        if res.status_code == 200:
            data = res.json()
            status = data.get("status")
            progress = data.get("progress", 0)
            print(f"[{int(time.time() - start_time)}s] Status: {status} | Progress: {progress}%")

            if status in ["completed", "succeeded", "success"]:
                video_url = data.get("output_url") or data.get("video_url") or (data.get("videos", [{}])[0].get("url"))
                print(f"\n>>> VIDEO GENERATED: {video_url} <<<")

                # Download video locally
                dest_dir = rf"d:\phim ai thời trang\data\assets\{project_id}"
                os.makedirs(dest_dir, exist_ok=True)
                dest_filename = "combat_scene_15s_minimax.mp4"
                dest_path = os.path.join(dest_dir, dest_filename)

                print(f"Downloading to {dest_path}...")
                v_res = requests.get(video_url, timeout=120)
                with open(dest_path, "wb") as f:
                    f.write(v_res.content)
                size_mb = os.path.getsize(dest_path) / 1024 / 1024
                print(f"Downloaded successfully ({size_mb:.2f} MB)!")

                local_asset_url = f"/api/files/{project_id}/{dest_filename}"
                asset_id = f"asset_combat_15s_{int(time.time())}"

                # Insert asset into database
                c.execute("""
                    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
                    VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
                """, (
                    asset_id,
                    project_id,
                    "Cảnh võ thuật bãi biển 15s (MiniMax H3)",
                    local_asset_url,
                    json.dumps({
                        "model": "MiniMax H3",
                        "duration": 15,
                        "providerJob": task_id,
                        "size": len(v_res.content),
                        "aspect": "16:9"
                    }),
                    int(time.time() * 1000)
                ))

                # Update node in graph
                row = c.execute("SELECT data FROM graphs WHERE project_id = ?", (project_id,)).fetchone()
                graph = json.loads(row[0])
                for n in graph.get("nodes", []):
                    if n.get("id") == node_id:
                        n["data"]["status"] = "done"
                        n["data"]["error"] = None
                        n["data"]["videoUrl"] = local_asset_url
                        n["data"]["result"] = {
                            "id": asset_id,
                            "projectId": project_id,
                            "name": "Cảnh võ thuật bãi biển 15s (MiniMax H3)",
                            "kind": "video",
                            "mime": "video/mp4",
                            "url": local_asset_url,
                            "createdAt": int(time.time() * 1000)
                        }

                c.execute("UPDATE graphs SET data = ? WHERE project_id = ?", (json.dumps(graph), project_id))

                # Update jobs table
                c.execute("""
                    UPDATE jobs SET status = 'succeeded', output = ?, updated_at = ?
                    WHERE provider_job = ?
                """, (local_asset_url, int(time.time() * 1000), task_id))

                conn.commit()
                print("All updates persisted to studio.db! Render complete!")
                break

            elif status in ["failed", "error", "cancelled"]:
                err = data.get("error", {})
                msg = err.get("message") or err.get("code") or "Thất bại"
                print(f"Task failed: {msg}")
                # Update node to error
                row = c.execute("SELECT data FROM graphs WHERE project_id = ?", (project_id,)).fetchone()
                graph = json.loads(row[0])
                for n in graph.get("nodes", []):
                    if n.get("id") == node_id:
                        n["data"]["status"] = "error"
                        n["data"]["error"] = msg
                c.execute("UPDATE graphs SET data = ? WHERE project_id = ?", (json.dumps(graph), project_id))
                c.execute("UPDATE jobs SET status = 'failed', error = ?, updated_at = ? WHERE provider_job = ?", (msg, int(time.time() * 1000), task_id))
                conn.commit()
                break

    except Exception as e:
        print("Polling error:", e)

    time.sleep(15)
conn.close()
