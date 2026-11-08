---
name: ai-drama-production
description: Chuyển kịch bản thành phim AI qua khóa nhân vật, thiết kế bối cảnh, phân cảnh 2x2, prompt video, giọng nói và dựng. Dùng cho phim nhiều shot cần tính liên tục; không áp dụng cho clip thời trang đơn lẻ nếu không cần kể chuyện.
---

# AI Drama Production

Quy trình tái dựng độc lập từ bài hướng dẫn, không phải skill hay workflow gốc của tác giả. Đọc [bằng chứng nguồn](references/source-analysis.md) khi giải thích công nghệ; đọc [prompt theo bước](references/stage-prompts.md) khi thực hiện.

## Bắt đầu

Tận dụng kịch bản, nhân vật, ảnh và provider đã có. Giữ nội dung và vai người dùng đã chọn. Nếu chỉ có ý tưởng, đề xuất một phân đoạn ngắn để kiểm chứng trước khi làm hàng loạt. Yêu cầu chỉ làm quy trình thì xuất skill, không tự sinh clip trả phí.

Phân biệt SCENE (cùng không gian/thời điểm) và SHOT (một góc máy/hành động). Một scene 30 giây thường gồm nhiều shot. 3–6 giây/shot là điểm khởi đầu biên tập, không phải giới hạn model.

## Bảy mô-đun

1. **Kịch bản.** Lập beat-sheet: mục tiêu, trở ngại, thay đổi cảm xúc, kết quả. Chuyển nội tâm thành hành động/thoại quay được. Giữ lời thoại được yêu cầu; không viết lại toàn bộ chỉ vì đổi công cụ.
2. **Khóa nhân vật.** Character bible có ID, mặt chuẩn, toàn thân, tóc, tỷ lệ, outfit theo cảnh và đạo cụ. Từng người dùng nguồn nhận diện riêng, không trộn mặt. Ưu tiên mặt đúng hơn sheet đẹp. Khi cần diễn xuất, toàn thân có đủ đầu và chân. Tách chân dung khỏi sheet nhỏ cho shot cận. Bổ sung phần không thấy trong nguồn phải ghi là thiết kế mới.
3. **Khóa bối cảnh.** Có master establishing frame và sơ đồ vị trí: cửa, cửa sổ, bàn, ghế, lối đi, hướng sáng, thời điểm. Các góc mới thuộc cùng một căn phòng, không tái thiết kế kiến trúc độc lập.
4. **Board 2×2.** Mỗi ô một shot/trạng thái rõ, thứ tự trái→phải, trên→dưới. Ghi ID, cỡ cảnh, độ cao máy, hướng nhìn, đường đi, tay cầm đạo cụ, diễn xuất, trạng thái đầu/cuối. Kiểm tra trục 180°. Board để duyệt; không mặc định đưa cả collage vào image-to-video.
5. **Khung riêng và video.** Tách board rồi duyệt từng ảnh; tạo lại frame riêng nếu mặt nhỏ hoặc đạo cụ sai. Mặc định sinh từng shot. Chỉ multi-shot khi provider thực sự hỗ trợ; ghi cut/timing/refs rõ và không hứa mọi cut chính xác. Mỗi shot một hành động chính và một chỉ dẫn máy rõ. Chỉ gắn người xuất hiện, cùng bối cảnh tương ứng.
6. **Giọng/âm thanh.** Voice-ID riêng cho từng người, lưu ngôn ngữ, cảm xúc, thoại, WAV và duration đo thực. Chỉ dùng giọng được phép sử dụng. Không mặc định IndexTTS2 hỗ trợ tiếng Việt tốt vì thấy demo tiếng Trung. Tách thoại, ambience, Foley và nhạc; tắt BGM khi sinh clip nếu mix sau. Độ dài thoại quyết định timeline, không tăng tốc giọng vô cớ.
7. **Dựng/QC/sửa cục bộ.** Xem video thực: mặt/tóc, tay/chân, đạo cụ, cửa, hướng sáng, eyeline, thoại và điểm nối. Sửa shot hỏng, giữ shot đạt; đổi một biến mỗi lần. Sau hai lần sửa cùng lỗi, đổi cách chia shot hoặc nguồn tham chiếu. Không gọi slideshow/animatic là phim chuyển động hoàn chỉnh. Phụ đề theo lựa chọn người dùng, không áp quy định tin tức vào mọi phim.

## Năng lực, phép thuật và chiến đấu

Khi có đòn năng lượng/VFX, đọc [power-vfx.md](references/power-vfx.md): khóa thiết kế năng lực, nguồn sáng, hướng lực, occlusion, nhịp tụ/phóng/va chạm và phản ứng môi trường; tách shot khó thay vì nhồi nhiều biến đổi. Có phân tích mẫu 14 giây và prompt áp dụng. Không suy ra model hay phần mềm VFX từ thành phẩm.

## Tài nguyên và bàn giao

Xuất `character-bible.md`, `location-bible.md`, `shot-plan.json`, prompt ảnh/video theo shot, cùng thư mục `frames/`, `clips/`, `audio/`, `exports/` và `continuity.md`. Dùng ID/version; không ghi đè bản đạt. Shot-plan phải lưu scene, duration, nhân vật, ref, camera, hành động, trạng thái đầu/cuối và thoại.

Xem [ví dụ 24 giây](references/example-shot-plan.json) và [triển khai canvas](references/canvas-and-runtime.md). Ví dụ biên soạn mới, không phải đoạn phim trích từ tác giả.

## Tiện ích

- `python scripts/film_assets.py validate references/example-shot-plan.json`: kiểm tra ID, timeline, refs, continuity dữ liệu. Thêm `--check-files` khi tài nguyên thực đã có.
- `python scripts/film_assets.py split-board <board.png> --out <folder> --prefix S01`: chia 2×2 bằng FFmpeg; giữ nguồn và không ghi đè. Xem lại từng ô sau khi chia, đặc biệt mép và đường viền.

Shot-plan JSON không phải workflow ComfyUI có thể import. Trước khi submit, kiểm chứng model ID, schema, loại ref, duration, resolution, chi phí và khả năng provider thật. Nếu không có runtime, bàn giao prompt/manifest và nêu rõ chưa render; không giả thành phẩm.
