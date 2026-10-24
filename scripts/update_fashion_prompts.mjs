const base = 'http://localhost:3210';
const projectId = 'prj_a9c0d8476382';

async function update() {
  const res = await fetch(`${base}/api/projects/${projectId}/graph`);
  const graph = await res.json();

  const videoPrompt = `Dùng @Ảnh1 @Ảnh2 @Ảnh3 @Ảnh4 @Ảnh5 làm tham chiếu ngoại hình toàn thân và các bộ trang phục của cùng một người mẫu trưởng thành. Giữ nguyên khuôn mặt, vóc dáng và nhận diện nhân vật; chỉ thay đổi trang phục. Phong cách người thật, ánh sáng tự nhiên mềm mại, làn da có chi tiết chân thực.

Chuyển động máy quay: mở đầu bằng góc máy cực thấp, hướng lên để tạo ấn tượng thị giác. Sau đó chuyển sang các cảnh toàn thân với máy quay cố định.

Chuyển cảnh: dùng cảnh góc thấp mở đầu để dẫn vào bố cục lookbook toàn thân. Tiếp theo chuyển cảnh cắt thẳng, thay trang phục đúng nhịp. Không dùng hiệu ứng biến hình hoặc hòa trộn trang phục.

00:00–00:02
Góc máy cực thấp hướng lên. Người mẫu hơi cúi đầu nhìn vào máy quay, hai tay buông tự nhiên. Mặc áo đen và chân váy ngắn trắng nhiều tầng bèo. Nền trắng sạch, tư thế chụp thời trang chuyên nghiệp.

00:02–00:04
Máy quay cố định, khung hình toàn thân, bố cục tạp chí thời trang chia ô. Bên trái là phiên bản nhân vật 3D chibi, bên phải là người mẫu thật mặc cùng trang phục.
Người mẫu mặc áo đen bất đối xứng có dây rút, chân váy trắng nhiều tầng bèo và dép màu be. Một tay khẽ vuốt tóc, vai còn lại đeo túi màu bạc, cơ thể hơi nghiêng.

00:04–00:06
Cắt thẳng đúng nhịp sang bộ đồ tiếp theo, giữ nguyên khung hình toàn thân.
Người mẫu mặc váy babydoll màu xám phong cách cổ điển có nơ, tất trắng và giày Mary Jane. Một tay cầm túi đen dưới nách, hai chân hơi bắt chéo, đầu khẽ nghiêng, mỉm cười nhẹ. Bố cục có các ô ảnh trang phục trải phẳng.

00:06–00:08
Cắt thẳng đúng nhịp, máy quay cố định.
Người mẫu mặc cardigan dệt kim xanh nhạt bên ngoài váy ren trắng ngắn nhiều tầng, tay cầm túi da mềm màu kem. Đứng tự nhiên, nhìn thẳng vào máy quay. Ánh sáng studio sạch, nhân vật 3D chibi được đặt cạnh người mẫu thật.

00:08–00:10
Cắt thẳng đúng nhịp sang bộ trang phục mới.
Người mẫu mặc cardigan lửng màu kem phối cùng váy hai dây dáng dài họa tiết hoa hồng, đeo túi da nâu một bên vai và giày cao gót hồng cổ điển. Hai chân đặt sát nhau, tư thế dịu dàng, thanh lịch.

00:10–00:12
Giữ khung hình toàn thân làm cảnh kết.
Người mẫu mặc áo thun xanh lam khói ôm eo, cổ viền ren, phối chân váy ngắn trắng có họa tiết. Đeo túi ánh bạc một bên vai, hơi bước ngang để thể hiện chi tiết thắt eo và tay áo. Giữ bố cục trưng bày trang phục song song.

Yêu cầu chung: chuyển động tự nhiên, trang phục nhất quán trong từng cảnh, giữ nguyên khuôn mặt và vóc dáng xuyên suốt. Không méo tay chân, không xuất hiện thêm người, không nhấp nháy hoặc làm biến dạng quần áo.`;

  const lookbookPrompt = `Tạo ảnh lookbook thời trang chuyên nghiệp, sử dụng người mẫu và trang phục trong ảnh tham chiếu. Giữ nguyên khuôn mặt, kiểu tóc và các chi tiết của bộ đồ.

Bên phải: người mẫu thật đứng toàn thân, tay trái khẽ vuốt tóc, tay phải cầm túi xách màu bạc. Hiển thị trọn cơ thể và giày, không cắt đầu hoặc chân.

Bên trái: xếp dọc 3 thẻ nền trắng có đường viền mảnh, khoảng cách đều:
- Thẻ trên: phiên bản hoạt hình chibi của chính người mẫu, cùng khuôn mặt, kiểu tóc và trang phục.
- Thẻ giữa: áo và chân váy của bộ trang phục tham chiếu được trải phẳng, nhìn rõ thiết kế và chất liệu.
- Thẻ dưới: túi xách màu bạc và đôi giày phối cùng bộ đồ, trình bày theo kiểu ảnh sản phẩm.

Phía trên đặt tiêu đề lớn, rõ nét, viết chính xác: “Today’s outfit”.

Nền trắng tinh, ánh sáng studio mềm mại và đồng đều, màu sắc tự nhiên, chi tiết vải sắc nét. Bố cục thanh lịch, cân đối, phong cách lookbook thương mại điện tử cao cấp.

Không thêm người, không thay đổi trang phục, không méo tay chân, không có vật thừa, logo hoặc watermark.`;

  for (const n of graph.nodes) {
    if (n.id === 'script') {
      n.data.text = videoPrompt;
      n.data.prompt = videoPrompt;
      n.data.status = 'idle';
      n.data.error = null;
    }
    if (n.id === 'image-brief') {
      n.data.text = lookbookPrompt;
      n.data.prompt = lookbookPrompt;
      n.data.status = 'idle';
      n.data.error = null;
    }
    if (n.id === 'video') {
      n.data.prompt = videoPrompt;
      n.data.status = 'idle';
      n.data.error = null;
      n.data.result = null;
    }
    if (n.id === 'result') {
      n.data.status = 'idle';
      n.data.error = null;
      n.data.result = null;
    }
  }

  const putRes = await fetch(`${base}/api/projects/${projectId}/graph`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  });
  console.log('Update graph response status:', putRes.status);
  const updated = await putRes.json();
  console.log('Updated node count:', updated.nodes.length);
}

update().catch(console.error);
