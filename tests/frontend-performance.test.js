const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('initial HTML ships static Tailwind and only the deferred bootstrap', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
  assert.match(html, /tailwind\.generated\.css/);
  assert.doesNotMatch(html, /xlsx(?:\.bundle)?\.js/);
  const externalScripts = [...html.matchAll(/<script\b[^>]*\bsrc=/g)];
  assert.equal(externalScripts.length, 2);
  assert.equal([...html.matchAll(/<script\b[^>]*\bdefer\b[^>]*\bsrc=/g)].length, 2);
});

test('XLSX is loaded only inside export functions', () => {
  const utils = read('js/utils.js');
  const loader = read('js/loader.js');
  assert.match(utils, /async loadXLSX\(\)/);
  assert.match(utils, /await Utils\.loadXLSX\(\)/);
  assert.match(loader, /xlsx-js-style@1\.2\.0/);
});

test('all application routes have lazy page definitions', () => {
  const router = read('js/router.js');
  for (const route of [
    'dashboard', 'infarkt-yangi', 'insult-yangi', 'infarkt-reyestri',
    'insult-reyestri', 'bemor-karta', 'bemorlar', 'hisobot', 'admin',
    'muassasa-imkoniyat', 'settings', 'harakat', 'marshrut', 'qabul',
    'keng-hisobot'
  ]) assert.match(router, new RegExp(`['\"]?${route}['\"]?\\s*:`));
  assert.match(router, /deps: \['calculators', 'cdss'\]/);
  assert.match(router, /deps: \['pd', 'agePyramid', 'charts'\]/);
});

test('dashboard recent-patient query is column-scoped, not select star', () => {
  const source = read('js/supabase.js');
  const start = source.indexOf('async getRecentPatients');
  const end = source.indexOf('// 15+ kun', start);
  const fn = source.slice(start, end);
  assert.doesNotMatch(fn, /select\(['\"]\*['\"]\)/);
  assert.match(fn, /infCols/);
  assert.match(fn, /insCols/);
});
