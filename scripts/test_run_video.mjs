const base = 'http://localhost:3210';
const projectId = 'prj_a9c0d8476382';

async function main() {
  const graphRes = await fetch(`${base}/api/projects/${projectId}/graph`);
  const graph = await graphRes.json();
  const videoNode = graph.nodes.find(n => n.id === 'video');

  const incomingEdges = graph.edges.filter(e => e.target === 'video');
  const sourceNodes = incomingEdges.map(e => graph.nodes.find(n => n.id === e.source)).filter(Boolean);
  
  const imageSources = sourceNodes.filter(n => n.type === 'image');
  const imageUrls = imageSources.map(n => n.data.result?.url || n.data.imageUrl).filter(Boolean);

  console.log('Image URLs for video:', imageUrls.length, imageUrls);
  console.log('Video Node Model:', videoNode.data.modelId);

  // Update node status to running in graph
  videoNode.data.status = 'running';
  videoNode.data.error = null;
  await fetch(`${base}/api/projects/${projectId}/graph`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  });

  const prompt = videoNode.data.prompt;

  try {
    const runRes = await fetch(`${base}/api/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modelId: videoNode.data.modelId,
        kind: 'video',
        projectId,
        nodeId: videoNode.id,
        vars: {
          prompt,
          image: imageUrls[0],
          images: imageUrls,
          duration: videoNode.data.duration || 12,
          aspect: videoNode.data.aspect || '9:16',
          size: '720x1280',
          seed: Math.floor(Math.random() * 1000000),
          resolution: '720p',
        },
        name: `video-lookbook-${Date.now()}`
      }),
      signal: AbortSignal.timeout(900000),
    });

    const result = await runRes.json();
    console.log('Run response status:', runRes.status);
    console.log('Run response body:', JSON.stringify(result, null, 2));

    const latestRes = await fetch(`${base}/api/projects/${projectId}/graph`);
    const latestGraph = await latestRes.json();
    const target = latestGraph.nodes.find(n => n.id === 'video');
    const resultNode = latestGraph.nodes.find(n => n.id === 'result');

    if (!runRes.ok || result.error) {
      target.data.status = 'error';
      target.data.error = result.error || 'Lỗi tạo video';
      if (resultNode) {
        resultNode.data.status = 'error';
        resultNode.data.error = target.data.error;
      }
    } else {
      target.data.status = 'done';
      target.data.result = result.output;
      target.data.error = null;
      if (resultNode) {
        resultNode.data.status = 'done';
        resultNode.data.result = result.output;
        resultNode.data.error = null;
      }
    }

    await fetch(`${base}/api/projects/${projectId}/graph`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestGraph),
    });
  } catch (err) {
    console.error('Execution error:', err);
    const latestRes = await fetch(`${base}/api/projects/${projectId}/graph`);
    const latestGraph = await latestRes.json();
    const target = latestGraph.nodes.find(n => n.id === 'video');
    target.data.status = 'error';
    target.data.error = err.message;
    await fetch(`${base}/api/projects/${projectId}/graph`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latestGraph),
    });
  }
}

main().catch(console.error);
