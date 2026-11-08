async function test() {
  const res = await fetch("http://localhost:3210/api/audio/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: "prj_06d6f1c9496a",
      text: "ba em không đồng ý",
      voice: "shimmer",
      speed: 1.2
    })
  });
  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", data);
}
test();
