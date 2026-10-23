import urllib.request, json, urllib.parse

def search_wikimedia(query, limit=5):
    encoded = urllib.parse.quote(query)
    url = f"https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch={encoded}&gsrnamespace=6&prop=imageinfo&iiprop=url|size|extmetadata&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'FashionLookbookTool/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            pages = data.get('query', {}).get('pages', {})
            items = []
            for pid, page in pages.items():
                title = page.get('title', '')
                info = page.get('imageinfo', [{}])[0]
                url = info.get('url')
                w = info.get('width', 0)
                h = info.get('height', 0)
                if url and (url.endswith('.jpg') or url.endswith('.png') or url.endswith('.jpeg')):
                    items.append({'title': title, 'url': url, 'width': w, 'height': h})
            return items
    except Exception as e:
        print(f"Error {query}: {e}")
        return []

for q in ["blazer fashion outfit", "evening gown dress runway", "trench coat fashion", "tweed jacket fashion"]:
    results = search_wikimedia(q, 3)
    print(f"=== {q} ({len(results)} items) ===")
    for item in results[:3]:
        print(f"  {item['title'][:50]} ({item['width']}x{item['height']}): {item['url']}")
