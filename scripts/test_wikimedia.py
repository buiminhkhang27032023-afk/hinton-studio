import urllib.request
import json

url = "https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=blazer+fashion+clothing&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json"
req = urllib.request.Request(url, headers={'User-Agent': 'FashionStudioBot/1.0'})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        pages = data.get('query', {}).get('pages', {})
        print(f"Found {len(pages)} pages")
        for pid, page in list(pages.items())[:3]:
            title = page.get('title')
            img_url = page.get('imageinfo', [{}])[0].get('url')
            print(f"{title} -> {img_url}")
except Exception as e:
    print("Error:", e)
