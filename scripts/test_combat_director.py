import urllib.request
import json

def test():
    url = "http://localhost:3210/api/script-director"
    payload = {
        "script": "Phim ngắn hành động chiến đấu 15s cho nhân vật nam. Cảnh 1 (0-5s): Đứng giữa đấu trường đổ nát, rút song đao ra thủ thế, ánh mắt sắc bén, camera lượn quanh 180 độ. Cảnh 2 (5-10s): Lao vọt tới né tránh luồng năng lượng của kẻ địch, lộn nhào chém một nhát cực mạnh xé toạc không gian, camera lia nhanh (whip-pan) theo nhịp chém. Cảnh 3 (10-15s): Tiếp đất dứt khoát làm nứt mặt đất, khói bụi bốc lên, tra đao vào bao, camera từ từ đẩy lại gần khuôn mặt uy nghiêm.",
        "projectId": "prj_combat_seedance_15s",
        "targetDuration": 15,
        "targetAspect": "16:9"
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            plan = data.get("plan", {})
            print("Title:", plan.get("project_analysis", {}).get("title"))
            print("Recommended Model:", plan.get("project_analysis", {}).get("recommended_model"))
            print("Reason:", plan.get("project_analysis", {}).get("model_reason"))
            print("Warnings count:", len(plan.get("constraints_and_warnings", [])))
            for w in plan.get("constraints_and_warnings", []):
                print(f"  [{w.get('severity').upper()}] {w.get('message')} -> {w.get('suggestion')}")
            print("Shots count:", len(plan.get("shots", [])))
            for s in plan.get("shots", []):
                print(f"  Shot {s.get('shot_index')} ({s.get('time_range')}): {s.get('framing')} | {s.get('camera_movement')} | {s.get('character_action')}")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    test()
