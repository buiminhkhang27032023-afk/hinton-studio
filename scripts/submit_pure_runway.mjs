import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();

  const scenes = [
    {
      index: 2,
      name: "Cảnh 2: Medium tracking shot sải bước catwalk chuyên nghiệp",
      prompt: "Medium dynamic tracking camera shot following the same gorgeous young East Asian runway model down the catwalk. She has a sweet heart-shaped face, soft expressive eyes, dark brown hair with soft strands framing her face, walking with poised elegance. Her luxury haute couture evening dress trails smoothly behind her, dramatic runway backlighting, fashion VIP audience applauding in soft blur, 35mm film color grading, 4k.",
      seconds: 8
    },
    {
      index: 3,
      name: "Cảnh 3: Cận cảnh thần thái đầu sàn diễn & Xoay người pivot turn",
      prompt: "Cinematic medium close-up shot as the gorgeous young East Asian female model reaches the front edge of the fashion runway. Highlighting her sweet youthful face, sparkling expressive eyes, subtle confident smile under runway spotlights, followed by an iconic high-fashion pivot turn, fabric swirling gracefully, camera flashbulbs flashing, 35mm film aesthetic, 4k.",
      seconds: 8
    }
  ];

  for (const sc of scenes) {
    console.log(`Submitting Scene ${sc.index}...`);
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
    await new Promise((r) => setTimeout(r, 2000));
  }
}

main().catch(console.error);
