const fs = require('fs');

async function main() {
  const res = await fetch('https://x.ai/bot/cDANfKKC1XNW2EPmuzt7z', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });
  const html = await res.text();
  fs.writeFileSync('scripts/xai_page.html', html, 'utf8');
  console.log('Saved xai_page.html, size:', html.length);

  // Search for keywords
  const keywords = ['omni', 'voice', 'systemPrompt', 'instructions', 'bot', 'prompt'];
  for (const kw of keywords) {
    const regex = new RegExp(`.{0,100}${kw}.{0,100}`, 'gi');
    const matches = html.match(regex);
    console.log(`Matches for ${kw}:`, matches ? matches.length : 0);
    if (matches && matches.length > 0) {
      console.log(`Sample for ${kw}:`, matches.slice(0, 3));
    }
  }
}

main().catch(console.error);
