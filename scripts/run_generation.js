const { DatabaseSync } = require('node:sqlite');

async function main() {
  const db = new DatabaseSync('data/studio.db');
  const projectId = 'prj_06d6f1c9496a';
  const nodeId = 'generate-j4er7l';
  const modelId = 'iooai:seedance2.5 官渠';

  const prompt = `[@Image 1]: Female lead (Linh), exact face, dress, hair.
[@Image 2]: Male lead (Thắng), exact face, hair, casual jacket.
[@Image 3]: Riverside grassy dyke, concrete stairs, night atmosphere.
[@Image 4]: Upper dyke path and walkway reference.
10-second cinematic 16:9 live-action scene, cool moonlight.

• 0.00–4.00s: Wide shot. Linh [@Image 1] sits on grass near concrete stairs by the night river. Thắng [@Image 2] walks along upper dyke path [@Image 4].
• 4.00–7.00s: Medium shot. Thắng stops at stairs, notices her, speaking:
Thắng: “Linh?”
• 7.00–10.00s: Over-shoulder shot. Linh turns up, recognizes him. Thắng steps down.
Linh: “Ơ… anh Thắng.”
Thắng: “Sao em ngồi đây?”
Linh: “Em ra hóng gió tí.”

Audio: Night breeze, river ripples. Authentic northern Vietnamese voice lip-sync for Thắng and Linh. No music, no subtitles, smooth camera.`;

  const images = [
    '/api/files/prj_06d6f1c9496a/asset_a89400cc3de4-image.png.png',
    '/api/files/prj_06d6f1c9496a/asset_a3e66197873f-image.png.png',
    '/api/files/prj_06d6f1c9496a/asset_c501d59025f7-image.png.png',
    '/api/files/prj_06d6f1c9496a/asset_0d57f8ce9c10-image.png.png'
  ];

  // 1. Update graph node
  const graphRow = db.prepare('SELECT data FROM graphs WHERE project_id = ?').get(projectId);
  if (graphRow) {
    const graphData = JSON.parse(graphRow.data);
    const node = graphData.nodes.find(n => n.id === nodeId);
    if (node) {
      node.data.status = 'running';
      node.data.prompt = prompt;
      node.data.modelId = modelId;
      node.data.aspect = '16:9';
      node.data.resolution = '720p';
      node.data.duration = 10;
      delete node.data.error;
      db.prepare('UPDATE graphs SET data = ?, updated_at = ? WHERE project_id = ?').run(
        JSON.stringify(graphData),
        Date.now(),
        projectId
      );
      console.log('Set node to status: running with model:', modelId);
    }
  }

  // 2. Trigger /api/run
  console.log('Sending request to /api/run with', modelId, '...');
  const payload = {
    modelId,
    kind: 'video',
    projectId,
    nodeId,
    vars: {
      prompt,
      image: images[0],
      images,
      imageUrls: images,
      duration: 10,
      seconds: '10',
      aspect: '16:9',
      resolution: '720p'
    },
    name: 'generate-j4er7l'
  };

  const startTime = Date.now();
  try {
    const res = await fetch('http://localhost:3210/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(900_000)
    });

    const data = await res.json();
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.log(`Response received in ${durationSec}s:`, JSON.stringify(data, null, 2));

    if (!res.ok || data.error) {
      console.error('Run failed:', data.error || res.statusText);
      const gRow = db.prepare('SELECT data FROM graphs WHERE project_id = ?').get(projectId);
      if (gRow) {
        const gData = JSON.parse(gRow.data);
        const node = gData.nodes.find(n => n.id === nodeId);
        if (node) {
          node.data.status = 'error';
          node.data.error = data.error || 'Lỗi khi tạo video';
          db.prepare('UPDATE graphs SET data = ?, updated_at = ? WHERE project_id = ?').run(
            JSON.stringify(gData),
            Date.now(),
            projectId
          );
        }
      }
      process.exit(1);
    }

    // Success! Update node with result
    console.log('Video generated successfully!');
    const gRow = db.prepare('SELECT data FROM graphs WHERE project_id = ?').get(projectId);
    if (gRow) {
      const gData = JSON.parse(gRow.data);
      const node = gData.nodes.find(n => n.id === nodeId);
      if (node) {
        node.data.status = 'done';
        delete node.data.error;
        if (data.output) {
          node.data.result = data.output;
          node.data.videoUrl = data.output.url;
        }
        db.prepare('UPDATE graphs SET data = ?, updated_at = ? WHERE project_id = ?').run(
          JSON.stringify(gData),
          Date.now(),
          projectId
        );
        console.log('Graph node updated with done and videoUrl:', data.output?.url);
      }
    }
  } catch (err) {
    console.error('Fetch error:', err);
    process.exit(1);
  }
}

main().catch(console.error);
