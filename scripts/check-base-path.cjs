const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('lib/base-path.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
for (const prefix of ['', '/ai_studio']) {
  const module = { exports: {} };
  vm.runInNewContext(source, { module, exports: module.exports, process: { env: { NEXT_PUBLIC_BASE_PATH: prefix } } });
  const { withBasePath, withoutBasePath } = module.exports;
  assert.equal(withBasePath('/api/projects'), prefix + '/api/projects');
  assert.equal(withBasePath('/api/files/project/photo.jpg'), prefix + '/api/files/project/photo.jpg');
  assert.equal(withBasePath(prefix + '/api/projects'), prefix + '/api/projects');
  assert.equal(withBasePath('https://cdn.example/image.jpg'), 'https://cdn.example/image.jpg');
  assert.equal(withBasePath('data:image/png;base64,AA=='), 'data:image/png;base64,AA==');
  assert.equal(withBasePath('//cdn.example/image.jpg'), '//cdn.example/image.jpg');
  assert.equal(withoutBasePath(prefix + '/api/projects'), '/api/projects');
}
console.log('Root and /ai_studio API/media prefix checks passed.');
