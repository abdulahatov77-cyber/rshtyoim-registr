/**
 * Google Sheets CSV → Supabase migration (Insult)
 * Ishlatish:  node migrate-insult.js data.csv
 *
 * Tayyorgarlik:
 *  1. Google Sheets → File → Download → CSV (.csv)
 *  2. SUPABASE_SERVICE_KEY ni to'ldiring (Dashboard → Settings → API → service_role)
 *  3. Terminal: node migrate-insult.js "D:\fayl.csv"
 */

const fs   = require('fs');
const path = require('path');

// ── Sozlamalar ───────────────────────────────────────────────
const SUPABASE_URL = 'https://udayvbywwnulbxrvxknm.supabase.co';
const SUPABASE_SERVICE_KEY = 'SHUNGA_SERVICE_ROLE_KEY_KIRITING';
// ─────────────────────────────────────────────────────────────

// ── CSV parser (quoted fields ni to'g'ri o'qiydi) ────────────
function parseCSV(text) {
  text = text.replace(/^﻿/, '');
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) { console.error('CSV bo\'sh'); process.exit(1); }

  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
    return obj;
  }).filter(r => r['FIO'] || r['K/T №']);
}

function parseLine(line) {
  const res = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; }
    else if ((line[i] === ',' || line[i] === ';') && !inQ) { res.push(cur); cur = ''; }
    else { cur += line[i]; }
  }
  res.push(cur);
  return res;
}

// ── Sana formatlash (DD.MM.YYYY yoki M/D/YYYY → YYYY-MM-DDThh:mm) ──
function parseDateTime(sana, soat) {
  if (!sana) return null;
  soat = (soat || '00:00').slice(0, 5);
  let d;
  if (sana.includes('.')) {
    const [dd, mm, yyyy] = sana.split('.');
    d = `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
  } else if (sana.includes('/')) {
    const parts = sana.split('/');
    if (parts[2]?.length === 4) {
      d = `${parts[2]}-${parts[0].padStart(2,'0')}-${parts[1].padStart(2,'0')}`;
    } else {
      d = `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
    }
  } else if (sana.includes('-')) {
    d = sana.slice(0, 10);
  } else {
    return null;
  }
  return `${d}T${soat}`;
}

// ── Status aniqlash ──────────────────────────────────────────
function parseStatus(holat, natija) {
  const h = ((holat || '') + (natija || '')).toLowerCase();
  if (h.includes('vafot')) return 'vafot';
  if (h.includes('chiqar') || h.includes('tuzald') || h.includes('yaxshilan') || h.includes('reabilita') || h.includes('boshqa')) return 'chiqarildi';
  return 'active';
}

// ── Sonni tozalash (masalan "14" → 14, "" → null) ────────────
function toInt(v) {
  const n = parseInt(v);
  return isNaN(n) ? null : n;
}

// ── Ustun mapping (insult_qabul) ─────────────────────────────
function mapRow(r) {
  const qabul_vaqt  = parseDateTime(r['Qabul sanasi'],   r['Qabul soati']);
  const chiqish_dt  = parseDateTime(r['Chiqish sanasi'], r['Chiqish soati']);
  const trombolizis = parseDateTime(r['Trombolizis sanasi'], r['Trombolizis soati']);
  const status      = parseStatus(r['Holati'] || '', r['Natija'] || '');

  const toArr = (v) => v ? v.split(',').map(s => s.trim()).filter(Boolean) : [];

  const qabul = {
    kt_no:              r['K/T №']                            || null,
    qabul_vaqt,
    fio:                r['FIO']                              || null,
    tugilgan_yil:       r["Tug'ilgan yili"]                   || null,
    jins:               r['Jinsi']                            || null,
    viloyat:            r['Viloyat / Shahar']                 || null,
    muassasa:           r["Muassasa to'liq nomi"]             || null,
    murojaat_yoli:      r["Murojaat yo'li"]                   || null,
    yuborgan_muassasa:  r['Yuborgan muassasa']                || null,
    simptom_vaqt:       r['Simptomlar qachon boshlangan?']    || null,
    qon_bosimi:         r['Qon bosimi (qabul paytida)']       || null,
    insult_turi:        r['Insult turi']                      || null,
    nihss_qabul:        toInt(r['NIHSS bali (qabul)']),
    gcs_bali:           toInt(r['GCS bali']),
    mskt_natija:        r['MSKT / MRT natijasi']              || null,
    trombolizis_vaqti:  trombolizis,
    muolaja_turi:       r['Bajarilgan muolaja turi']          || null,
    xavf_omil:          toArr(r['Xavf omillari']),
    status,
  };

  if (!qabul.kt_no) return null;

  const chiqarish = chiqish_dt ? {
    kt_no:          qabul.kt_no,
    chiqish_sana:   chiqish_dt,
    chiqish_holat:  r['Natija']                          || null,
    mrs_bali:       toInt(r['mRS bali (chiqishda)']),
    asoratlar:      toArr(r['Asoratlar']),
    boshqa_shifoxona: r['Boshqa shifoxona nomi']         || null,
    reabil_markaz:  r['Reabilitatsiya markazi nomi']     || null,
  } : null;

  return { qabul, chiqarish };
}

// ── Supabase REST upsert ─────────────────────────────────────
async function upsert(table, rows, conflict = 'kt_no') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type':  'application/json',
      'Prefer':        `resolution=merge-duplicates,return=minimal`,
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

// ── Asosiy funksiya ──────────────────────────────────────────
async function migrate(csvFile) {
  if (SUPABASE_SERVICE_KEY === 'SHUNGA_SERVICE_ROLE_KEY_KIRITING') {
    console.error('❌  SUPABASE_SERVICE_KEY ni to\'ldiring!');
    console.error('    Supabase Dashboard → Settings → API → service_role');
    process.exit(1);
  }

  const text = fs.readFileSync(path.resolve(csvFile), 'utf-8');
  const rows = parseCSV(text);
  console.log(`📋  Jami ${rows.length} ta yozuv topildi\n`);

  const qabulBatch = [], chiqarishBatch = [];
  let skip = 0;

  for (const row of rows) {
    const mapped = mapRow(row);
    if (!mapped) { skip++; continue; }
    qabulBatch.push(mapped.qabul);
    if (mapped.chiqarish) chiqarishBatch.push(mapped.chiqarish);
  }

  console.log(`➡️   insult_qabul ga ${qabulBatch.length} ta yozuv yuborilmoqda...`);
  try {
    await upsert('insult_qabul', qabulBatch);
    console.log(`✅  insult_qabul: ${qabulBatch.length} ta saqlandi`);
  } catch(err) {
    console.error('❌  insult_qabul xatosi:', err.message);
  }

  if (chiqarishBatch.length > 0) {
    console.log(`➡️   insult_chiqarish ga ${chiqarishBatch.length} ta yozuv yuborilmoqda...`);
    try {
      await upsert('insult_chiqarish', chiqarishBatch);
      console.log(`✅  insult_chiqarish: ${chiqarishBatch.length} ta saqlandi`);
    } catch(err) {
      console.error('❌  insult_chiqarish xatosi:', err.message);
    }
  }

  if (skip > 0) console.log(`⚠️   ${skip} ta yozuv K/T № yo'qligi sababli o'tkazib yuborildi`);
  console.log('\n🏁  Migration yakunlandi');
}

const csvArg = process.argv[2];
if (!csvArg) {
  console.error('Ishlatish: node migrate-insult.js "fayl.csv"');
  process.exit(1);
}
migrate(csvArg);
