# Phân tích nguồn

Nguồn: https://www.tiktok.com/@hancontam/video/7695893631516986644

Kiểm tra 30/10/2026. Bản tải từ trình phát: 3559,226 giây (~59:19), 1024×576, H.264/AAC, khoảng 166 MB. Không suy ra đây là độ phân giải bản gốc của tác giả.

Phương pháp: đọc mô tả, lấy khung hình cách 3 phút xuyên suốt và xem thêm các mốc chọn lọc; chưa nghe/chép toàn bộ 59 phút. Mốc sau là khung quan sát, không phải ranh giới chương. Contact sheet: `output/tiktok-analysis/overview.jpg` trong workspace phân tích.

| Công cụ/kỹ thuật | Bằng chứng | Kết luận |
|---|---|---|
| ChatGPT | Mô tả và hội thoại/prompt/ảnh ở phần 12–27 phút | Thấy trực tiếp |
| ChatGPT Image | Tên ảnh, thao tác tạo ảnh; ở 45:00 nhắc ChatGPT Image 2.0 | Thấy nhãn, không chứng minh backend mọi bước |
| Seedance 2.0 | Mô tả; nhãn Seedance 2.0 Fast VIP tại 45:00 và seedance_2.0-fast tại 54:00 | Thấy nhãn trên giao diện |
| 即梦/Jimeng | Giao diện tạo sinh, phụ đề nhắc ở khoảng 51:00 | Thấy/nhắc trực tiếp, không suy ra mọi clip cùng provider |
| ComfyUI | Tên trong mô tả và hashtag | Chưa xác định được node, checkpoint hay JSON workflow cụ thể |
| IndexTTS2 | Tiêu đề demo, waveform và các thanh cảm xúc ở 57:00 | Thấy trực tiếp |
| TTS-Online | Giao diện trong contact sheet khoảng 45:00 | Chưa xác định URL/backend |
| Canvas nối tài nguyên | Nhiều ảnh, board và node video ở 51–54 phút | Không khẳng định canvas này là ComfyUI |
| Phần mềm dựng | Bài đăng có liên kết CapCut | Không đủ để khẳng định cả project dựng bằng CapCut |

Không thấy repo hoặc tệp `SKILL.md` do tác giả chia sẻ. Gói này tái dựng phương pháp, không phải skill gốc trích xuất.

## Bảy phần khóa học quan sát tại 51:00

1. Hiểu quy trình AI manhua/drama từ văn bản đến video.
2. Tìm nguồn và viết/chuyển thể kịch bản.
3. Làm nhân vật để tránh đổi mặt giữa các tập.
4. Làm bối cảnh thống nhất.
5. Phân cảnh 2×2/keyframe.
6. Chuyển phân cảnh thành video.
7. Sửa shot/lỗi cục bộ.

## Kỹ năng quan trọng

- **Character bible/expression sheet:** 21:00 có trước/nghiêng/sau và biểu cảm; 24:00 thấy thư viện nhiều nhân vật.
- **Location bible:** 30:00 sơ đồ ghi không gian, ánh sáng, đạo cụ, màu và nhiều góc cùng nơi.
- **Storyboard 2×2:** 33:00 giải thích bốn khung, một hành động/ô; 39:00 thấy prompt bốn shot kèm hai nhân vật và phòng.
- **Image-to-video/multi-shot:** 45:00 có prompt chia khung; 54:00 board tách thành bốn ảnh nối video. Đây là một triển khai cụ thể, không chứng minh mọi API hỗ trợ tương tự.
- **Âm thanh/continuity:** 50:00 nhắc hành động nối tiếp, thoại và máy rõ; mặc định không BGM, giữ ambience/action/dialogue. 57:00 có IndexTTS2 điều khiển cảm xúc.

## Nguồn chính thức để triển khai

- ComfyUI: https://github.com/Comfy-Org/ComfyUI
- API-format workflow: https://github.com/Comfy-Org/docs/blob/main/development/api-development/workflow-api-format.mdx
- IndexTTS: https://github.com/index-tts/index-tts
- Paper IndexTTS2: https://arxiv.org/abs/2506.21619

JSON API của ComfyUI khác JSON canvas UI. Không có workflow export gốc thì không quảng cáo một JSON tự đặt là bản gốc chạy được. IndexTTS là công cụ giọng nói, không phải video model. Demo tiếng Trung không đủ bảo đảm chất lượng tiếng Việt.
