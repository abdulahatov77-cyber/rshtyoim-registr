const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// reperfuziyaNomzodi va _simptomSoat ni js/supabase.js dan ajratib olib ishga tushiramiz
function nomzodFn() {
  const src = read('js/supabase.js');
  const a = src.indexOf('  _simptomSoat(txt) {');
  const b = src.indexOf('  // ===== KENGAYTIRILGAN HISOBOT');
  assert.ok(a > 0 && b > a, 'reperfuziyaNomzodi topilmadi');
  const body = src.slice(a, b).replace(/,\s*$/, '');
  return new Function(`const o = {${body}}; return (turi, d) => o.reperfuziyaNomzodi(turi, d);`)();
}

test('reperfuziya nomzodi: TIA nomzod emas, ishemik insult va STEMI nomzod', () => {
  const n = nomzodFn();
  assert.ok(n('insult', { insult_turi: 'Ishemik insult', simptom_vaqt: '3 soat' }));
  assert.equal(n('insult', { insult_turi: 'TIA (Tranzitor ishemik ataka)', simptom_vaqt: '3 soat' }), null);
  assert.equal(n('insult', { insult_turi: 'Gemorragik insult', simptom_vaqt: '3 soat' }), null);
  assert.equal(n('insult', { insult_turi: 'Ishemik insult', simptom_vaqt: '6 soat' }), null);
  assert.equal(n('insult', { insult_turi: 'Ishemik insult', simptom_vaqt: '2 soat', trombolizis_vaqti: '2026-11-10T04:00:00Z' }), null);
  assert.ok(n('infarkt', { infarkt_turi: "O'KS ST elevatsiya bilan (STEMI)", simptom_vaqt: '5 soat' }));
  assert.equal(n('infarkt', { infarkt_turi: "O'KS ST elevatsiyasiz (NSTEMI)", simptom_vaqt: '5 soat' }), null);
});

test('"Boshqa sabab" tanlansa izoh majburiy', () => {
  const c = read('js/components.js');
  assert.match(c, /id="rs-izoh"/);
  assert.match(c, /izoh\.length < 5/);
});
