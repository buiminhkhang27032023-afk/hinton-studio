# Năng lực và chiến đấu AI — áp dụng skill

Nguồn phân tích: https://www.tiktok.com/@hancontam/video/7686959242158296337
Phạm vi: 00:00–00:14, ngày 30/10/2026. Đã lấy mẫu 2 frame/giây từ đoạn đầu. Mốc dưới đây xấp xỉ theo mẫu, chưa phải EDL chính xác từng frame. Không suy ra model hoặc công cụ VFX cụ thể chỉ từ thành phẩm.

## Quan sát

| Mốc xấp xỉ | Hình ảnh thấy được | Cách tái dựng đề xuất |
|---|---|---|
| 0–1,5s | Nam tiền cảnh, hình thể/đối thủ phía sau, đường sáng vàng chéo, khói | Một keyframe có sẵn bố cục và ánh sáng năng lực; i2v chuyển động vừa, foreground/background rõ |
| 1,5–3,5st | Chuyển cảnh xanh lam; bàn tay hướng camera; vòng năng lượng vàng mở ra; pháp khí lam đối đầu ánh vàng | Tách shot bàn tay và shot năng lực, tránh buộc một clip tự đổi toàn bộ camera và vật thể |
| 3,5–7,5s | Tiêu đề chèn; năng lượng vàng lớn quét qua không gian, nhân vật trụ người, bụi/vật nhỏ bay | Wide shot riêng để bán quy mô; mô tả hướng lực, occlusion, bounce light và phản ứng môi trường |
| 7,5–9,5s | Meme phủ lên hình; góc rộng mái kiến trúc và trường sáng vàng | Lớp meme là phần dựng; không yêu cầu model sinh chữ/meme |
| 9,5–12,5s | Cận nam, pháp khí vàng ngang tiền cảnh, flash sáng ngắn, ánh mắt tập trung | Cận riêng giữ mặt; ánh sáng năng lực chạy trên mặt, không dùng flash kéo dài che lỗi |
| 12,5–14s | Chèn ảnh/thông tin quảng bá lên cảnh | Không phải một cú máy chiến đấu liên tục; bỏ các lớp này nếu tái tạo phim |

Nhận định kỹ thuật: có thể tạo theo image-to-video và dựng nhiều shot, hoặc kết hợp VFX 3D/compositing. Hình ảnh không chứng minh lớp năng lực được làm bằng After Effects/Blender/Houdini hay sinh cùng clip. Cần xem project hậu trường mới kết luận pipeline chính xác.

## Mở rộng character/location bible bằng VFX bible

- Năng lực vàng: lõi vàng trắng, vành hổ phách, hình học là vòng đồng tâm và phiến/luồng dài. Chọn một thiết kế cụ thể, giữ nguyên qua shot.
- Pháp khí lam: thiết kế riêng, màu cyan, đường nét khác vàng, không tự đổi thành rồng/lửa.
- Điểm phát và đích đến: bàn tay/ấn quyết → năng lực → đích; chốt hướng trái/phải.
- Tương tác: bóng sáng trên mặt và nền, occlusion khi đi sau người, bụi phản lực, tóc/áo theo lực, vật nhỏ văng đúng hướng.
- Thời gian: anticipation → charge → release → impact → settle. Cần thời gian đọc được trước cú đánh; không dồn tất cả vào một giây.
- Camera: ghi riêng đường di chuyển; không đồng thời orbit 360°, zoom và whip-pan trong một shot.
- Âm thanh: charge tăng dần, whoosh theo phóng, impact và đuôi vọng; thiết kế đề xuất, không phải bản chép âm thanh gốc.

## Phân đoạn 14 giây mới theo phương pháp

Đây là phương án dựng mới lấy kỹ thuật, không chép nguyên hành động/meme của nguồn:

1. 0–2s — Trung cận ngang mắt: nhân vật nâng tay tạo ấn, ánh mắt khóa mục tiêu, một nhịp hít vào. Camera cố định.
2. 2–5s — Góc 3/4 thấp vừa: vòng vàng hình thành trước lòng bàn tay, quay ổn định; tay nguyên vẹn, áo/tóc bị gió đẩy nhẹ. Máy push-in chậm.
3. 5–8s — Toàn cảnh: một phiến năng lượng phóng trái→phải, bụi nền bị kéo theo; nhân vật trụ chân. Tracking cùng hướng, không đảo trục.
4. 8–11s — Toàn cảnh ở đích: phiến vàng chạm khiên cyan, khiên rung, sóng bụi lan sát nền. Máy khóa, một rung ngắn tại va chạm.
5. 11–14s — Cận ngang mắt: năng lượng tắt dần phản chiếu trên mắt, nhân vật hạ tay và thở ra; hạt sáng còn lơ lửng. Giữ mặt và trang phục.

Tạo 5 clip riêng rồi cắt đoạn đạt theo timeline. Nếu provider chỉ cho duration dài hơn, tạo ở duration hỗ trợ và trim, không hứa 2/3 giây đều là tùy chọn API. Khóa 2 nhân vật, 1 location, 2 mẫu VFX và 5 keyframe; board 2×2 dùng cho bốn shot đầu, shot cuối riêng.

## Prompt frame trước hiệu ứng — thay nhân vật dự án vào

```text
Use reference A for the approved adult character identity and outfit,
reference B for the fixed courtyard, and reference C for the golden ring design.
Cinematic Chinese fantasy 3D animation, consistent with the approved art style.
Eye-level medium three-quarter view. The character braces naturally and extends
one intact open hand. A single concentric amber-gold energy ring floats a short
distance ahead of the palm, with a white-gold core and precisely defined rim.
The ring casts warm light on fingers, cheek, sleeve and nearby ground.
Wind gently lifts hair and fabric in a consistent direction. Sparse dust,
clear silhouette, readable face. No extra hands, words, title or split-screen.
```

## Prompt video shot tích năng — 3 giây nội dung dựng

```text
One continuous three-quarter medium shot. Preserve the character, outfit,
hand anatomy, courtyard and exact ring design from the starting frame.
The ring grows from palm size to shoulder width, then stabilizes and rotates
around its fixed center. The character's wrist stays steady; fingers do not
multiply. Warm reflected light intensifies gradually on the face and sleeve.
Hair and cloth move gently away from the ring. Tiny dust particles drift
outward. Slow controlled camera push-in; no orbit, no cut, no shape morphing.
End with the ring stable, ready to release. No speech or music.
```

## Prompt video shot va chạm — 3 giây nội dung dựng

```text
One locked wide shot in the same approved courtyard. A single golden energy
blade travels screen-left to screen-right and strikes the center of a cyan
circular shield. Preserve the shield's geometry and the characters' positions.
The shield bends slightly, emits a brief cyan pulse, and holds. A low dust
wave expands along the ground away from impact, small stones move outward,
and warm/cool interactive light briefly illuminates nearby surfaces.
One brief camera jolt on contact, then settle. No gore, no extra projectile,
no building collapse, no cuts or prolonged whiteout. No dialogue or music.
```

## QC chuyên biệt

Vòng/phiến có giữ hình dạng? Nguồn sáng có nằm đúng nơi năng lực? Vật thể đi sau người có bị che đúng? Có đổi mặt khi flash? Tay có biến dạng? Bụi/tóc/áo có cùng hướng lực? Có cảm giác tụ lực trước phóng? Đòn có đích thay vì tan biến? Nếu tương tác sai, sửa frame/shot gốc; overlay đẹp không sửa được hình học và chuyển động nền sai.

Compositing thêm là tùy chọn: glow, particles, flash, rung và sound design có thể hoàn thiện sau. Khi ghép lớp rời, cần tracking, mask/occlusion, match exposure/motion blur. Không khẳng định preset overlay là đủ tạo chiều sâu như nguồn.
