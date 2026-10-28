import sqlite3
import os

conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
cur = conn.cursor()

# Check available assets
assets = cur.execute("SELECT project_id, url FROM assets WHERE kind='image' OR url LIKE '%.jpg' OR url LIKE '%.png'").fetchall()
asset_map = {}
for p_id, url in assets:
    if p_id and p_id not in asset_map:
        asset_map[p_id] = url

# Also check specific known files
cur.execute("UPDATE projects SET thumbnail='/api/files/prj_breakup_30s/asset_poster_breakup.jpg' WHERE id='prj_breakup_30s'")
cur.execute("UPDATE projects SET thumbnail='/api/files/prj_wuxia_30s/asset_poster_kiem_hiep.jpg' WHERE id='prj_wuxia_30s'")

# For combat project, use the generated preview if available
for p_id, url in asset_map.items():
    cur.execute("UPDATE projects SET thumbnail=? WHERE id=? AND (thumbnail IS NULL OR thumbnail='')", (url, p_id))

# Also ensure combat project has a thumbnail
cur.execute("UPDATE projects SET thumbnail='/api/files/prj_breakup_30s/asset_poster_breakup.jpg' WHERE id='prj_combat_seedance_15s' AND (thumbnail IS NULL OR thumbnail='')")

conn.commit()
print("Thumbnails updated successfully!")
