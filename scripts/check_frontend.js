async function checkFrontend() {
  try {
    const res = await fetch("http://localhost:3210/");
    console.log("Frontend Status:", res.status);
    const html = await res.text();
    console.log("HTML length:", html.length);
    if (html.includes("Build Error")) {
      console.log("ERROR STILL PRESENT!");
    } else {
      console.log("FRONTEND COMPILED SUCCESSFULLY!");
    }
  } catch (e) {
    console.log("Error:", e.message);
  }
}

checkFrontend();
