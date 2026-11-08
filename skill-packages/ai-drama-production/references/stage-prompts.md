# Prompt theo công đoạn

Prompt mới biên soạn theo phương pháp quan sát, không phải prompt nguyên bản tác giả. Thay biến `{...}` bằng nội dung dự án thực trước khi submit.

## Kịch bản và phân cảnh

```text
Dựa vào kịch bản đã cung cấp, giữ nhân vật và các sự kiện đã chọn.
Lập beat-sheet: mục tiêu, xung đột, thay đổi cảm xúc, kết quả.
Chia scene thành shot. Mỗi shot ghi ID, duration, nhân vật, location,
cỡ cảnh, độ cao/hướng máy, chuyển động máy, hành động đầu→cuối,
biểu cảm, nhịp thở nếu có ý nghĩa, lời thoại chính xác, tay giữ đạo cụ,
vị trí đứng, âm thanh và điểm nối shot sau. Kiểm tra tổng thời gian.
Không nhét nhiều hành động, không thêm thở gấp khi tình huống không cần.
```

## Khóa nhân vật

```text
Ảnh A là nguồn nhận diện duy nhất của {CHAR_ID}, nhân vật trưởng thành.
Giữ đặc trưng mặt, ngũ quan, tóc, sắc da và vóc dáng đã chốt.
Ảnh B, nếu có, chỉ tham chiếu {outfit hoặc bố cục}; không lấy mặt ảnh B.
Tạo sheet gồm trước/nghiêng/sau toàn thân; chân dung chính diện,
hai góc 45°, hai profile; thêm biểu cảm nếu cần trong sheet riêng.
Chính diện: đầu thẳng, mắt nhìn lens, camera ngang mắt.
Có đủ đầu và giày, ánh sáng mềm, nền trung tính, outfit {OUTFIT_ID}.
Không tự thay người, đồ, thêm chữ hay watermark.
```

Không ép mọi góc/biểu cảm vào một ảnh nếu mặt quá nhỏ. Tách sheet mặt và toàn thân khi cần.

## Khóa bối cảnh

```text
Thiết kế {LOC_ID} theo {phong cách}.
Sơ đồ cố định {cửa trái, cửa sổ phải, bàn giữa phòng...}.
Thời điểm {time}; nguồn sáng chính từ {direction}; bảng màu {palette}.
Tạo establishing master và ba góc cùng một nơi, không người/không chữ.
Giữ kiến trúc, vật liệu, vị trí cửa, đạo cụ và ánh sáng nhất quán.
Ghi vị trí camera trong tài liệu đi kèm.
```

## Board 2×2

```text
Ảnh A: {CHAR_A}; ảnh B: {CHAR_B}; ảnh C: {LOC_ID} master.
Khóa mặt từng người theo ảnh riêng. Cùng {phong cách}.
Board 2×2, đọc trái→phải, trên→dưới; bốn ô bằng nhau.
Ô 1/{SHOT_ID}: {cỡ cảnh, máy, vị trí, một hành động, biểu cảm, kết thúc}.
Ô 2/{SHOT_ID}: {...}.
Ô 3/{SHOT_ID}: {...}.
Ô 4/{SHOT_ID}: {...}.
Giữ bên trái/phải, đạo cụ, hướng sáng và trục quay; không thêm chữ.
Quản lý ID ở shot-plan, không in nhãn lên ảnh.
```

Sau duyệt: tách và xem từng ô, tạo lại frame riêng nếu thiếu chi tiết. Không mặc định gửi cả collage cho video model.

## Video từng shot — mặc định

```text
{SHOT_ID}, {duration} seconds, {aspect_ratio}, {style}.
Reference A defines identity/outfit; B is the approved starting frame;
C defines the fixed location/lighting. These have separate roles.
Start: {start_state}.
Action: {one main action with physically plausible order}.
Expression: {visible subtle change}; breathing: {if relevant}.
Camera: {height, size, direction, one movement or locked camera}.
End: {end_state matching next shot}.
Dialogue: {speaker, exact text, language; or none}.
Sound: {ambience/action Foley}; no BGM during generation.
Maintain face, clothing, handedness, prop shape and spatial layout.
One continuous shot, no unrequested cut or extra character.
```

Chỉ ghi thoại trong video khi provider đã xác minh hỗ trợ; nếu TTS riêng, yêu cầu không tự sinh thoại để tránh chồng giọng.

## Multi-shot — tùy tính năng thật

```text
Create a {duration}-second sequence with exactly {N} shots.
References define identities/location, not panels to animate together.
00:00–00:04 SHOT 1: {...}. Hard cut.
00:04–00:08 SHOT 2: {...}. Hard cut.
Maintain screen direction, identity and lighting across cuts.
No morphing, split-screen or unrequested montage.
```

Timing là ý đồ dựng, không cam kết output. Sai cut/continuity thì chuyển về từng shot.

## Giọng và sửa lỗi

```text
Voice sheet {CHAR_ID}: ngôn ngữ {language}, chất giọng {voice},
cảm xúc nền {emotion}. Từng câu giữ cùng voice-ID.
{SHOT_ID}: {thoại chính xác}; ngắt nghỉ {context}; cường độ {level}.
Xuất WAV riêng, đo duration và cập nhật timeline trước khi dựng.
```

```text
Chỉ sửa {SHOT_ID}. Lỗi quan sát: {issue} tại {timestamp}.
Giữ {phần đạt}; thay {một biến}. Dùng lại refs đã khóa và trạng thái
kết thúc shot trước. Lưu phiên bản mới và QC, không tạo lại toàn phim.
```
