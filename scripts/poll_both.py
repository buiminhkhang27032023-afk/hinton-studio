import requests
import json
import os
import sys

headers = {
    'Authorization': 'Bearer YOUR_IOOAI_API_KEY'
}

# Check seedance2.5
s_res = requests.get('https://api.iooai.cn/v1/videos/task_fNyU74IE0zIpUqe4m3C9HXipoNiOayYF', headers=headers).json()
print("Seedance 2.5 快速版:", s_res.get('status'), f"{s_res.get('progress')}%", flush=True)
if s_res.get('output_url'):
    print(" -> Seedance URL:", s_res.get('output_url'), flush=True)

# Check if lookbook_omni_multi_outfit_10s.mp4 exists
omni_path = r'd:\phim ai thời trang\data\assets\prj_a9c0d8476382\lookbook_omni_multi_outfit_10s.mp4'
if os.path.exists(omni_path):
    print("Omni video downloaded! Size:", os.path.getsize(omni_path), flush=True)
else:
    print("Omni video not yet written on disk.", flush=True)
