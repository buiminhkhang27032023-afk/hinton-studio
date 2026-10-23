import fs from "node:fs";
import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();
  const userImgPath = "C:/Users/Chen Qianyu/.gemini/antigravity/brain/4149a5ae-666d-4654-a6f8-20a00b1b99a6/.user_uploaded/media_1792489431374_43c29072.jpg";
  const b64 = fs.readFileSync(userImgPath).toString("base64");
  const dataUri = `data:image/jpeg;base64,${b64}`;

  const remainingScenes = [
    {
      index: 2,
      name: "Cảnh 2: Bước đi catwalk điệu nghệ & Tà áo dạ hội",
      prompt: "Medium dynamic tracking shot following the exact same young Asian female model from the reference image on the luxury fashion runway, gliding down the catwalk with elegant confident strides, tailored haute couture gown flowing gracefully with her steps, front row fashion audience watching, camera flashbulbs popping, soft cinematic lighting, 35mm film look, 4k.",
      seconds: 8
    },
    {
      index: 3,
      name: "Cảnh 3: Tạo dáng đầu sàn diễn & Xoay người chào khán giả",
      prompt: "Three-quarter close-up and medium shot of the exact same young Asian female model from the reference image reaching the tip of the fashion runway, striking a sophisticated high-fashion pose, subtle confident smile under the dramatic runway spotlights, elegant pivot turn, soft bokeh applause in background, 35mm film aesthetic, 4k.",
      seconds: 8
    }
  ];

  const submitted = [
    {
      index: 1,
      name: "Cảnh 1: Bước ra sàn diễn thời trang danh giá",
      jobId: "svgen_53d9a4b5-0a7e-4e92-b378-f4cd9b5a3c2b"
    }
  ];

  for (const sc of remainingScenes) {
    console.log(`Submitting Scene ${sc.index}: ${sc.name}...`);
    const res = await fetch(`${provider.baseUrl}/videos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: "veo-3.1",
        prompt: sc.prompt,
        seconds: sc.seconds,
        size: "1280x720",
        input_reference: dataUri
      })
    });

    console.log(`Scene ${sc.index} Status:`, res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data));
    if (data.id) {
      submitted.push({
        index: sc.index,
        name: sc.name,
        prompt: sc.prompt,
        jobId: data.id
      });
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\nAll 3 Runway Jobs:", JSON.stringify(submitted, null, 2));
}

main().catch(console.error);
