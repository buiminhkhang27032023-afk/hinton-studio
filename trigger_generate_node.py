import sqlite3
import json
import requests

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()

# Get graph
row = c.execute("SELECT data FROM graphs WHERE project_id = 'prj_1507511d78c4'").fetchone()
graph = json.loads(row[0])

nodes_by_id = {n['id']: n for n in graph.get('nodes', [])}
node = nodes_by_id.get('generate-3bs3pw')
if not node:
    print("Node generate-3bs3pw not found!")
    exit(1)

incoming_edges = [e for e in graph.get('edges', []) if e.get('target') == 'generate-3bs3pw']
print(f"Found {len(incoming_edges)} incoming edges")

image_urls = []
for e in incoming_edges:
    src_node = nodes_by_id.get(e.get('source'), {})
    src_data = src_node.get('data', {})
    url = src_data.get('imageUrl') or src_data.get('result', {}).get('url')
    if url:
        image_urls.append(url)

print(f"Collected {len(image_urls)} images:")
for u in image_urls:
    print(" -", u)

prompt = node.get('data', {}).get('prompt', '')
print(f"Prompt length: {len(prompt)} chars")

# Public tunnel URL
public_base = "https://larry-indie-default-surrey.trycloudflare.com"
full_image_urls = [
    u if u.startswith("http") else f"{public_base}{u}"
    for u in image_urls
]

# Check model
model_id = "iooai:seedance20-special"
# If user or config needs
payload = {
    "modelId": model_id,
    "projectId": "prj_1507511d78c4",
    "nodeId": "generate-3bs3pw",
    "kind": "video",
    "vars": {
        "prompt": prompt,
        "images": full_image_urls,
        "image": full_image_urls[0],
        "duration": 15,
        "seconds": "15",
        "aspect": "16:9",
        "resolution": "720p"
    }
}

print("\nSubmitting to /api/run on dev server...")
res = requests.post("http://localhost:3210/api/run", json=payload, timeout=60)
print(f"Status: {res.status_code}")
try:
    print("Response JSON:", json.dumps(res.json(), indent=2, ensure_ascii=False))
except:
    print("Response text:", res.text)
