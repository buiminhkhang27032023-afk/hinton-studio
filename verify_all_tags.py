import sqlite3, json, os

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
c = conn.cursor()
row = c.execute("SELECT data FROM graphs WHERE project_id = 'prj_1507511d78c4'").fetchone()
graph = json.loads(row[0])
nodes_by_id = {n['id']: n for n in graph.get('nodes', [])}
edges = graph.get('edges', [])

incoming = [e for e in edges if e.get('target') == 'generate-3bs3pw']

print("=== INCOMING EDGES (ORDER THAT THE SYSTEM SENDS AS IMAGES 1 TO 8) ===")
for i, e in enumerate(incoming, 1):
    src = nodes_by_id.get(e.get('source'), {})
    d = src.get('data', {})
    url = d.get('imageUrl') or d.get('result', {}).get('url')
    name = d.get('name')
    print(f"Position {i} (@image{i}):")
    print(f"  Source Node ID : {src.get('id')}")
    print(f"  Node Name      : {name}")
    print(f"  Image URL      : {url}")
    print()

target_node = nodes_by_id.get('generate-3bs3pw', {})
prompt = target_node.get('data', {}).get('prompt', '')

print("=== PROMPT TAGS AS CURRENTLY WRITTEN ===")
for line in prompt.split('\n'):
    if line.strip().startswith('@'):
        print(line[:100])
