# Phân tích video thời trang và prompt tái dựng

Nguồn: 1793020617401_463316543748383866_g9000392215808858099.mp4
Thời lượng 16,1 giây; khung dọc 720 × 1280. Phân tích từ các khung hình lấy mẫu mỗi giây. Video không hiển thị prompt hay giao diện tạo ảnh; các prompt dưới đây là đề xuất tái dựng, không phải prompt gốc. Không thể kết luận chỉ từ hình ảnh rằng video được quay thật hay tạo bằng AI.

## 1. Những gì nhìn thấy

- Nhân vật nữ trưởng thành, tóc đen buộc đuôi ngựa cao, biểu cảm nhẹ nhàng.
- Bộ xanh navy: áo hai dây viền trắng, áo khoác tay dài mặc trễ vai, quần dài ôm phần trên và ống loe.
- Túi nhỏ màu nâu có quai xách và dây dài; giày bệt màu nude/be.
- Đường nhựa có hai vạch vàng, vỉa hè và hàng cây; ánh sáng ban ngày mềm.
- Đầu video khung gần, sau đó khung rộng thấy toàn thân. Người mẫu xoay lưng, quay lại, bước đi và cầm túi tạo dáng. Mốc dưới đây là gần đúng, không phải khẳng định ranh giới dựng/cắt.

## 2. Bộ ảnh tài nguyên nên tạo

A. Bảng nhận diện nhân vật: ba góc cơ thể không đầu trái và hai chân dung phải theo skill đã chốt. Dùng quản lý ngoại hình; không nên đưa nguyên bảng nhiều ô làm khung hình mở đầu video.
B. Ảnh trang phục riêng: chỉ bộ navy, túi nâu, giày nude trên nền trắng, không người. Làm rõ chính xác kết cấu và màu từng món.
C. Ảnh bối cảnh trống: đường và hàng cây, dọc 9:16, không người. Bố cục và góc máy khớp cảnh mong muốn.
D. Ảnh nhân vật đã mặc đồ trong bối cảnh: đây là ảnh đầu vào quan trọng cho image-to-video. Có thể chuẩn bị bản chính diện, 3/4 và sau lưng từ cùng một thiết kế đã chốt, thay vì sinh lại nhân vật từ đầu ở mỗi cảnh.

Giữ riêng ảnh mặt nguồn chất lượng cao để tham chiếu danh tính. Không dùng một chân dung để suy ra chắc chắn vóc dáng hay trang phục phía sau; những phần đó là thiết kế bổ sung cần giữ nhất quán sau khi đã chọn.

## 3. Prompt ảnh tài nguyên

### A. Bảng nhân vật

Create a photorealistic reference board of the adult woman in the supplied identity photo. Preserve her recognizable facial features and natural proportions. Hair is black in a high ponytail. Landscape white board with thin light gray dividers: three tall body-only panels on the left, front, exact side profile, and back, with clean non-graphic neckline termination and no heads, full shoes visible; two stacked head-and-shoulders portraits on the right, frontal above and three-quarter below. Outfit: navy camisole with thin white straps and white neckline piping, matching navy long-sleeve cropped outer layer worn below the shoulders, navy flared trousers, nude ballet flats. Consistent body proportions and garments across all views, relaxed arms, neutral studio lighting. No text or watermark.

Lưu ý: nếu dùng nhân vật riêng của người dùng, lấy danh tính từ ảnh họ gửi, chỉ lấy tóc/trang phục/bối cảnh mong muốn từ video.

### B. Trang phục riêng

Create a portrait clothing-only product image on a pure white background. A coordinated women's navy outfit displayed front-facing using an invisible mannequin presentation: fitted navy camisole with thin white straps and white piping around the neckline, matching navy long-sleeve cropped outer layer arranged slightly below shoulder level, high-waisted navy flared trousers. A small structured brown handbag with top handle and a long strap is arranged separately to the side, and a pair of nude ballet flats is aligned below the trouser legs. Show the complete garments and accessories with clear separation. No person, no skin, no hands, no visible mannequin, no portraits, no panels, no lettering, no logos. Realistic fabric texture, soft neutral catalog lighting.

Không để công cụ tự đổi thành đồ thể thao ôm bó, giày cao gót hoặc túi khác giữa các ảnh. Ảnh sản phẩm trắng dùng bóng nhẹ để thấy đường viền.

### C. Bối cảnh trống

Photorealistic vertical 9:16 background plate of a quiet tree-lined urban road in soft overcast daylight. Gray asphalt with two parallel yellow center lines receding diagonally into the distance, a paved sidewalk, evenly spaced trees with wooden support stakes and dense green foliage. Eye-level handheld fashion-video perspective with natural smartphone lens proportions. Empty scene, no people, no vehicles, no text, no logos. Soft natural shadows, restrained realistic colors, clear usable foreground for a full-body model.

### D. Khung hình bắt đầu

Use the supplied face reference for identity, the supplied outfit reference for clothing and accessories, and the supplied road image for environment. Create a photorealistic vertical 9:16 full-body fashion frame. The same adult woman stands naturally on the asphalt beside the double yellow road markings, facing the camera, wearing the exact navy outfit and nude ballet flats. Black hair in a high ponytail. Hold the same small brown handbag in her right hand. Keep the complete head and shoes inside the frame with room for movement. Soft daylight, realistic smartphone photography, natural body proportions, relaxed slight smile. Preserve exact garment colors, white piping, handbag shape, and location lighting. No text or watermark.

Đầu video mẫu khá gần mặt và thân trên; có thể tạo thêm bản trung cảnh từ cùng ảnh toàn thân để mở đầu, thay vì đổi khoảng cách mạnh trong một lần sinh video.

## 4. Prompt chuyển động đề xuất

Đây là cách chia để dễ tái dựng; không phải số cảnh gốc đã được xác minh. Dùng ảnh mặc đồ đã chốt làm đầu vào, không chỉ dùng prompt chữ. Thời lượng điều chỉnh theo công cụ thực tế.

### Cảnh 1 — khoảng 0–4 giây: xoay khoe bộ đồ

Vertical realistic fashion video. The adult woman begins facing the camera with a soft smile, then slowly turns to her left to show the side and back of the outfit. Her high ponytail follows the turn naturally. Her right hand holds the brown handbag with gentle realistic movement; her left hand rests lightly at her waist. Camera eases backward from a medium view toward a full-body view. Preserve the same face, navy outfit, white straps, handbag and street geometry throughout. No abrupt camera motion, no outfit changes, no extra limbs, no text. No added dialogue or background music.

### Cảnh 2 — khoảng 4–8 giây: góc sau và quay lại

Continue from the supplied rear three-quarter frame. The same woman makes a small relaxed step, glances over her shoulder, and smoothly turns toward the camera. Keep her feet grounded and the handbag in the same hand. Gentle natural ponytail movement, stable road markings and trees, soft daylight. Full-body framing, subtle handheld movement. Preserve identity and all clothing details. No morphing, no jump in position, no text. No added dialogue or background music.

### Cảnh 3 — khoảng 8–12 giây: bước đi và đứng tạo dáng

Continue with the same woman and outfit on the same road. She takes two small unhurried steps, turns to face the camera and settles into a relaxed pose, bringing the brown handbag in front of her and holding its handle with both hands. Natural smile, small weight shift, realistic fabric movement. Keep head and shoes visible, camera steady, environment consistent. No sudden spin, no accessory duplication, no text. No added dialogue or background music.

### Cảnh 4 — khoảng 12–16 giây: đi gần máy

The same woman walks slowly toward the camera for two natural steps, briefly looks to one side and smiles. She holds the small brown handbag naturally, with a slight swing that follows her steps. Preserve her face, ponytail, navy outfit, white neckline piping and nude flat shoes. Camera gently tracks backward to maintain full-body framing. Realistic foot contact and body motion, unchanged street background, no text or watermark. No added dialogue or background music.

## 5. Cách làm thực tế

1. Chốt mặt và kiểu tóc từ ảnh nguồn; chọn một bản nhận diện rõ, ít bộ lọc.
2. Tạo ảnh trang phục riêng, kiểm tra viền trắng, kiểu áo khoác, độ loe quần, túi và giày.
3. Tạo nền trống; thống nhất hướng sáng và góc máy.
4. Ghép danh tính + trang phục + nền bằng công cụ tạo/chỉnh ảnh để ra ảnh chính toàn thân. Kiểm tra mặt, tay, chân và phụ kiện trước khi chuyển động.
5. Tạo các góc bổ sung từ ảnh chính, giữ cùng một người và bộ đồ. Dùng một ảnh đơn làm khung đầu mỗi đoạn.
6. Sinh các đoạn ngắn, mỗi đoạn tập trung vào một hành động. Khi công cụ hỗ trợ, dùng khung cuối đã kiểm tra của đoạn trước làm khung đầu đoạn sau.
7. Dựng nối tại thời điểm xoay người/bước chân tương đồng. Xem lại mặt, dây áo, gấu áo, túi, tay, giày và vạch đường ở cả đầu/giữa/cuối từng đoạn.

Không có prompt phủ định nào bảo đảm hết lỗi; ảnh đầu vào đúng và chuyển động đơn giản thường giúp kiểm soát kết quả tốt hơn. Không thể bảo đảm tái dựng giống hệt video chỉ bằng văn bản.

## 6. Quy tắc nền cho bộ tài nguyên

- Bảng nhân vật và ảnh bộ đồ: trắng trung tính; đồ trắng có thể dùng xám rất nhạt hoặc bóng nhẹ.
- Ảnh mặc đồ để đưa vào video: dùng luôn bối cảnh cuối cùng của cảnh, ở đây là con đường có hàng cây.
- Nâu/be phù hợp khi muốn phong cách studio ấm; không phải nền mặc định cho tài nguyên cần đối chiếu màu.
