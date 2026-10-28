# KHE SÁNG — Prompt tạo video theo cảnh

Các prompt dưới đây là nội dung sáng tạo, không phụ thuộc tên model. Dùng tính năng image-to-video hoặc reference-to-video có sẵn trên tài khoản của bạn. Gắn ảnh 00 làm tham chiếu nhận diện nếu nền tảng hỗ trợ; gắn ảnh cảnh tương ứng làm khung đầu. Không dùng bảng 4 ô nhân vật làm khung hình đầu duy nhất.

Tạo 8 clip riêng; lắp đúng thời lượng 6 + 7 + 7 + 7 + 8 + 8 + 9 + 8 = 60 giây. Nếu dịch vụ chỉ cho 5 hoặc 10 giây, tạo đủ tư liệu và cắt, hoặc chia các cảnh dài thành hai shot. Giữ đoạn hành động chính ở giữa clip để có phần dư đầu cuối. Thoại và hơi thở được chỉ đạo trong kịch bản; nên thu/lồng riêng nếu model không giữ đúng tiếng Việt.

## Khối nhận diện chung — ghép trước mọi prompt

```text
Original photorealistic live-action survival short film. Exactly two fictional adult Vietnamese explorers, consistent identity with casting reference. Linh: woman, 28, oval face, dark brown eyes, wet black low ponytail, mustard-yellow waterproof jacket, charcoal hiking trousers, brown hiking boots, gray waist pouch, white headlamp band. Nam: man, 30, angular face, short black hair, clean-shaven, dark teal waterproof jacket, dark gray trousers, brown boots, white headlamp band. Both wet and muddy, realistic natural anatomy and restrained acting. Limestone cave, cool natural shadows, warm practical headlamps, daylight escape route upper right. Linh leads at screen right, Nam follows at screen left. Preserve clothes, faces, lighting direction and geography. One continuous cinematic take unless an insert is explicitly requested. Natural motion blur, physically grounded body weight, 24 fps look, landscape 16:9. No captions, text, logos, extra people, blood, fantasy elements, face changes, duplicated limbs, wardrobe morphing or teleporting objects. No generated dialogue or music; dialogue and sound will be added during editing.
```

## 01 — Sạt đá | 6 giây | images/01.png

```text
Begin from the provided single keyframe. Medium-wide 28mm handheld shot with subtle controlled shake. A distant small rock collapse at screen left releases fine dust, not a massive explosion. Linh recoils and lifts her left forearm protectively; Nam turns toward the blocked passage at left, then turns back toward Linh. Their headlamp beams naturally follow their head turns through the dust. Muddy water ripples around their lower legs. A startled inhale, then restrained fear in their faces: parted lips, tense jaw, searching eyes. Linh lowers her arm and shifts her gaze toward the upper right by the end. Nam still wears the orange dry bag on a simple black quick-release crossbody strap. No stones hit the actors, no injuries. Keep camera geography readable. Do not increase water level dramatically within this shot.
```

**Dựng tiếng:** Nam nói “Lối về… bị chặn rồi.” khoảng giây 4.2–6.0. Tiếng đá vào từ khung đầu. Đây là chỉ đạo lồng tiếng, không dán vào prompt trên nếu đã chọn chế độ không âm thanh.

## 02 — Tìm khe sáng | 7 giây | images/02.png

```text
Slow subtle push-in on Linh's wet face, 50mm cinematic lens. She closes her mouth, takes one controlled breath, searches the rock wall with her eyes, then notices a narrow daylight slit at upper right. Her brows relax slightly as fear becomes focused determination. She brushes one wet hair strand away from her mouth with her right index finger, then points toward the reachable rock shelf leading to the light. Nam remains softly visible behind at screen left with his orange bag. A thin daylight shaft catches suspended dust. Realistic small eye and hand movements, no exaggerated smile. Keep the exit in the same location. Do not magically open or enlarge the cave wall.
```

**Dựng:** có thể chèn shot chủ quan khe sáng trong 1.3 giây ở giữa cảnh, thay thế cùng thời lượng. Linh: “Kia. Có ánh sáng.” ở cuối cảnh.

## 03 — Nắm tay | 7 giây | images/03.png

```text
Medium-wide 35mm shot establishes the wet low shelf on the right. Linh places one boot firmly on the shelf, steadies her left palm against the rock, and extends her right hand back to Nam. Nam hesitates while looking at the knee-deep current, then places his left hand into hers. One clear anatomically correct handhold. They briefly meet eyes, he exhales and nods, and both begin moving carefully toward screen right. Linh leads, Nam follows with his orange dry bag at the hip. Each supports their own weight. Camera makes a small lateral move with them. Do not swap hands or change the bag's attachment.
```

**Thoại:** Linh “Đi cùng nhau.” Hơi thở dịu hơn một nhịp khi tay nắm được.

## 04 — Hụt chân | 7 giây | images/04.png

```text
Controlled side-tracking medium-wide shot along a low slippery rock shelf, not a vertical cliff. Linh at right maintains her right-hand hold on Nam's left hand and steadies herself with her left palm on the wall. Nam's boot slips only half a step; his knee bends and his right palm catches the wall. Linh lowers her center of gravity while he finds a new foothold and pushes himself upright. No one hangs in the air, no superhuman one-arm lifting. Nam takes a sharp breath, steadies himself and gives a small reassuring nod. As he advances, the loose black orange-bag strap brushes a visible rock spur behind his hip. Keep faces and wet costumes consistent. End with both stable and ready to move.
```

**Thoại:** Nam “Anh ổn.” Giày trượt, bàn tay chạm đá, thở mạnh; không tiếng xương gãy.

## 05 — Túi mắc đá | 8 giây | images/05.png

```text
Medium three-quarter two-shot. Nam tries to step forward once but the orange dry-bag shoulder strap is caught on a jagged rock spur behind his hip. The strap becomes taut and stops him; it is a bag strap, never a restraint around neck or limbs. He looks back and gives one unsuccessful tug, then stops. Muddy water surges to thigh level without sweeping either actor away. Linh turns back, notices the snag, looks briefly toward the upper-right exit, then reaches her left hand toward the single black plastic buckle on the front of Nam's torso. Her right hand steadies his left forearm. Nam braces his right palm against the wall. Fear and hesitation in his face, decisive focus in hers. Small restrained movements, readable physical cause and effect.
```

**Thoại:** Nam “Túi mắc rồi.” Linh “Bỏ túi!” Nhạc ngắt trước mệnh lệnh.

## 06 — Tháo khóa | 8 giây | images/06.png

```text
Begin with a close-medium view of the same two actors and the single simple black plastic quick-release bag buckle. Linh's left thumb and index finger reposition once on the wet buckle, then press its side tabs. The buckle opens once and the strap becomes slack. The orange bag stays physically caught on the rock behind Nam. Nam uses his own right hand to slip out of the loose strap, exhales, then turns toward the escape ramp. Linh takes his left hand in her right again and they step uphill to screen right using their own legs. The camera follows slightly. Do not duplicate fingers, buckle, straps or bags. The orange bag is abandoned behind them and must not travel with them. Natural hand contact, no impossible knots or instant object disappearance.
```

**Insert tùy chọn, thay 2 giây đầu:**

```text
Photorealistic macro insert of a mustard-yellow waterproof sleeve and one wet left hand pressing the two side tabs of a SINGLE simple black quick-release bag buckle on a dark-teal jacket. Buckle separates normally, black webbing slackens. Anatomically correct five fingers, clear mechanical action, 65mm lens, shallow depth of field, no extra buckles or straps. No text. Two seconds.
```

**Thoại:** Linh “Lên!” Sau cảnh này xóa mọi tham chiếu túi cam khỏi prompt cảnh tiếp.

## 07 — Lên bậc cuối | 9 giây | images/07.png

```text
View from near the cave mouth looking down a moderate wet rocky ramp. Soft daylight and green forest beyond upper right. Neither actor has the orange bag or its shoulder strap. Linh climbs a broad low ledge using both palms and her right knee, settles securely with one boot planted on wide rock, then offers her right hand down to Nam. Nam takes it with his left hand while pushing with his own right palm and right knee on the ledge. She supports and guides; he lifts his own weight. No hanging over an abyss, no suspended bodies, no teleporting to the top. Linh shifts her hip backward to make room; Nam reaches the ledge and briefly kneels beside her. They glance toward the daylight and begin standing together. Wet hair clings to faces, effort shown by tightened lips and short exhales. Camera holds geography and slowly eases backward.
```

**Tiếng:** không thoại. Thở sát máy, tay miết đá; chim xa bắt đầu ở hai giây cuối.

## 08 — Ra ngoài | 8 giây | images/08.png

```text
Medium-wide quiet final shot outside the same limestone cave in a damp lush green forest after rain, soft overcast daylight. Linh right and Nam left, same soaked muddy clothes, same headlamps, NO orange bag or shoulder strap. They finish stepping out, bend forward with hands near knees and catch their breath. Linh closes her eyes briefly and exhales shakily; Nam lifts his chin toward the sky and lets his shoulders drop on a long breath. They look at each other. He gives a small exhausted smile, she answers with a tiny breathy laugh, then lightly rests her hand on his shoulder. Keep emotion restrained and earned. No kissing, cheering, jumping or dramatic victory gesture. The camera slowly pulls back to show the dark cave behind and green forest ahead. End on them standing together breathing more slowly. Do not add titles or credits.
```

**Thoại:** Nam “Ra rồi.” từ giây 56.8–58.3 toàn phim. Cắt đen đúng giây 60, tiếng rừng và hơi thở giữ tới cắt.

## Kiểm lỗi trước khi chạy hàng loạt

- Tạo thử cảnh 3 hoặc 8 trước để kiểm nhận diện và mức chuyển động; không nạp nhiều cảnh cùng lúc nếu chưa thấy kết quả.
- Nếu bị chặn ảnh, xem thông báo cụ thể và dùng cơ chế xác minh/hỗ trợ của nền tảng. Prompt này không bảo đảm vượt bộ lọc hay thay thế quyền sử dụng hình ảnh.
- Nếu API yêu cầu URL ảnh, dùng công cụ upload chính thức của dịch vụ hoặc kho lưu trữ bạn quản lý; đường dẫn C:/ và D:/ không phải URL công khai. Không tự công khai ảnh cá nhân để chữa lỗi.
- Cảnh tay khó: chia thành insert và cảnh vừa; một hành động chính mỗi clip thường dễ kiểm soát hơn nhồi nhiều hành động.
- Có thể lồng tiếng hậu kỳ để giữ đúng thoại ngắn và nhịp thở. Không ghi nhãn bản animatic là phim hoàn chỉnh.
