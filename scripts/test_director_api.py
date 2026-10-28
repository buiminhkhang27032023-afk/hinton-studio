import urllib.request
import json

def test():
    url = "http://localhost:3210/api/script-director"
    payload = {
        "script": "Video lookbook 15s cho người mẫu nam. Cảnh 1: Mặc vest đen bước vào khách sạn 5 sao. Cảnh 2: Đổi sang áo biker da đi trong hành lang neon. Cảnh 3: Đổi sang áo len cổ lọ cashmere màu be, xoay người mỉm cười. Yêu cầu giữ mặt người mẫu, đổi trang phục nhịp cắt thẳng.",
        "projectId": "prj_combat_seedance_15s",
        "targetDuration": 15,
        "targetAspect": "9:16"
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("API Success:", data.get("success"))
            plan = data.get("plan", {})
            print("Title:", plan.get("project_analysis", {}).get("title"))
            print("Recommended Model:", plan.get("project_analysis", {}).get("recommended_model"))
            print("Reason:", plan.get("project_analysis", {}).get("model_reason"))
            print("Characters:", len(plan.get("entities", {}).get("characters", [])))
            print("Outfits:", len(plan.get("entities", {}).get("outfits", [])))
            print("Warnings count:", len(plan.get("constraints_and_warnings", [])))
            for w in plan.get("constraints_and_warnings", []):
                print(f"  [{w.get('severity').upper()}] {w.get('message')} -> {w.get('suggestion')}")
            print("Shots count:", len(plan.get("shots", [])))
            for s in plan.get("shots", []):
                print(f"  Shot {s.get('shot_index')} ({s.get('time_range')}): {s.get('framing')} | {s.get('character_action')}")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    test()
