import requests
import json

url = "http://localhost:3210/api/run"
payload = {
    "modelId": "seed:image:gemini-compose",
    "kind": "image",
    "projectId": "prj_hardware_10s",
    "nodeId": "node_host_image",
    "name": "Nữ MC Kho Kim Khí (Ghép nhân vật vào bối cảnh)",
    "vars": {
        "prompt": (
            "Image 1 shows the character model: a beautiful young East Asian woman with layered shoulder-length wavy light-brown hair and delicate porcelain skin. "
            "Image 2 shows a real industrial hardware warehouse (kho hàng kim khí) aisle with tall metal shelves packed with power tools, air guns, drills, metal hardware parts, and industrial ceiling lighting. "
            "TASK: Create a brand new clean, photorealistic 9:16 vertical vlog/livestream photo. "
            "The exact woman from Image 1 (identical face, identical hair and haircut) is standing in the hardware warehouse aisle from Image 2. "
            "She is wearing a stylish neat black short-sleeve top. "
            "She is facing the camera with a bright, welcoming, professional smile, holding the camera selfie/vlog style with one hand while her other hand gestures toward the endless shelves of hardware tools and machinery behind her. "
            "Remove all stickers, text, logos, and UI overlays completely. The image must be clean, photorealistic 8k, crisp industrial lighting, authentic Vietnamese/Asian hardware warehouse setting."
        ),
        "modelImage": "/api/files/prj_hardware_10s/character_turnaround.jpg",
        "garmentImage": "/api/files/prj_hardware_10s/warehouse_ref.png"
    }
}

print("Sending request to Gemini Compose...")
res = requests.post(url, json=payload, timeout=300)
print("Status code:", res.status_code)
try:
    data = res.json()
    print("Response output:", json.dumps(data.get('output'), indent=2))
except Exception as e:
    print("Error parsing response:", e, res.text[:300])
