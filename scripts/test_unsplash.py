import urllib.request
import json
import re

# Search Unsplash for fashion clothing images
queries = [
    ("outfit_blazer", "https://unsplash.com/napi/search/photos?query=blazer+outfit+flatlay&per_page=5"),
    ("outfit_dress", "https://unsplash.com/napi/search/photos?query=evening+dress+fashion+product&per_page=5"),
    ("outfit_trench", "https://unsplash.com/napi/search/photos?query=trench+coat+fashion+outfit&per_page=5"),
    ("outfit_tweed", "https://unsplash.com/napi/search/photos?query=tweed+jacket+fashion+lookbook&per_page=5"),
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for label, url in queries:
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            results = data.get('results', [])
            print(f"[{label}] found {len(results)} photos")
            for i, p in enumerate(results[:2]):
                regular_url = p['urls']['regular']
                desc = p.get('alt_description') or p.get('description') or 'Fashion item'
                print(f"   {i+1}: {desc[:60]} -> {regular_url}")
    except Exception as e:
        print(f"[{label}] error: {e}")
