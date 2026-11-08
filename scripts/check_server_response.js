async function checkServer() {
  try {
    const res = await fetch("http://localhost:3210/api/models?kind=video");
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Models returned count:", data.length);
    console.log("First 3 models:", data.slice(0, 3).map(m => m.label));
  } catch (e) {
    console.log("Error:", e.message);
  }
}

checkServer();
