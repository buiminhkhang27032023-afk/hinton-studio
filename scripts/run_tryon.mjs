async function main() {
  console.log("Calling /api/run for node_tryon_nu...");
  const body = {
    modelId: "seed:image:gemini-compose",
    kind: "image",
    projectId: "prj_superpower_20s",
    nodeId: "node_tryon_nu",
    name: "Thử đồ AI: Nữ chính + Váy dạ hội hồng",
    vars: {
      prompt: "Image 1 is a portrait of a beautiful Asian woman with long wavy black hair and porcelain skin. Image 2 is a dusty-rose blush pink satin evening gown with delicate spaghetti straps, ruched draped bodice, and a dramatic high side slit. Generate a new photorealistic master shot: the exact same woman from Image 1 (keep face, hair, body proportions identical) gracefully wearing the exact pink evening gown from Image 2. She is standing elegantly in an opulent Gothic marble palace ballroom with warm chandelier rim-lighting, 8k resolution, cinematic movie still.",
      modelImage: "/api/files/_library/asset_g1laz3jh-nu_chinh_goc.jpg",
      garmentImage: "/api/files/_library/asset_n2y091gi-vay_da_hoi_hong.png"
    }
  };

  const res = await fetch("http://localhost:3210/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  console.log("Response status:", res.status);
  console.log("Response data:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
