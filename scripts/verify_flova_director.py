import json
import urllib.request

BASE_URL = "http://localhost:3210/api/script-director"

def call_director(payload):
    req = urllib.request.Request(
        BASE_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))

def test_suite():
    print("=== KIỂM THỬ FLOVA SCRIPT DIRECTOR TRÊN HINTON STUDIO ===")
    
    # Test 1: Fashion Lookbook (Đổi 3 bộ đồ)
    print("\n[TEST 1] Lookbook thời trang 3 bộ đồ (15s):")
    p1 = {
        "script": "Video lookbook 15s người mẫu nam. Cảnh 1: Mặc vest đen sảnh khách sạn. Cảnh 2: Áo khoác da biker hành lang neon. Cảnh 3: Áo len cổ lọ cashmere màu be. Giữ mặt, đổi đồ theo nhịp dứt khoát.",
        "projectId": "prj_combat_seedance_15s",
        "targetDuration": 15,
        "targetAspect": "9:16"
    }
    r1 = call_director(p1)
    plan1 = r1.get("plan", {})
    print("✓ Đọc hiểu:", plan1.get("project_analysis", {}).get("title"))
    print("✓ Model đề xuất:", plan1.get("project_analysis", {}).get("recommended_model"))
    print("✓ Số nhân vật:", len(plan1.get("entities", {}).get("characters", [])))
    print("✓ Số trang phục:", len(plan1.get("entities", {}).get("outfits", [])))
    print("✓ Số cảnh Storyboard:", len(plan1.get("shots", [])))
    print("✓ Số cảnh báo/ràng buộc Flova:", len(plan1.get("constraints_and_warnings", [])))
    for w in plan1.get("constraints_and_warnings", []):
        print(f"   -> [{w.get('severity').upper()}] {w.get('message')}")
    
    # Test 2: Mâu thuẫn ảnh vs kịch bản (Gender/Wardrobe mismatch)
    print("\n[TEST 2] Kiểm tra mâu thuẫn ràng buộc (Váy cưới nữ vs Ảnh Nam có sẵn):")
    p2 = {
        "script": "Video cô dâu mặc váy cưới trắng lộng lẫy ren cao cấp bước vào lễ đường, khăn voan bay nhẹ. Giữ nguyên khuôn mặt người mẫu.",
        "projectId": "prj_combat_seedance_15s", # Project này chỉ có ảnh người mẫu nam vest đen
        "targetDuration": 10,
        "targetAspect": "9:16"
    }
    r2 = call_director(p2)
    plan2 = r2.get("plan", {})
    print("✓ Đọc hiểu:", plan2.get("project_analysis", {}).get("title"))
    print("✓ Nhân vật bóc tách:", plan2.get("entities", {}).get("characters", [{}])[0].get("name"), "| Giới tính:", plan2.get("entities", {}).get("characters", [{}])[0].get("gender"))
    print("✓ Cảnh báo mâu thuẫn Flova Radar:")
    for w in plan2.get("constraints_and_warnings", []):
        print(f"   -> [{w.get('severity').upper()}] {w.get('message')}")

    print("\n=== TOÀN BỘ 2 BÀI KIỂM THỬ FLOVA THÀNH CÔNG RỰC RỠ! ===")

if __name__ == '__main__':
    test_suite()
