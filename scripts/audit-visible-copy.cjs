// Supplemental inventory: the legacy detector does not inspect HTML text nodes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: {} };
vm.createContext(context);
for (const file of ['medical-glossary', 'locales', 'calculator-locales', 'form-locales']) {
  vm.runInContext(fs.readFileSync(`js/${file}.js`, 'utf8'), context);
}
const normalize = text => text.replace(/\\(['"\\])/g, '$1').replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ').trim();
const known = new Set(Object.values(context.window.I18N_CATALOG.uz).map(normalize));
const findings = [];
for (const name of fs.readdirSync('js/pages').filter(name => name.endsWith('.js'))) {
  const source = fs.readFileSync(path.join('js/pages', name), 'utf8');
  const seen = new Set();
  for (const match of source.matchAll(/this\.field\('[^']+','((?:\\.|[^'\\])*)'/g)) {
    const text = normalize(match[1]);
    if (!known.has(text) && !seen.has(text)) {
      seen.add(text);
      findings.push({ file: `js/pages/${name}`, line: source.slice(0, match.index).split('\n').length, text });
    }
  }
  for (const match of source.matchAll(/>([^<>\n]+)</g)) {
    const text = normalize(match[1]);
    if (!/[A-Za-zА-Яа-я]/.test(text) || text.includes('${') || /[{};=]|=>/.test(text)) continue;
    if (known.has(text) || seen.has(text)) continue;
    if (/^[\d\s+%/.,:—–()\-]*$/.test(text)) continue;
    seen.add(text);
    findings.push({ file: `js/pages/${name}`, line: source.slice(0, match.index).split('\n').length, text });
  }
}
const filter = process.argv[2];
const selected = filter ? findings.filter(item => item.file.includes(filter)) : findings;
console.log(JSON.stringify({ candidates: selected.length, findings: selected }, null, 2));
