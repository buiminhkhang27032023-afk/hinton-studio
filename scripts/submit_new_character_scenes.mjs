import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();

  const scenes = [
    {
      index: 1,
      name: "Cảnh 1: Bước ra sàn diễn thời trang Paris trong đầm dạ hội đen",
      prompt: "Cinematic establishing wide tracking shot of Paris Fashion Week runway show. A breathtaking young East Asian runway supermodel with long voluminous wavy black hair swept over one shoulder, porcelain skin, sharp elegant jawline, alluring dark almond eyes, wearing an exquisite black lace halter haute couture evening gown. She strides onto the glossy mirrored runway with immense poise and confidence, surrounded by glowing runway spotlights, camera flashes popping from VIP photographers, 35mm film aesthetic, 4k.",
      seconds: 8
    },
    {
      index: 2,
      name: "Cảnh 2: Sải bước catwalk tracking shot & Thần thái kiêu sa",
      prompt: "Medium dynamic tracking camera shot gliding backwards in front of the stunning East Asian supermodel as she walks down the fashion catwalk. Her long wavy black hair flows with each step, intense captivating gaze looking toward the camera, black couture dress moving with liquid grace, front row fashion audience watching, dramatic cinematic side-lighting, lens flare, 35mm film color grading, 4k.",
      seconds: 8
    },
    {
      index: 3,
      name: "Cảnh 3: Tạo dáng thần thái đầu sàn catwalk & Cú xoay người kết màn",
      prompt: "Cinematic three-quarter close-up and medium shot as the stunning East Asian supermodel reaches the tip of the fashion runway. Showing her sharp cheekbones, fair glowing skin, captivating dark eyes, and subtle confident smirk under dramatic stage lights. She strikes an iconic high-fashion pose, then performs a flawless pivot turn, black gown sweeping across the mirrored floor, soft bokeh applause in background, 35mm film aesthetic, 4k.",
      seconds: 8
    }
  ];

  console.log("Submitting 3 new runway scenes for the new character...");
  const submitted = [];

  for (const sc of scenes) {
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
        size: "1280x720"
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

  console.log("\nAll submitted jobs:", JSON.stringify(submitted, null, 2));
}

main().catch(console.error);
