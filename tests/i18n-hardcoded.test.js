const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const frontendRoots = ['js', '.'];
const excluded = new Set(['i18n.js', 'locales.js', 'calculator-locales.js', 'medical-glossary.js', 'config.js', 'supabase.js']);

function filesUnder(relative) {
  const absolute = path.join(root, relative);
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap(entry => {
    if (relative === '.' && entry.isDirectory()) return [];
    if (entry.isDirectory()) return filesUnder(path.join(relative, entry.name));
    return entry.name.endsWith('.js') && !excluded.has(entry.name) ? [path.join(relative, entry.name)] : [];
  });
}

function audit() {
  const files = [...new Set(frontendRoots.flatMap(filesUnder))];
  const rules = [
    ['dialog', /\b(?:showToast|confirm|alert)\s*\(\s*(["'`])(?:(?!\1).)*[A-Za-zА-Яа-яЎҚҒҲўқғҳ]\s*/g],
    ['assignment', /\b(?:textContent|innerText)\s*=\s*(["'`])(?:(?!\1).)*[A-Za-zА-Яа-яЎҚҒҲўқғҳ]\s*/g],
    ['attribute', /\b(?:placeholder|title|aria-label)\s*=\s*(["'])(?:(?!\1).)*[A-Za-zА-Яа-яЎҚҒҲўқғҳ](?:(?!\1).)*\1/g],
    ['option', /<option\b[^>]*>\s*[^<$\n]*[A-Za-zА-Яа-яЎҚҒҲўқғҳ][^<$\n]*<\/option>/g]
  ];
  const findings = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    const lines = source.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/i18n-audit-allow/.test(line) || /\bt\(['"`]/.test(line)) return;
      for (const [rule, regex] of rules) {
        regex.lastIndex = 0;
        if (regex.test(line)) findings.push({ file: file.replace(/\\/g, '/'), line: index + 1, rule, text: line.trim().slice(0, 180) });
      }
    });
  }
  return findings;
}

test('hardcoded UI detector rejects every unreviewed hardcoded UI candidate', t => {
  const findings = audit();
  t.diagnostic(`hardcoded UI candidates: ${findings.length}`);
  if (process.env.I18N_AUDIT_FULL === '1') {
    const grouped = findings.reduce((result, item) => {
      result[item.file] = (result[item.file] || 0) + 1;
      return result;
    }, {});
    for (const [file, count] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
      t.diagnostic(`summary ${file}: ${count}`);
    }
  }
  const reported = process.env.I18N_AUDIT_FULL === '1' ? findings : findings.slice(0, 12);
  for (const item of reported) t.diagnostic(`${item.file}:${item.line} [${item.rule}] ${item.text}`);
  assert.equal(findings.length, 0, `unreviewed hardcoded UI candidates: ${findings.length}`);
});

test('hardcoded UI whitelist is explicit and reasoned', t => {
  const files = [...new Set(frontendRoots.flatMap(filesUnder))];
  const allowed = [];
  for (const file of files) {
    fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).forEach((line, index) => {
      if (/i18n-audit-allow/.test(line)) allowed.push({ file, line: index + 1, text: line });
    });
  }
  t.diagnostic(`reviewed whitelist entries: ${allowed.length}`);
  assert.equal(allowed.length, 7, 'whitelist changed; review every added or removed exception');
  for (const item of allowed) {
    assert.match(item.text, /i18n-audit-allow:\s+\S.{7,}/, `${item.file}:${item.line} needs a concrete whitelist reason`);
  }
});

test('NIHSS and GCS question copy has no hardcoded Uzbek text', () => {
  const source = fs.readFileSync(path.join(root, 'js/calculators.js'), 'utf8');
  const start = source.indexOf('openNIHSS');
  const end = source.indexOf('openAHA', start);
  const clinicalScales = source.slice(start, end);
  assert.doesNotMatch(clinicalScales, /Ong darajasi|Ko'rish maydoni|Yuz mushaklari|Nutq reaksiyasi|Harakat reaksiyasi/);
  assert.match(clinicalScales, /t\('nihss\.title'\)/);
  assert.match(clinicalScales, /t\('gcs\.title'\)/);
});
