import sqlite3, json, requests, time, os

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()

# Get IOOAI key
c.execute("SELECT key, value FROM settings WHERE key = 'provider_iooai'")
ioo_cfg = json.loads(c.fetchone()[1])
key = ioo_cfg.get("apiKey")
headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

# Public base
c.execute("SELECT value FROM settings WHERE key = 'public_url'")
pub_val = json.loads(c.fetchone()[0])
public_base = pub_val.get("baseUrl")

# Get graph & incoming edges
row = c.execute("SELECT data FROM graphs WHERE project_id = 'prj_1507511d78c4'").fetchone()
graph = json.loads(row[0])
nodes_by_id = {n['id']: n for n in graph.get('nodes', [])}
edges = graph.get('edges', [])
incoming = [e for e in edges if e.get('target') == 'generate-3bs3pw']

images = []
for e in incoming:
    src = nodes_by_id.get(e.get('source'), {})
    d = src.get('data', {})
    rel_url = d.get('imageUrl') or d.get('result', {}).get('url')
    if rel_url:
        full_url = rel_url if rel_url.startswith("http") else f"{public_base}{rel_url}"
        images.append(full_url)

print(f"Collected {len(images)} images for 10s video:")
for i, u in enumerate(images, 1):
    print(f"  [@Image {i}]: {u}")

PROMPT_10S = """[@Image 1]: Tên sơn tặc C1 lao lên trước. Giữ đúng nhận diện, trang phục và vũ khí kiếm thô.
[@Image 2]: Tên sơn tặc C2 đánh bọc sườn bên cạnh. Giữ đúng nhận diện, trang phục và vũ khí riêng.
[@Image 3]: Nữ chính B1. Giữ đúng nhận diện khuôn mặt, vóc dáng, trang phục. Đứng phía sau nam chính.
[@Image 4]: Nữ chính B2. Giữ đúng nhận diện khuôn mặt, vóc dáng, trang phục, không hoán đổi với B1.
[@Image 5]: Bối cảnh bãi biển giao đấu. Giữ khoảng đất trống, nền cát ven biển, rặng cây và hướng nắng buổi sáng.
[@Image 6]: Bối cảnh bãi biển góc ngược. Giữ địa hình nhất quán và lối về phía biển khi đổi góc máy.
[@Image 7]: Khung cuối cảnh trước. Giữ bố cục, tư thế, vị trí nhân vật, trang phục và ánh sáng để nối tiếp mượt mà vào cảnh mới.
[@Image 8]: Nam chính. Giữ đúng 100% gương mặt trẻ trung, tóc đen ngắn tỉa textured undercut gọn hai bên gáy, áo sơ mi đũi màu be sáng cộc tay tua rua mộc mạc, áo gile denim màu xanh chàm (slate blue/indigo) ngắn ngang eo, quần soóc đũi xám than rách gấu tua rua có lỗ sờn, thắt lưng vải đen quấn eo buộc lệch bên hông, bốt da nâu cổ lửng buộc dây vấy bẩn bùn đất cát.

Create an exactly 10-second cinematic live-action martial arts fight scene, landscape 16:9. All five characters are adults. Use reference images [@Image 1] through [@Image 8] to strictly preserve each character's identity, face, hairstyle, physique, and clothing.

PHOTOGRAPHIC REALISM: Natural live-action 35mm film photography, authentic skin texture with natural pores, soft morning daylight, realistic sand displacement and dust kick-ups. No beauty filters, no waxy plastic skin, no stylized anime rendering.

GEOGRAPHY: Protagonist ([@Image 8]) stands firmly in front to protect the two women ([@Image 3], [@Image 4]) who retreat behind him toward the sea. The two bandits ([@Image 1], [@Image 2]) charge aggressively from inland.

CHOREOGRAPHY & TIMELINE (10 SECONDS):
- 0.00–2.00s — CHARGE: Seamless continuation from [@Image 7]. Bandit C1 ([@Image 1]) shouts fiercely in clear Vietnamese: “Bắt lấy hắn!” then charges with raised sword, bandit C2 ([@Image 2]) rushes half a step behind. The protagonist ([@Image 8]) plants his rear foot and advances forward into a grounded combat stance.
- 2.00–4.50s — EVADE & REDIRECT: Bandit C1 slashes diagonally downward. Protagonist steps outside the blade's path, intercepts the attacker's forearm with his left arm, controls the upper bicep with his right hand, and smoothly redirects the momentum, causing bandit C1 to stumble directly into bandit C2's charge line.
- 4.50–7.00s — FINISHING PUNCH: Protagonist rotates his hips and shoulders, delivering one explosive, solid right-fist punch straight into bandit C1's upper chest. Impact compresses fabric, sending C1 stumbling backward and collapsing hard onto the sand, dropping his blade.
- 7.00–10.00s — FINISHING KICK & RECOVERY: Bandit C2 lunges forward. Protagonist pivots smoothly on his supporting leg and drives a powerful side kick squarely into C2's torso. Torso recoils, C2 crashes flat onto the sand, losing his weapon. Protagonist retracts leg, plants firmly in a guarded martial arts stance, breathing heavily as sand dust settles.

AUDIO: Spoken line in clear, authentic Vietnamese: “Bắt lấy hắn!” at 0.5s. Realistic footsteps on sand, sword whooshes, solid bone-and-flesh combat impacts, body falls on sand, gentle ambient ocean waves and coastal wind. No background music, no subtitles, no blood, no supernatural powers."""

print(f"\nSubmitting 10-second video to Seedance 2.0 Chính Ngạch Mini ({len(PROMPT_10S)} chars)...")

payload = {
    "model": "seedance2.0 官渠 mini",
    "prompt": PROMPT_10S,
    "images": images,
    "seconds": "10",
    "ratio": "16:9"
}

res = requests.post("https://api.iooai.cn/v1/videos", headers=headers, json=payload, timeout=30)
print("Status code:", res.status_code)
print("Response:", res.text)

if res.status_code == 200:
    data = res.json()
    task_id = data.get("id") or data.get("task_id")
    print(f"\n>>> SUCCESS! Seedance 2.0 Task ID: {task_id} <<<")

    # Update node state in graph
    for n in graph.get('nodes', []):
        if n.get('id') == 'generate-3bs3pw':
            n['data']['status'] = 'running'
            n['data']['prompt'] = PROMPT_10S
            n['data']['duration'] = 10
            n['data']['seconds'] = "10"
            n['data']['modelId'] = 'iooai:seedance20-official-mini'
            n['data']['model'] = 'IOOAI · Seedance 2.0 Chính Ngạch Mini (Khóa mặt đa ảnh · 1.8 Tệ/15s)'
            n['data']['providerJob'] = task_id
            n['data']['error'] = None

    c.execute("UPDATE graphs SET data = ? WHERE project_id = 'prj_1507511d78c4'", (json.dumps(graph),))

    # Register job in studio.db
    job_id = f"job_seedance10s_{int(time.time())}"
    c.execute("""
        INSERT INTO jobs (id, project_id, node_id, kind, model, status, input, provider_job, created_at, updated_at)
        VALUES (?, ?, ?, 'video', 'iooai:seedance20-official-mini', 'running', ?, ?, ?, ?)
    """, (
        job_id,
        "prj_1507511d78c4",
        "generate-3bs3pw",
        json.dumps({"prompt": PROMPT_10S, "seconds": "10", "images_count": len(images)}),
        task_id,
        int(time.time() * 1000),
        int(time.time() * 1000)
    ))
    conn.commit()
    print("Database & Graph updated with running 10s task!")

    with open("d:/phim ai thời trang/current_10s_task.json", "w") as f:
        json.dump({"taskId": task_id, "projectId": "prj_1507511d78c4", "nodeId": "generate-3bs3pw"}, f)
