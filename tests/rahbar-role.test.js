const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('rahbar sidebar is labelled read-only and write routes are hidden', () => {
  const source = read('js/components.js');
  assert.match(source, /const isRahbar = cachedProfile\?\.real_role === 'rahbar'/);
  assert.match(source, /Rahbar \(faqat ko\\'rish\)/);
  assert.match(source, /if \(item\.writeOnly && isRahbar\) return/);
});

test('rahbar cannot enter admin or new-patient pages through direct routes', () => {
  const admin = read('js/pages/admin.js');
  const infarkt = read('js/pages/infarkt-yangi.js');
  const insult = read('js/pages/insult-yangi.js');
  assert.match(admin, /profile\?\.real_role !== 'rahbar'/);
  assert.match(infarkt, /profile\?\.real_role === 'rahbar'[\s\S]*Router\.go\('dashboard'\)/);
  assert.match(insult, /profile\?\.real_role === 'rahbar'[\s\S]*Router\.go\('dashboard'\)/);
});

test('rahbar has no patient edit, discharge, bulk-delete or transfer controls', () => {
  const patient = read('js/pages/bemor-karta.js');
  const list = read('js/pages/bemorlar.js');
  assert.match(patient, /const canEdit = !isRahbar/);
  assert.match(patient, /p\.status==='active' && canEdit/);
  assert.match(patient, /profile\?\.real_role !== 'rahbar' && \(profile\?\.role === 'admin'/);
  assert.match(patient, /role !== 'super_admin' \|\| BemorKartaPage\._profile\?\.real_role === 'rahbar'/);
  assert.match(list, /const isSuperAdmin = BemorlarPage\._profile\?\.role === 'super_admin' && BemorlarPage\._profile\?\.real_role !== 'rahbar'/);
});

test('rahbar feedback and settings use the real role, not the read-scope alias', () => {
  const components = read('js/components.js');
  const settings = read('js/pages/settings.js');
  assert.match(components, /const role = profile\.real_role \|\| profile\.role/);
  assert.match(components, /profile\.role === 'super_admin' && profile\.real_role !== 'rahbar'/);
  assert.match(settings, /const isRahbar = profile\?\.real_role === 'rahbar'/);
  assert.match(settings, /Rahbar \(faqat ko'rish\)/);
});
