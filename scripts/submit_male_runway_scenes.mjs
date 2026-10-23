import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();

  const scenes = [
    {
      index: 1,
      name: "Cảnh 1: Nam người mẫu bước ra sàn diễn thời trang Paris trong bộ suit đen",
      prompt: "Cinematic establishing wide tracking shot of Paris Men's Fashion Week runway show. A handsome young Vietnamese male runway model with a modern faded undercut hairstyle, warm confident smile, and clean fair skin. He wears a bespoke tailored luxury black designer suit with a crisp white shirt, walking down the glossy black mirrored catwalk with charismatic masculine stride. Dramatic overhead runway spotlights, camera flashbulbs firing from the audience and photographers, 35mm film aesthetic, 4k.",
      seconds: 8
    },
    {
      index: 2,
      name: "Cảnh 2: Sải bước catwalk tracking shot & Thần thái lịch lãm",
      prompt: "Medium dynamic tracking camera shot gliding backwards in front of the handsome young Vietnamese male model as he strides down the fashion runway. His tailored black suit fits impeccably, modern undercut hair neatly styled, flashing a warm charismatic smile towards the camera, fashion VIPs and critics watching from front row seats, soft lens flare, dramatic theatrical lighting, 35mm film color grading, 4k.",
      seconds: 8
    },
    {
      index: 3,
      name: "Cảnh 3: Tạo dáng đầu sàn catwalk & Nụ cười tự tin toả sáng",
      prompt: "Cinematic three-quarter medium shot as the handsome young Vietnamese male model reaches the front edge of the catwalk runway. He pauses confidently, adjusting his black suit jacket with one hand, offering a radiant warm smile to the photographers, camera flashbulbs flashing brilliantly, then performing a smooth confident pivot turn, audience applauding in soft bokeh background, 35mm film look, 4k.",
      seconds: 8
    }
  ];

  console.log("Submitting 3 new male runway scenes...");
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
