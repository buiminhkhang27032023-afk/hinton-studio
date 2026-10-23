import urllib.request
import re

def search_unsplash_ids(query):
    url = f"https://unsplash.com/s/photos/{query}"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8')
            # Extract photo ids
            matches = re.findall(r'https://images\.unsplash\.com/photo-([a-zA-Z0-9_-]+)', html)
            # Unique
            seen = set()
            ids = [m for m in matches if not (m in seen or seen.add(m))]
            return ids
    except Exception as e:
        print(f"Error {query}: {e}")
        return []

for q in ["blazer-suit", "evening-gown", "autumn-trench-coat", "tweed-jacket"]:
    ids = search_unsplash_ids(q)
    print(f"Query '{q}': found {len(ids)} photos")
    for pid in ids[:3]:
        print(f"   photo-{pid}")
