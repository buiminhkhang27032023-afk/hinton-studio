import urllib.request

test_urls = [
    # Elegant blazer outfit
    ("blazer", "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=1080&q=80"),
    # Evening dress
    ("evening_dress", "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=1080&q=80"),
    # Autumn coat / trench
    ("trench_coat", "https://images.unsplash.com/photo-1544441893-675973e31985?w=1080&q=80"),
    # Elegant dress outfit
    ("chic_dress", "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1080&q=80"),
]

headers = {'User-Agent': 'Mozilla/5.0'}
for name, url in test_urls:
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            out_file = f"temp_{name}.jpg"
            with open(out_file, "wb") as f:
                f.write(content)
            print(f"Downloaded {name}: {len(content)} bytes -> {out_file}")
    except Exception as e:
        print(f"Error {name}: {e}")
