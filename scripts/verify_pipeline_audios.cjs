const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('d:/phim ai thời trang/data/studio.db');

const row = db.prepare('SELECT * FROM models WHERE id = ?').get('iooai:seedance2.5 官渠');
const model = JSON.parse(row.config);
console.log('Seedance model body template:', model.body);

const testVars = {
  model: 'seedance2.5 官渠',
  prompt: 'Test [@Image 1] [@Audio 1] [@Audio 2]',
  seconds: '15',
  aspect: '16:9',
  images: ['https://example.com/img1.jpg'],
  audios: ['https://example.com/aud1.mp3', 'https://example.com/aud2.mp3']
};

function fillTemplate(template, vars) {
  if (typeof template === "string") {
    const exact = /^\{\{(\w+)\}\}$/.exec(template);
    if (exact) {
      const value = vars[exact[1]];
      return value === undefined ? null : value;
    }
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      vars[key] === undefined || vars[key] === null ? "" : String(vars[key]),
    );
  }
  if (Array.isArray(template)) return template.map((item) => fillTemplate(item, vars));
  if (template && typeof template === "object") {
    const out = {};
    for (const [key, value] of Object.entries(template)) {
      const filled = fillTemplate(value, vars);
      if (filled !== null || !/\{\{/.test(JSON.stringify(value))) out[key] = filled;
    }
    return out;
  }
  return template;
}

const filledBody = fillTemplate(model.body, testVars);
console.log('Resulting JSON body sent to IOOAI:');
console.log(JSON.stringify(filledBody, null, 2));
