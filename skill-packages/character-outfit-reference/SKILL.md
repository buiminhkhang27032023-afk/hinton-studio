---
name: character-outfit-reference
description: Tạo bảng tham chiếu nhân vật từ ảnh với ba góc cơ thể không đầu và hai chân dung; hoặc tạo ảnh bộ trang phục riêng trên nền trắng khi người dùng yêu cầu ảnh quần áo.
---

# Bảng nhân vật và bộ trang phục

## Chọn đúng chế độ

- Người dùng gửi ảnh người và muốn áp dụng khung nhân vật: tạo bảng nhân vật.
- Người dùng yêu cầu trang phục, bộ đồ, outfit: tạo ảnh chỉ có quần áo và giày. Không tự thêm bảng nhân vật hay chân dung.
- Trong chuỗi đang xử lý nhân vật, ảnh người mới không kèm chữ tiếp tục chế độ bảng nhân vật. Trong chuỗi trang phục, ảnh mẫu quần áo tiếp tục chế độ trang phục.
- Khi thực sự không thể suy ra loại đầu ra, hỏi ngắn gọn trước khi tạo.

## Bảng nhân vật: khung cố định

Xem `references/character-layout.png` để nắm bố cục, không dùng khuôn mặt mẫu cho người mới.

- Một ảnh ngang nền trắng, đường chia xám nhạt.
- Bên trái khoảng hai phần ba: ba cột đứng, lần lượt trước, nghiêng 90 độ, sau.
- Ba góc cơ thể KHÔNG CÓ ĐẦU; kết thúc sạch ở cổ áo/chân cổ như ảnh trưng bày thời trang, không thương tích. Thấy đủ giày, không cắt chân.
- Cùng tỷ lệ cơ thể, chân thẳng hàng, đứng tự nhiên, hai tay thả lỏng.
- Bên phải khoảng một phần ba: hai chân dung xếp dọc. Trên chính diện, dưới góc 3/4. Hiện đầy đủ tóc.
- Giữ nhận diện khuôn mặt, kiểu tóc, màu tóc, kính, phụ kiện và trang phục của ảnh nguồn nhất quán. Không tự làm đẹp thành khuôn mặt khác.
- Phần quần/giày không có trong ảnh: bổ sung hợp lý theo phong cách, không coi đó là chi tiết có thật từ nguồn.
- Mỗi người một bảng riêng, trừ khi người dùng yêu cầu ghép chung.

## Ảnh trang phục riêng

Xem `references/outfit-layout.png` để nắm kiểu trưng bày; không sao chép giới tính hoặc bộ đồ mẫu nếu yêu cầu khác.

- Một ảnh dọc cho mỗi bộ. Nền trắng, nhìn thẳng chính diện.
- Chỉ có trang phục, phụ kiện phù hợp và đôi giày; không người, không da, không đầu, không bàn tay, không mannequin nhìn thấy, không chân dung hay chia ô.
- Trưng bày kiểu ghost mannequin: áo giữ phom, cổ và tay áo rỗng; quần/váy thẳng bên dưới; giày thành đôi bên dưới chân quần. Cân giữa, đủ khoảng trắng.
- Khi yêu cầu N bộ, tạo N ảnh riêng, không thay bằng một ảnh ghép. Nếu không chỉ định phong cách, chọn các bộ khác nhau phù hợp nhân vật và hoàn cảnh.

## Thực hiện và kiểm tra

Dùng công cụ image_gen có sẵn; đọc ảnh nguồn ở đường dẫn cục bộ bằng view_image trước khi chỉnh. Tham khảo kỹ năng imagegen hiện hành nếu cần. Đưa ảnh nhân vật làm nguồn nhận diện, ảnh khung chỉ làm nguồn bố cục. Không gửi ảnh người vào chế độ chỉ trang phục nếu không cần.

Mỗi ảnh dùng một lệnh tạo riêng. Không gọi thêm API hoặc yêu cầu khóa khi công cụ tích hợp dùng được. Nếu công cụ lỗi, báo rõ; không tự chuyển sang API trả phí.

Kiểm tra kết quả: đúng số ô hoặc đúng ảnh trang phục đơn, không có đầu ở ba góc cơ thể, đủ giày, đúng người, nhất quán trang phục. Sửa lỗi rõ ràng trước khi bàn giao. Không hứa giống tuyệt đối.

Nếu đầu ra phục vụ dự án, chép ảnh cuối vào thư mục đầu ra của dự án với tên rõ ràng, không ghi đè ảnh gốc. Nếu chỉ xem thử, hiển thị trực tiếp. Trả lời ngắn bằng ngôn ngữ người dùng.

## Màu nền

Mặc định nền trắng trung tính để đối chiếu trang phục. Khi đồ trắng/kem khó phân biệt đường viền, dùng bóng nhẹ hoặc nền xám rất nhạt, không làm cháy sáng mất chất liệu. Nền nâu/be là tùy chọn khi người dùng yêu cầu phong cách ấm; tránh ánh sáng ám màu lên da và vải. Không coi nền nâu là mặc định cho ảnh tham chiếu.
