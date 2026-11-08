# Canvas và runtime

```text
CHAR_A_FACE/BODY ─┬─> BOARD_2x2 ─> SH01_FRAME ─> SH01_VIDEO ─┐
CHAR_B_FACE/BODY ─┤             ├> SH02_FRAME ─> SH02_VIDEO ─┤
LOC_MASTER ──────┘             ├> SH03_FRAME ─> SH03_VIDEO ─┼> EDIT ─> EXPORT
                              └> SH04_FRAME ─> SH04_VIDEO ─┤
VOICE_A/B ─> DIALOGUE_WAV ────────────────────────────────┤
AMBIENCE / FOLEY / BGM ──────────────────────────────────┘
```

Đây là sơ đồ dữ liệu, không phải ComfyUI JSON chạy được. Chỉ nối người xuất hiện. Có thể sinh frame riêng trực tiếp từ refs khi board thiếu độ rõ.

## Triển khai trong dự án có sẵn

1. Chọn một scene đã có kịch bản và ảnh nhân vật, không tự đổi người.
2. Khóa người, outfit và location, kiểm tra ảnh chính diện ngang mắt.
3. Làm board bốn ô, kiểm tra screen direction.
4. Tách/tạo lại frame, đặt ID và version.
5. Sinh thử shot có hành động/thoại khó nhất.
6. Khi đạt mới mở rộng, dựng theo WAV đo thực và sửa shot cục bộ.

## Provider và ComfyUI

Xác minh endpoint, model ID, ref nhận được (ảnh đầu/cuối/nhiều ảnh/video/audio), duration, resolution và cách nhận kết quả. Không suy tính năng từ chữ Omni/2.0/2.5. Không tự upload ảnh local sang dịch vụ công khai ngoài phạm vi yêu cầu.

ComfyUI cần workflow export thật, custom node/checkpoint và GPU phù hợp. Phân biệt graph UI với API-format. Chưa có thì xuất shot-plan trung lập, không giả JSON có thể import.

Không chạy script test provider cũ chỉ vì thấy trong thư mục. Đọc đích đến/project ID, tránh ghi đè dự án hoặc submit job trả phí để dò tính năng.

## QC và xuất

Giữ tỷ lệ dự án; không ép 9:16. FPS thống nhất theo footage. Kiểm tra file tải gốc thay vì ảnh chụp player. Không kết luận 8 giây luôn mờ hoặc clip ngắn luôn rõ: còn nguồn, model, resolution, nén, export.

Kiểm tra mặt/tóc/đồ, tay cầm đạo cụ, eyeline, trục quay, hướng sáng, không gian, thoại/SFX và tổng duration. Không gọi bản kiểm thử dữ liệu là đã xác nhận chất lượng phim.
