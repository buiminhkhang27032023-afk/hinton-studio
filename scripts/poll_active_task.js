const apiKey = 'YOUR_IOOAI_KEY';
const providerJob = 'task_wlHoRSB7sFZeKnrSvyvyGBGsb3qU9JOb';
const localJobId = 'job_0dda6187fb12';

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Bắt đầu theo dõi tác vụ IOOAI: ${providerJob}...`);
  let attempts = 0;
  while (attempts < 60) {
    attempts++;
    try {
      const res = await fetch(`https://api.iooai.cn/v1/videos/${providerJob}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        cache: 'no-store'
      });
      if (!res.ok) {
        console.log(`HTTP ${res.status} khi kiểm tra tác vụ`);
        await wait(5000);
        continue;
      }
      const data = await res.json();
      console.log(`[Lần ${attempts}] Status: ${data.status}, Progress: ${data.progress || 0}%`);

      if (data.status === 'completed' || data.status === 'succeeded' || data.status === 'success') {
        console.log('Tác vụ ĐÃ HOÀN TẤT!');
        console.log('Video URL từ IOOAI:', data.video_url || data.output?.video);

        // Gọi API recover của hệ thống để tải và gắn video vào Canvas
        const recRes = await fetch(`http://localhost:3210/api/jobs/${localJobId}/recover`, {
          method: 'POST'
        });
        const recData = await recRes.json();
        console.log('Kết quả Recover:', JSON.stringify(recData, null, 2));
        return;
      }

      if (data.status === 'failed' || data.status === 'error') {
        console.error('Tác vụ THẤT BẠI trên IOOAI:', data.error || data.message || JSON.stringify(data));
        return;
      }
    } catch (e) {
      console.warn('Lỗi kết nối thăm dò:', e.message);
    }
    await wait(8000);
  }
  console.log('Hết thời gian chờ (5 phút). Vui lòng kiểm tra lại sau.');
}

main().catch(console.error);
