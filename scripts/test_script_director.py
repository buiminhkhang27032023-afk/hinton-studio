import os
import sys
import json
import sqlite3
import urllib.request

def test():
    conn = sqlite3.connect('d:/phim ai thời trang/data/studio.db')
    cur = conn.cursor()
    row = cur.execute("SELECT value FROM settings WHERE key='provider'").fetchone()
    if not row:
        print("No provider found")
        return
    provider = json.loads(row[0])
    api_key = provider.get('apiKey', '')
    base_url = provider.get('baseUrl', 'https://api.buihuuthang.com/v1').rstrip('/')
    
    print(f"Testing LLM with baseUrl: {base_url}")
    
    prompt = """Bạn là Bộ Não Đạo Diễn Kịch Bản (Script-to-Production Director) của Hinton Studio (lấy cảm hứng từ Flova.ai).
Hãy phân tích kịch bản sau:
"Video lookbook 15s cho người mẫu nam. Cảnh 1 (0-5s): Toàn cảnh bước vào khách sạn 5 sao sang trọng trong bộ vest đen, camera lia góc thấp. Cảnh 2 (5-10s): Đổi sang áo khoác da biker jacket, bước đi tự tin trong hành lang neon, góc máy trung cảnh tracking. Cảnh 3 (10-15s): Đổi sang áo len cổ lọ cashmere màu be, xoay người nhìn vào ống kính mỉm cười. Yêu cầu: Giữ nguyên khuôn mặt người mẫu, đổi trang phục đúng nhịp cắt thẳng, chèn nhãn giá BST Thu Đông ở góc dưới."

Tài nguyên ảnh hiện có trong dự án:
- Asset 1: id="asset_man_suit", name="character_man_suit.png", description="Người mẫu nam mặc vest đen lịch lãm"

Hãy phân tích và trả về ĐÚNG ĐỊNH DẠNG JSON sau (không thêm bất kỳ markdown nào khác):
{
  "project_analysis": {
    "title": "Lookbook Quý Ông Thu Đông 15s",
    "genre": "Fashion Lookbook",
    "target_duration_sec": 15,
    "recommended_aspect": "9:16",
    "recommended_model": "iooai:omni_flash_10s",
    "model_reason": "Omni Flash hỗ trợ đổi nhiều bộ trang phục (@Ảnh1, @Ảnh2) giữ diện mạo tốt nhất."
  },
  "entities": {
    "characters": [
      {
        "id": "char_1",
        "name": "Người mẫu nam",
        "gender": "male",
        "matched_asset_id": "asset_man_suit",
        "matched_asset_name": "character_man_suit.png",
        "face_consistency": "strict"
      }
    ],
    "outfits": [
      { "id": "outfit_1", "name": "Bộ vest đen lịch lãm", "matched_asset_id": "asset_man_suit", "status": "matched" },
      { "id": "outfit_2", "name": "Áo khoác da Biker Jacket", "matched_asset_id": null, "status": "missing_asset" },
      { "id": "outfit_3", "name": "Áo len cổ lọ Cashmere màu be", "matched_asset_id": null, "status": "missing_asset" }
    ]
  },
  "constraints_and_warnings": [
    {
      "type": "asset_gap",
      "severity": "warning",
      "message": "Thiếu ảnh tham chiếu cho Outfit 2 (Áo da biker) và Outfit 3 (Áo len cashmere).",
      "suggestion": "Tải thêm 2 ảnh trang phục này hoặc để AI tự do suy luận theo text prompt."
    },
    {
      "type": "model_compatibility",
      "severity": "warning",
      "message": "Nếu dùng Seedance 2.5 快速版 (Single I2V), AI khó có thể đổi 3 bộ đồ trong cùng 1 clip mà không bị biến dạng.",
      "suggestion": "Nên dùng Omni Flash 10s hoặc chia thành 3 node Generate 5s độc lập trên Canvas."
    },
    {
      "type": "post_production_layer",
      "severity": "info",
      "message": "Yêu cầu 'Chèn nhãn giá BST Thu Đông ở góc dưới' thuộc về lớp Hậu kỳ đồ họa.",
      "suggestion": "Không đưa nhãn giá vào prompt video để tránh chữ rác; hãy dùng CapCut/SeeCut chèn overlay text sau khi xuất clip."
    }
  ],
  "shots": [
    {
      "shot_index": 1,
      "time_range": "00:00 - 00:05",
      "duration_sec": 5,
      "framing": "Toàn cảnh (Wide Shot)",
      "camera_movement": "Low-angle upward tilt & slow push in",
      "character_action": "Bước vào sảnh khách sạn 5 sao sang trọng",
      "outfit_id": "outfit_1",
      "transition_out": "Hard cut on beat",
      "prompt_en": "Cinematic wide shot, low-angle upward tilt, stylish handsome man wearing tailored sharp black suit stepping into a luxurious 5-star hotel lobby, warm ambient lighting, 35mm film grain, 8k resolution"
    },
    {
      "shot_index": 2,
      "time_range": "00:05 - 00:10",
      "duration_sec": 5,
      "framing": "Trung cảnh (Medium Tracking)",
      "camera_movement": "Side tracking dolly shot",
      "character_action": "Bước đi tự tin trong hành lang neon",
      "outfit_id": "outfit_2",
      "transition_out": "Hard cut on beat",
      "prompt_en": "Medium tracking shot, handsome male model confidently walking through a neon-lit architectural hallway, wearing sleek black leather biker jacket, dramatic atmospheric rim lighting, smooth steadycam"
    },
    {
      "shot_index": 3,
      "time_range": "00:10 - 00:15",
      "duration_sec": 5,
      "framing": "Cận cảnh bán thân (Close-up Three-Quarter)",
      "camera_movement": "Gentle 180 orbit turn and lock",
      "character_action": "Xoay người nhìn vào ống kính mỉm cười nhẹ",
      "outfit_id": "outfit_3",
      "transition_out": "Fade out",
      "prompt_en": "Close-up three-quarter portrait, handsome man in cozy beige cashmere turtleneck sweater turns smoothly toward the camera, subtle confident smile, soft warm bokeh, high fashion editorial look"
    }
  ],
  "master_prompt_unified": "High-fashion luxury lookbook film featuring handsome male model. Scene cuts sequentially across 3 distinct looks with exact face identity preservation...",
  "post_production_plan": {
    "video_layer": "Sinh 3 nhịp hình ảnh người mẫu và trang phục từ AI",
    "graphic_layer": "Nhãn giá và tên BST Thu Đông (Typography overlay)",
    "audio_layer": "Nhạc nền nhịp beat dứt khoát khớp các điểm cắt 5s và 10s"
  }
}
"""
    req_body = {
        "model": "gemini-3.5-flash",
        "messages": [
            {"role": "system", "content": "You are a professional film director and structured AI video planner. Always return strictly valid JSON conforming to the requested schema."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.2
    }
    
    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=json.dumps(req_body).encode('utf-8'),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            content = data['choices'][0]['message']['content']
            print("Response successfully received!")
            print(f"Length: {len(content)}")
            # verify json
            # remove code fences if any
            clean = content.strip()
            if clean.startswith("```json"):
                clean = clean[7:]
            if clean.startswith("```"):
                clean = clean[3:]
            if clean.endswith("```"):
                clean = clean[:-3]
            parsed = json.loads(clean.strip())
            print("JSON is valid!")
            print("Project title:", parsed.get("project_analysis", {}).get("title"))
            print("Shots count:", len(parsed.get("shots", [])))
            print("Constraints count:", len(parsed.get("constraints_and_warnings", [])))
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    test()
