import sqlite3
import json
import time

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()

tasks_to_add = [
    {
        "id": "job_combat_seedance25_15s",
        "project_id": "prj_combat_seedance_15s",
        "node_id": "node-generate",
        "kind": "video",
        "model": "seedance2.5 快速版",
        "status": "succeeded",
        "input": json.dumps({"prompt": "Epic blockbuster superhero martial arts combat action film, 15 seconds. Reference the handsome muscular Asian man from image as the combat hero...", "seconds": "15", "resolution": "720p", "aspect": "16:9", "cost": 1.5}),
        "output": "/api/files/prj_combat_seedance_15s/male_combat_battle_seedance25_15s.mp4",
        "error": None,
        "provider_job": "task_RWBsuM10beW3G4VguLt49VKdSeDO7QTa",
        "created_at": 1792943777000,
        "updated_at": 1792944134000
    },
    {
        "id": "job_male_lookbook_seedance25_15s",
        "project_id": "prj_zfold8_commercial_10s",
        "node_id": "node-generate",
        "kind": "video",
        "model": "seedance2.5 快速版",
        "status": "succeeded",
        "input": json.dumps({"prompt": "High-fashion commercial 15s film. Reference the handsome Asian male model from image. 00:00–00:05: Ground-level extreme low-angle shot...", "seconds": "15", "resolution": "720p", "aspect": "9:16", "cost": 1.5}),
        "output": "/api/files/prj_zfold8_commercial_10s/male_lookbook_seedance25_fast_15s.mp4",
        "error": None,
        "provider_job": "task_NiTQx9Pd9wbV5TTIzUddAwIrd4TvMFrB",
        "created_at": 1792943413000,
        "updated_at": 1792943700000
    },
    {
        "id": "job_female_lookbook_seedance25_15s",
        "project_id": "prj_a9c0d8476382",
        "node_id": "video",
        "kind": "video",
        "model": "seedance2.5 快速版",
        "status": "succeeded",
        "input": json.dumps({"prompt": "Cinematic high fashion commercial, beautiful Asian woman, 4k", "seconds": "15", "resolution": "720p", "cost": 1.5}),
        "output": "/api/files/prj_a9c0d8476382/lookbook_seedance25_fast_15s.mp4",
        "error": None,
        "provider_job": "task_fNyU74IE0zIpUqe4m3C9HXipoNiOayYF",
        "created_at": 1792941923000,
        "updated_at": 1792942380000
    },
    {
        "id": "job_canvas_omni_lookbook_10s",
        "project_id": "prj_a9c0d8476382",
        "node_id": "video",
        "kind": "video",
        "model": "omni_flash_10s",
        "status": "succeeded",
        "input": json.dumps({"prompt": "Dùng @Ảnh1 @Ảnh2 @Ảnh3 @Ảnh4 @Ảnh5 làm tham chiếu ngoại hình toàn thân và các bộ trang phục của cùng một người mẫu trưởng thành...", "seconds": "10", "resolution": "720p", "aspect": "9:16", "cost": 0.8}),
        "output": "/api/files/prj_a9c0d8476382/lookbook_omni_multi_outfit_10s.mp4",
        "error": None,
        "provider_job": "task_Jb9Hf0GXOPVzzArJ5B0ewz1BDmLKeCxG",
        "created_at": 1792941988000,
        "updated_at": 1792942107000
    },
    {
        "id": "job_omni_test_probe_10s",
        "project_id": "prj_hardware_10s",
        "node_id": "video",
        "kind": "video",
        "model": "omni_flash_10s",
        "status": "succeeded",
        "input": json.dumps({"prompt": "Cinematic fashion model walking gracefully, photorealistic, 4k", "seconds": "10", "cost": 0.8}),
        "output": "https://api.iooai.cn/media/omni_probe.mp4",
        "error": None,
        "provider_job": "task_GyIFVLM6rcbEl7hP0JANotUgnO7AEZOf",
        "created_at": 1792941810000,
        "updated_at": 1792941960000
    },
    {
        "id": "job_seedance20_special_multi_fail",
        "project_id": "prj_a9c0d8476382",
        "node_id": "video",
        "kind": "video",
        "model": "seedance2.0 特价",
        "status": "failed",
        "input": json.dumps({"prompt": "Lookbook prompt multi-image", "seconds": "15"}),
        "output": None,
        "error": "该视频模式暂未开放 (Upstream ByteDance: multi-image not opened on 2.0)",
        "provider_job": "task_iGxesgtqFPNhr6QupbJxmXKF8xZ7uUDg",
        "created_at": 1792941844000,
        "updated_at": 1792941858000
    },
    {
        "id": "job_seedance20_special_single_fail",
        "project_id": "prj_a9c0d8476382",
        "node_id": "video",
        "kind": "video",
        "model": "seedance2.0 特价",
        "status": "failed",
        "input": json.dumps({"prompt": "Cinematic high fashion commercial 15s", "seconds": "15"}),
        "output": None,
        "error": "该视频模式暂未开放 (Upstream ByteDance)",
        "provider_job": "task_zMMP9lO9bvPxXWnvXAIMokHKHRaPaLe1",
        "created_at": 1792941824000,
        "updated_at": 1792941836000
    },
    {
        "id": "job_seedance25_fast_30s_test",
        "project_id": "prj_zfold8_commercial_10s",
        "node_id": "node-generate",
        "kind": "video",
        "model": "seedance2.5 快速版",
        "status": "succeeded",
        "input": json.dumps({"prompt": "Cinematic 30s fashion commercial. Beautiful Asian woman model walking with confident pose...", "seconds": "30", "cost": 2.2}),
        "output": "https://api.iooai.cn/media/seedance30s.mp4",
        "error": None,
        "provider_job": "task_9LGlNiBvnot08J4RuBIkWCBArwWEmZ6m",
        "created_at": 1792943156000,
        "updated_at": 1792943500000
    }
]

for t in tasks_to_add:
    c.execute("""
        INSERT OR REPLACE INTO jobs (id, project_id, node_id, kind, model, status, input, output, error, provider_job, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        t["id"], t["project_id"], t["node_id"], t["kind"], t["model"], t["status"],
        t["input"], t["output"], t["error"], t["provider_job"], t["created_at"], t["updated_at"]
    ))

conn.commit()
print(f"Synced {len(tasks_to_add)} recent tasks into jobs table!")
