// ==================== KENGAYTIRILGAN HISOBOT ====================
// Etalon: Hisobot-jadvali-STRUKTURA.md (10 varaq)
// Manba: hisobot_rpc.sql dagi beshta RPC. Barcha agregatsiya va foizlar
// serverda hisoblanadi — ekran va Excel bir xil raqam beradi.
//
// Uchta tab: Jadval (1/2-varaq) · Marshrut (4/5/6-varaq) · Kaskad (7/8-varaq)
// Eksport — 10 varaqli xlsx.
const KengHisobotPage = {
  _f: { from: '', to: '', viloyat: '' },
  _d: {},          // { inf, ins, mInf, mIns, matInf, matIns, kInf, kIns }
  _tab: 'jadval',

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    KengHisobotPage._profile = profile;
    const keng = profile?.role === 'super_admin' || profile?.role === 'admin';
    if (!keng) KengHisobotPage._f.viloyat = profile?.viloyat || '';

    const uzt = ms => new Date(ms + 5 * 3600000).toISOString().slice(0, 10);
    if (!KengHisobotPage._f.from) {
      KengHisobotPage._f.from = uzt(Date.now()).slice(0, 4) + '-01-01';
      KengHisobotPage._f.to   = uzt(Date.now());
    }
    const f = KengHisobotPage._f;

    document.getElementById('app').innerHTML = Components.renderLayout(
      'keng-hisobot', 'Kengaytirilgan hisobot',
      'Viloyat va muassasa kesimida to\'liq tahlil — jadval, marshrut, kaskad',
      `<div id="kh-inner" class="animate-fadein">
        <div class="card mb-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${keng ? `
            <div>
              <label class="form-label">${icon('map-pin', 14)} Viloyat</label>
              <select id="kh-viloyat" class="form-select">
                <option value="">— Respublika —</option>
                ${APP_CONFIG.VILOYATLAR.map(v =>
                  `<option value="${esc(v)}" ${f.viloyat === v ? 'selected' : ''}>${esc(v)}</option>`).join('')}
              </select>
            </div>` : `
            <div>
              <label class="form-label">${icon('map-pin', 14)} Viloyat</label>
              <div class="form-input bg-slate-50 text-slate-500">${esc(f.viloyat || '—')}</div>
            </div>`}
            <div>
              <label class="form-label">${icon('calendar', 14)} Sana (dan)</label>
              <input type="date" id="kh-from" class="form-input" value="${f.from}"/>
            </div>
            <div>
              <label class="form-label">${icon('calendar', 14)} Sana (gacha)</label>
              <input type="date" id="kh-to" class="form-input" value="${f.to}"/>
            </div>
            <div class="flex items-end gap-2">
              <button id="kh-run" class="btn btn-primary flex items-center gap-2 flex-1 justify-center">
                ${icon('bar-chart-2', 16)} Shakllantirish
              </button>
              <button id="kh-export" class="btn btn-success flex items-center gap-2" disabled style="opacity:.5">
                ${icon('download', 16)} Excel
              </button>
            </div>
          </div>
        </div>

        <div class="tabs-container" id="kh-tabs"></div>
        <div id="kh-body">
          <div class="card text-center py-20">
            <div class="text-blue-200 mb-4">${icon('table', 56, 'mx-auto')}</div>
            <h3 class="text-xl font-bold text-blue-900 mb-1">Hisobotni shakllantirish</h3>
            <p class="text-slate-500 text-sm">Davrni tanlang va "Shakllantirish" tugmasini bosing</p>
          </div>
        </div>
      </div>`,
      user
    );
    Components.startClock();
    initIcons();
    KengHisobotPage.drawTabs();

    document.getElementById('kh-run').onclick    = () => KengHisobotPage.load();
    document.getElementById('kh-export').onclick = () => KengHisobotPage.eksport();
  },

  drawTabs() {
    const el = document.getElementById('kh-tabs');
    if (!el) return;
    const tabs = [['jadval', 'Jadval', 'table'], ['marshrut', 'Marshrut', 'route'],
                  ['kaskad', 'Kaskad', 'filter'], ['oyna', 'Terapevtik oyna', 'clock']];
    el.innerHTML = tabs.map(([k, nom, ic]) =>
      `<button class="tab-btn ${KengHisobotPage._tab === k ? 'active' : ''}"
               onclick="KengHisobotPage.setTab('${k}')">${icon(ic, 14)} ${nom}</button>`).join('');
    initIcons();
  },

  setTab(k) {
    KengHisobotPage._tab = k;
    KengHisobotPage.drawTabs();
    KengHisobotPage.draw();
  },

  async load() {
    const f = KengHisobotPage._f;
    f.from = document.getElementById('kh-from')?.value || f.from;
    f.to   = document.getElementById('kh-to')?.value   || f.to;
    const vEl = document.getElementById('kh-viloyat');
    if (vEl) f.viloyat = vEl.value;
    if (!f.from || !f.to) { showToast('Sana oralig\'ini tanlang', 'warning'); return; }

    const body = document.getElementById('kh-body');
    if (body) body.innerHTML = `<div class="card flex flex-col items-center py-16">
      <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p class="text-blue-900 font-semibold text-sm">Hisobot shakllantirilmoqda...</p></div>`;

    try {
      const [inf, ins, mInf, mIns, matInf, matIns, kInf, kIns, oInf, oIns] = await Promise.all([
        DB.hisobotInfarkt(f.from, f.to, f.viloyat),
        DB.hisobotInsult(f.from, f.to, f.viloyat),
        DB.hisobotMarshrutMuassasa(f.from, f.to, 'infarkt', f.viloyat),
        DB.hisobotMarshrutMuassasa(f.from, f.to, 'insult',  f.viloyat),
        DB.hisobotMarshrutMatritsa(f.from, f.to, 'infarkt'),
        DB.hisobotMarshrutMatritsa(f.from, f.to, 'insult'),
        DB.hisobotKaskad(f.from, f.to, 'infarkt', f.viloyat),
        DB.hisobotKaskad(f.from, f.to, 'insult',  f.viloyat),
        DB.hisobotOyna(f.from, f.to, 'infarkt', f.viloyat),
        DB.hisobotOyna(f.from, f.to, 'insult',  f.viloyat)
      ]);
      KengHisobotPage._d = { inf, ins, mInf, mIns, matInf, matIns, kInf, kIns, oInf, oIns };
      const btn = document.getElementById('kh-export');
      if (btn) { btn.disabled = false; btn.style.opacity = ''; }
      KengHisobotPage.draw();
    } catch (e) {
      const b = document.getElementById('kh-body');
      if (!b) return;   // sahifa almashgan
      b.innerHTML = `<div class="card text-center py-14">
        <div class="text-red-500 mb-3">${icon('alert-circle', 40, 'mx-auto')}</div>
        <h3 class="text-lg font-bold text-gray-900 mb-1">Hisobot shakllantirilmadi</h3>
        <p class="text-gray-500 text-sm">${esc(e.message)}</p>
        <p class="text-xs text-gray-400 mt-2">hisobot_rpc.sql Supabase'da ishga tushirilganini tekshiring</p>
      </div>`;
      initIcons();
    }
  },

  // ---------- umumiy yordamchilar ----------
  _n(v) { return v === null || v === undefined ? 0 : Number(v); },
  _foiz(v) { return v === null || v === undefined ? '—' : Number(v).toFixed(1) + '%'; },

  // Ustunlar yig'indisi bo'yicha JAMI qatori
  _jami(rows, sonlar) {
    const t = {};
    sonlar.forEach(k => { t[k] = rows.reduce((s, r) => s + KengHisobotPage._n(r[k]), 0); });
    return t;
  },

  draw() {
    const el = document.getElementById('kh-body');
    if (!el || !KengHisobotPage._d.inf) return;
    if (KengHisobotPage._tab === 'jadval')   el.innerHTML = KengHisobotPage.htmlJadval();
    if (KengHisobotPage._tab === 'marshrut') el.innerHTML = KengHisobotPage.htmlMarshrut();
    if (KengHisobotPage._tab === 'kaskad')   el.innerHTML = KengHisobotPage.htmlKaskad();
    if (KengHisobotPage._tab === 'oyna')     el.innerHTML = KengHisobotPage.htmlOyna();
    initIcons();
  },

  // ================= 4. TERAPEVTIK OYNA TABI =================
  // Bemor simptom boshlanganidan qancha vaqtda kelgani — viloyat va
  // muassasa kesimida. Foizlar faqat aniq vaqtli yozuvlar bo'yicha.
  OYNA_COLS: [
    ['viloyat','Viloyat','t'],['muassasa','Muassasa','t'],['bosqich','Bosqich','t'],
    ['jami','Bemor jami','b'],['aniq','Aniq vaqtli'],['nomalum','Vaqti noaniq'],
    ['s0_3','0–3 soat'],['s3_6','3–6 soat'],['s6_12','6–12 soat'],
    ['s12_24','12–24 soat'],['s24p','24+ soat'],
    ['ortacha_soat','O\'rtacha soat','n'],
    ['f4','≤4 soat %','%'],['f6','≤6 soat %','%'],['f12','≤12 soat %','%']
  ],

  htmlOyna() {
    const d = KengHisobotPage._d;
    return `
      <div class="card mb-4 !py-3 flex items-start gap-3 bg-blue-50 border-blue-200">
        ${icon('info', 18)}
        <span class="text-sm text-blue-900">
          Simptom boshlanganidan kasalxonaga kelguncha o'tgan vaqt.
          <b>Foizlar faqat "Aniq vaqtli" ustundagi yozuvlar bo'yicha</b> hisoblanadi —
          2026-yil 4-iyungacha forma faqat oraliq so'ragan, u yozuvlarda haqiqiy vaqt noma'lum.
          <div class="mt-1 text-xs text-blue-800">
            Klinik chegaralar: insultda trombolizis oynasi 4,5 soat (butun soatda ≤4),
            infarktda birlamchi PCI oynasi 12 soat.
          </div>
        </span>
      </div>
      ${KengHisobotPage._oynaTbl('🫀 Infarkt — terapevtik oyna', d.oInf, 'f12')}
      ${KengHisobotPage._oynaTbl('🧠 Insult — terapevtik oyna',  d.oIns, 'f4')}
      ${KengHisobotPage._oynaXulosa()}`;
  },

  _oynaTbl(sarlavha, rows, asosiy) {
    if (!rows || !rows.length) {
      return `<div class="card mb-4"><h3 class="card-title mb-2">${sarlavha}</h3>
        <p class="text-slate-400 text-sm py-6 text-center">Tanlangan davrda ma'lumot yo'q</p></div>`;
    }
    const cols = KengHisobotPage.OYNA_COLS;
    const sonlar = cols.filter(c => !c[2] || c[2] === 'b').map(c => c[0]);
    const t = KengHisobotPage._jami(rows, sonlar);
    // JAMI qatoridagi foizlar yig'indidan qayta hisoblanadi (foizlar o'rtachasi emas).
    // ≤4 soat ustuni bu yerda chiqmaydi — 0–3 va 3–6 guruhlari orasida qolib
    // ketadi va yig'indidan aniq hisoblab bo'lmaydi.
    const N = KengHisobotPage._n;
    const sum = k => rows.reduce((s, r) => s + N(r[k]), 0);
    t.f4  = null;
    t.f6  = t.aniq ? Math.round(100 * (sum('s0_3') + sum('s3_6')) / t.aniq * 10) / 10 : null;
    t.f12 = t.aniq ? Math.round(100 * (sum('s0_3') + sum('s3_6') + sum('s6_12')) / t.aniq * 10) / 10 : null;
    t.ortacha_soat = null;

    const katak = (r, c) => {
      const [k, , tur] = c;
      if (tur === 't') return `<td class="${k === 'muassasa' ? 'font-semibold text-slate-800' : 'text-slate-600'}">${esc(r[k] || '—')}</td>`;
      if (tur === '%') {
        const v = r[k];
        if (v === null || v === undefined) return `<td style="text-align:center;color:#cbd5e1">—</td>`;
        const f = Number(v);
        const yaxshi = k === asosiy ? (f >= 40) : false;
        const yomon  = k === asosiy ? (f < 20)  : false;
        return `<td style="text-align:center;font-weight:${k === asosiy ? 700 : 600};
          color:${yomon ? '#b91c1c' : yaxshi ? '#15803d' : '#0891b2'}">${f.toFixed(1)}%</td>`;
      }
      if (tur === 'n') {
        const v = r[k];
        return `<td style="text-align:center;color:#475569">${v === null || v === undefined ? '—' : Number(v).toFixed(1)}</td>`;
      }
      const v = KengHisobotPage._n(r[k]);
      const kul = k === 'nomalum' && v > 0;
      return `<td style="text-align:center;${tur === 'b' ? 'font-weight:700;color:#1d4ed8' : ''}
        ${kul ? 'color:#a16207' : ''}">${v || ''}</td>`;
    };

    return `
      <div class="card !p-0 overflow-hidden mb-4">
        <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200">
          <span class="card-title text-gray-900">${sarlavha}</span>
          <span class="text-xs text-slate-500">${rows.length} ta muassasa</span>
        </div>
        <div class="overflow-x-auto" style="max-height:65vh">
          <table class="w-full text-xs border-collapse">
            <thead style="position:sticky;top:0;z-index:1"><tr>
              ${cols.map(c => `<th style="background:#1e293b;color:#e2e8f0;padding:6px;font-size:10px;
                text-align:${c[2] === 't' ? 'left' : 'center'}">${esc(c[1])}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${rows.map((r, i) => `<tr style="background:${i % 2 ? '#fff' : '#f8fafc'}" class="hover:bg-blue-50">
                ${cols.map(c => katak(r, c)).join('')}</tr>`).join('')}
              <tr style="background:#dbeafe;font-weight:700">
                <td class="text-blue-900">JAMI</td><td class="text-blue-900">${rows.length}</td><td></td>
                ${cols.slice(3).map(c => katak(t, c)).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // Viloyat kesimida qisqa jamlanma
  _oynaXulosaRows() {
    const d = KengHisobotPage._d;
    const N = KengHisobotPage._n;
    const vil = [...new Set([...(d.oInf || []).map(r => r.viloyat),
                             ...(d.oIns || []).map(r => r.viloyat)])].filter(Boolean).sort();
    const pct = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : null;
    return vil.map(v => {
      const i = (d.oInf || []).filter(r => r.viloyat === v);
      const s = (d.oIns || []).filter(r => r.viloyat === v);
      const sum = (arr, k) => arr.reduce((a, r) => a + N(r[k]), 0);
      const iA = sum(i, 'aniq'), sA = sum(s, 'aniq');
      return {
        'Viloyat': v,
        'Infarkt — aniq vaqtli': iA,
        'Infarkt ≤6 soat %':  pct(sum(i, 's0_3') + sum(i, 's3_6'), iA),
        'Infarkt ≤12 soat %': pct(sum(i, 's0_3') + sum(i, 's3_6') + sum(i, 's6_12'), iA),
        'Infarkt >24 soat %': pct(sum(i, 's24p'), iA),
        'Insult — aniq vaqtli': sA,
        'Insult ≤3 soat %':   pct(sum(s, 's0_3'), sA),
        'Insult ≤6 soat %':   pct(sum(s, 's0_3') + sum(s, 's3_6'), sA),
        'Insult ≤12 soat %':  pct(sum(s, 's0_3') + sum(s, 's3_6') + sum(s, 's6_12'), sA),
        'Insult >24 soat %':  pct(sum(s, 's24p'), sA)
      };
    });
  },

  _oynaXulosa() {
    const rows = KengHisobotPage._oynaXulosaRows();
    if (!rows.length) return '';
    const cols = Object.keys(rows[0]);
    return `
      <div class="card !p-0 overflow-hidden">
        <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200">
          <span class="card-title text-gray-900">📊 Viloyatlar kesimida jamlanma</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead><tr>${cols.map(c => `<th style="background:#1e293b;color:#e2e8f0;padding:7px;
              font-size:10px;text-align:${c === 'Viloyat' ? 'left' : 'center'}">${esc(c)}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map((r, i) => `<tr style="background:${i % 2 ? '#fff' : '#f8fafc'}">
                ${cols.map(c => {
                  const v = r[c];
                  const isPct = c.includes('%');
                  const kech = isPct && c.includes('>24');
                  return `<td style="padding:6px;text-align:${c === 'Viloyat' ? 'left' : 'center'};
                    ${c === 'Viloyat' ? 'font-weight:600' : ''}
                    ${isPct ? `font-weight:600;color:${v === null ? '#cbd5e1' : kech ? (v >= 20 ? '#b91c1c' : '#a16207') : (v >= 40 ? '#15803d' : v < 20 ? '#b91c1c' : '#0891b2')}` : ''}">
                    ${v === null || v === undefined ? '—' : esc(v) + (isPct ? '%' : '')}</td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ================= 1. JADVAL TABI =================
  // Ustun guruhlari — etalon 1-INFARKT va 2-INSULT varaqlaridagi tartibda
  GURUH_INF: [
    ['Identifikatsiya', '#334155', [['viloyat','Viloyat','t'],['muassasa','Muassasa','t'],['bosqich','Bosqich','t']]],
    ['Tashxis', '#1d4ed8', [['stemi','STEMI'],['nstemi','NSTEMI'],['ami','AMI'],['jami','JAMI bemor','b']]],
    ['Qayerdan kelgan', '#0f766e', [['kelish_103','103'],['kelish_mustaqil','Mustaqil'],['kelish_muassasadan','Muassasadan'],['kelish_poliklinika','Poliklinika']]],
    ['Tekshiruv va amaliyot', '#7c3aed', [['ekg','EKG'],['exokg','EXOKG'],['kag','KAG'],['tlbap','TLBAP'],['stent','Stentlash'],['aksh','AKSH'],['tlt','TLT'],['qutqaruvchi_pci','Qutqaruvchi PCI'],['medikamentoz','Faqat medikamentoz'],['reperfuziya','REPERFUZIYA','b'],['reperfuziya_foiz','Reperfuziya %','%']]],
    ['Vaqt ko\'rsatkichi', '#c2410c', [['d2e_10','Eshik-EKG ≤10'],['d2b_90','Eshik-balon ≤90'],['d2n_30','Eshik-igna ≤30']]],
    ['Qayerga yuborilgan', '#0891b2', [['yub_bosqich','Bosqich markazga'],['yub_filial','Filialga'],['yub_bosh','Bosh markazga'],['yub_royxatdan_tashqari','Ro\'yxatdan tashqari']]],
    ['Chiqishdagi natija', '#991b1b', [['sogaygan','Sog\'aygan'],['yaxshilanish','Yaxshilanish'],['ozgarishsiz','O\'zgarishsiz'],['otkazilgan','O\'tkazilgan'],['olim_24','O\'lim ≤24s'],['olim_24plus','O\'lim >24s'],['olim_jami','O\'LIM JAMI','b'],['letallik_foiz','Letallik %','%'],['ochiq_holat','Ochiq holat']]],
    ['Nazorat', '#475569', [['nazorat','Nazorat','t']]]
  ],
  GURUH_INS: [
    ['Identifikatsiya', '#334155', [['viloyat','Viloyat','t'],['muassasa','Muassasa','t'],['bosqich','Bosqich','t']]],
    ['Tashxis', '#1d4ed8', [['ishemik','Ishemik'],['gemorragik','Gemorragik'],['tia','TIA'],['jami','JAMI bemor','b']]],
    ['Qayerdan kelgan', '#0f766e', [['kelish_103','103'],['kelish_mustaqil','Mustaqil'],['kelish_muassasadan','Muassasadan'],['kelish_poliklinika','Poliklinika']]],
    ['Tekshiruv', '#7c3aed', [['mskt','MSKT'],['kta','KT/MSKT angio'],['aspects','ASPECTS'],['nihss','NIHSS']]],
    ['Amaliyot / muolaja', '#6d28d9', [['tlt','TLT'],['trombektomiya','Trombektomiya'],['bridging','TLT+TE'],['gematoma','Gematoma evak.'],['dekompressiv','Dekompressiv'],['aneurizma','Anevrizma'],['medikamentoz','Faqat medikamentoz'],['reperfuziya','REPERFUZIYA','b'],['reperfuziya_foiz','Ishemikda reperf. %','%'],['mskt_qamrov_foiz','MSKT qamrovi %','%']]],
    ['Vaqt ko\'rsatkichi', '#c2410c', [['d2ct_20','Eshik-MSKT ≤20'],['d2n_60','Eshik-igna ≤60'],['d2p_120','Eshik-punksiya ≤120']]],
    ['Qayerga yuborilgan', '#0891b2', [['yub_bosqich','Bosqich markazga'],['yub_filial','Filialga'],['yub_bosh','Bosh markazga'],['yub_royxatdan_tashqari','Ro\'yxatdan tashqari']]],
    ['Chiqishdagi natija', '#991b1b', [['sogaygan','Sog\'aygan'],['yaxshilanish','Yaxshilanish'],['ozgarishsiz','O\'zgarishsiz'],['otkazilgan','O\'tkazilgan'],['olim_24','O\'lim ≤24s'],['olim_24plus','O\'lim >24s'],['olim_jami','O\'LIM JAMI','b'],['letallik_foiz','Letallik %','%'],['mrs_0_2','mRS 0-2'],['ochiq_holat','Ochiq holat']]],
    ['Nazorat', '#475569', [['nazorat','Nazorat','t']]]
  ],

  htmlJadval() {
    const d = KengHisobotPage._d;
    return `
      ${KengHisobotPage._tbl('🫀 1-INFARKT', d.inf, KengHisobotPage.GURUH_INF)}
      ${KengHisobotPage._tbl('🧠 2-INSULT',  d.ins, KengHisobotPage.GURUH_INS)}
      ${KengHisobotPage._xulosa()}`;
  },

  _tbl(sarlavha, rows, guruhlar) {
    if (!rows.length) {
      return `<div class="card mb-4"><h3 class="card-title mb-2">${sarlavha}</h3>
        <p class="text-slate-400 text-sm py-6 text-center">Tanlangan davrda ma'lumot yo'q</p></div>`;
    }
    const ustunlar = guruhlar.flatMap(g => g[2]);
    const sonlar = ustunlar.filter(u => u[2] !== 't' && u[2] !== '%').map(u => u[0]);
    const t = KengHisobotPage._jami(rows, sonlar);

    const katak = (r, u, jamiQator) => {
      const [k, , tur] = u;
      if (tur === 't') {
        if (k === 'nazorat') {
          const ok = r[k] === 'OK';
          return `<td style="text-align:center;font-weight:700;color:${ok ? '#15803d' : '#b91c1c'}">${esc(r[k] || '')}</td>`;
        }
        return `<td class="${k === 'muassasa' ? 'font-semibold text-slate-800' : 'text-slate-600'}">${esc(r[k] || '—')}</td>`;
      }
      if (tur === '%') {
        // Foiz JAMI qatorida qayta hisoblanmaydi — u SQL dagi qiymat emas, shuning uchun bo'sh
        return `<td style="text-align:center;color:#0891b2;font-weight:600">${jamiQator ? '' : KengHisobotPage._foiz(r[k])}</td>`;
      }
      const v = KengHisobotPage._n(r[k]);
      return `<td style="text-align:center;${tur === 'b' ? 'font-weight:700;color:#1d4ed8' : ''}">${v || ''}</td>`;
    };

    return `
      <div class="card !p-0 overflow-hidden mb-4">
        <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200">
          <span class="card-title text-gray-900">${sarlavha}</span>
          <span class="text-xs text-slate-500">${rows.length} ta muassasa</span>
        </div>
        <div class="overflow-x-auto" style="max-height:70vh">
          <table class="w-full text-xs border-collapse">
            <thead style="position:sticky;top:0;z-index:2">
              <tr>
                ${guruhlar.map(g => `<th colspan="${g[2].length}"
                  style="background:${g[1]};color:#fff;padding:6px 8px;font-size:11px;text-align:center;
                         border-right:2px solid rgba(255,255,255,.3)">${esc(g[0])}</th>`).join('')}
              </tr>
              <tr>
                ${ustunlar.map((u, i) => `<th style="background:#1e293b;color:#e2e8f0;padding:6px 6px;
                  font-size:10px;font-weight:600;text-align:${u[2] === 't' ? 'left' : 'center'};
                  ${i === 1 ? 'position:sticky;left:0;z-index:1' : ''}">${esc(u[1])}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map((r, i) => `
                <tr style="background:${i % 2 ? '#fff' : '#f8fafc'}" class="hover:bg-blue-50">
                  ${ustunlar.map(u => katak(r, u, false)).join('')}
                </tr>`).join('')}
              <tr style="background:#dbeafe;font-weight:700">
                <td class="text-blue-900">JAMI</td>
                <td class="text-blue-900">${rows.length} muassasa</td>
                <td></td>
                ${ustunlar.slice(3).map(u => katak(t, u, true)).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // 3-XULOSA varag'i — viloyat kesimida jamlanma
  _xulosaRows() {
    const d = KengHisobotPage._d;
    const vil = [...new Set([...d.inf.map(r => r.viloyat), ...d.ins.map(r => r.viloyat)])]
      .filter(Boolean).sort();
    const N = KengHisobotPage._n;
    return vil.map(v => {
      const i = d.inf.filter(r => r.viloyat === v);
      const s = d.ins.filter(r => r.viloyat === v);
      const sum = (arr, k) => arr.reduce((a, r) => a + N(r[k]), 0);
      const iJami = sum(i, 'jami'), sJami = sum(s, 'jami');
      const iRep = sum(i, 'reperfuziya'), sRep = sum(s, 'reperfuziya');
      const sIsh = sum(s, 'ishemik'), sMskt = sum(s, 'mskt');
      const pct = (a, b) => b > 0 ? Math.round(a / b * 1000) / 10 : null;
      return {
        'Viloyat': v,
        'Muassasalar soni': new Set([...i.map(r => r.muassasa), ...s.map(r => r.muassasa)]).size,
        'Infarkt — bemor jami': iJami,
        'shundan STEMI': sum(i, 'stemi'),
        'Infarkt — reperfuziya': iRep,
        'Infarkt — reperfuziya %': pct(iRep, iJami),
        'Infarkt — o\'lim': sum(i, 'olim_jami'),
        'Infarkt — letallik %': pct(sum(i, 'olim_jami'), iJami),
        'Insult — bemor jami': sJami,
        'shundan ishemik': sIsh,
        'Insult — MSKT': sMskt,
        'MSKT qamrovi %': pct(sMskt, sJami),
        'Insult — reperfuziya': sRep,
        'Ishemikda reperfuziya %': pct(sRep, sIsh),
        'Insult — o\'lim': sum(s, 'olim_jami'),
        'Insult — letallik %': pct(sum(s, 'olim_jami'), sJami)
      };
    });
  },

  _xulosa() {
    const rows = KengHisobotPage._xulosaRows();
    if (!rows.length) return '';
    const cols = Object.keys(rows[0]);
    return `
      <div class="card !p-0 overflow-hidden">
        <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200">
          <span class="card-title text-gray-900">📊 3-XULOSA — viloyat kesimida</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead><tr>${cols.map(c => `<th style="background:#1e293b;color:#e2e8f0;padding:7px;
              font-size:10px;text-align:${c === 'Viloyat' ? 'left' : 'center'}">${esc(c)}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map((r, i) => `<tr style="background:${i % 2 ? '#fff' : '#f8fafc'}">
                ${cols.map(c => {
                  const v = r[c];
                  const isPct = c.includes('%');
                  return `<td style="padding:6px;text-align:${c === 'Viloyat' ? 'left' : 'center'};
                    ${c === 'Viloyat' ? 'font-weight:600' : ''}${isPct ? 'color:#0891b2;font-weight:600' : ''}">
                    ${v === null || v === undefined ? '—' : esc(v) + (isPct ? '%' : '')}</td>`;
                }).join('')}
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ================= 2. MARSHRUT TABI =================
  htmlMarshrut() {
    const d = KengHisobotPage._d;
    return `
      ${KengHisobotPage._matritsa('🫀 Infarkt — viloyatlararo oqim', d.matInf)}
      ${KengHisobotPage._matritsa('🧠 Insult — viloyatlararo oqim',  d.matIns)}
      ${KengHisobotPage._marshTbl('🫀 4-MARSHRUT-INF', d.mInf, 'STEMI bemor')}
      ${KengHisobotPage._marshTbl('🧠 5-MARSHRUT-INS', d.mIns, 'Ishemik bemor')}`;
  },

  _matritsa(sarlavha, rows) {
    if (!rows.length) return '';
    const yubor = [...new Set(rows.map(r => r.yuboruvchi_viloyat))].sort();
    const qabul = [...new Set(rows.map(r => r.qabul_viloyat))].sort();
    const map = {};
    rows.forEach(r => { map[r.yuboruvchi_viloyat + '|' + r.qabul_viloyat] = Number(r.bemor_soni); });
    const max = Math.max(...rows.map(r => Number(r.bemor_soni)));
    const qisqa = v => (v || '').replace(' viloyati', '').replace(' Respublikasi', '').replace(' shahri', ' sh.');

    return `
      <div class="card !p-0 overflow-hidden mb-4">
        <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200">
          <span class="card-title text-gray-900">${sarlavha}</span>
          <span class="text-xs text-slate-500">Qator — yuborgan, ustun — qabul qilgan. Diagonal = viloyat ichida qolgan</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead><tr>
              <th style="background:#1e293b;color:#e2e8f0;padding:6px;text-align:left;position:sticky;left:0">Yuborgan \\ Qabul</th>
              ${qabul.map(q => `<th style="background:#1e293b;color:#e2e8f0;padding:6px;font-size:10px">${esc(qisqa(q))}</th>`).join('')}
              <th style="background:#1d4ed8;color:#fff;padding:6px">JAMI</th>
            </tr></thead>
            <tbody>
              ${yubor.map(y => {
                const jami = qabul.reduce((s, q) => s + (map[y + '|' + q] || 0), 0);
                return `<tr>
                  <td style="padding:6px;font-weight:600;background:#f8fafc;position:sticky;left:0">${esc(qisqa(y))}</td>
                  ${qabul.map(q => {
                    const v = map[y + '|' + q] || 0;
                    const diag = y === q;
                    const alfa = v ? Math.min(0.15 + v / max * 0.6, 0.75) : 0;
                    const bg = !v ? '#fff' : diag ? `rgba(21,128,61,${alfa})` : `rgba(37,99,235,${alfa})`;
                    return `<td style="padding:6px;text-align:center;background:${bg};
                      ${v && alfa > 0.45 ? 'color:#fff;font-weight:700' : ''}">${v || ''}</td>`;
                  }).join('')}
                  <td style="padding:6px;text-align:center;font-weight:700;background:#dbeafe;color:#1e3a8a">${jami}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  },

  MARSH_COLS: [
    ['viloyat','Viloyat','t'],['muassasa','Muassasa','t'],['bosqich','Bosqich','t'],
    ['jami','JAMI bemor','b'],
    ['oz_hududidan','O\'z hududidan'],['boshqadan_qabul','Boshqadan qabul'],
    ['ozida_davolangan','O\'zida davolangan'],
    ['yub_1bosqich','1-bosqich markazga'],['yub_filial','Filialga'],['yub_kardio','Kardiologiyaga'],
    ['yub_bosh','Bosh markazga'],['yub_boshqa_viloyat','Boshqa viloyatga'],['yub_royxatdan_tashqari','Ro\'yxatdan tashqari'],
    ['jami_yuborilgan','JAMI YUBORILGAN','b'],['yuborish_foiz','Yuborish %','%'],
    ['fokus_bemor','Fokus bemor'],['fokus_yetkazilgan','Yetkazilgan'],['yetkazish_foiz','Yetkazish %','%'],
    ['nazorat','Nazorat','t']
  ],

  _marshTbl(sarlavha, rows, fokusNomi) {
    if (!rows.length) return '';
    const cols = KengHisobotPage.MARSH_COLS;
    const sonlar = cols.filter(c => c[2] !== 't' && c[2] !== '%').map(c => c[0]);
    const t = KengHisobotPage._jami(rows, sonlar);
    const katak = (r, c, jamiQator) => {
      const [k, , tur] = c;
      if (tur === 't') {
        if (k === 'nazorat') {
          const ok = r[k] === 'OK';
          return `<td style="text-align:center;font-weight:700;color:${ok ? '#15803d' : '#b91c1c'}">${esc(r[k] || '')}</td>`;
        }
        return `<td class="${k === 'muassasa' ? 'font-semibold text-slate-800' : 'text-slate-600'}">${esc(r[k] || '—')}</td>`;
      }
      if (tur === '%') return `<td style="text-align:center;color:#0891b2;font-weight:600">${jamiQator ? '' : KengHisobotPage._foiz(r[k])}</td>`;
      const v = KengHisobotPage._n(r[k]);
      return `<td style="text-align:center;${tur === 'b' ? 'font-weight:700;color:#1d4ed8' : ''}">${v || ''}</td>`;
    };
    return `
      <div class="card !p-0 overflow-hidden mb-4">
        <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200">
          <span class="card-title text-gray-900">${sarlavha}</span>
          <span class="text-xs text-slate-500">Fokus = ${esc(fokusNomi)} — faqat shu guruh uchun yetkazish % hisoblanadi</span>
        </div>
        <div class="overflow-x-auto" style="max-height:60vh">
          <table class="w-full text-xs border-collapse">
            <thead style="position:sticky;top:0;z-index:1"><tr>
              ${cols.map(c => `<th style="background:#1e293b;color:#e2e8f0;padding:6px;font-size:10px;
                text-align:${c[2] === 't' ? 'left' : 'center'}">${esc(c[1])}</th>`).join('')}
            </tr></thead>
            <tbody>
              ${rows.map((r, i) => `<tr style="background:${i % 2 ? '#fff' : '#f8fafc'}" class="hover:bg-blue-50">
                ${cols.map(c => katak(r, c, false)).join('')}</tr>`).join('')}
              <tr style="background:#dbeafe;font-weight:700">
                <td class="text-blue-900">JAMI</td><td class="text-blue-900">${rows.length}</td><td></td>
                ${cols.slice(3).map(c => katak(t, c, true)).join('')}
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
  },

  // ================= 3. KASKAD TABI =================
  KASKAD_INF: ['STEMI bemor', 'Terapevtik oynada (≤12s)', 'EKG ≤10 daq', 'Reperfuziya qarori', 'Reperfuziya bajarilgan', 'Me\'yoriy vaqtda (≤90 daq)'],
  KASKAD_INS: ['Ishemik bemor', 'MSKT qilingan', 'ASPECTS baholangan', 'Reperfuziya ko\'rsatmasi', 'Reperfuziya bajarilgan', 'Me\'yoriy vaqtda (≤60 daq)'],

  htmlKaskad() {
    const d = KengHisobotPage._d;
    return `
      ${KengHisobotPage._voronka('🫀 7-KASKAD-INF', d.kInf, KengHisobotPage.KASKAD_INF, 'STEMI o\'limi')}
      ${KengHisobotPage._voronka('🧠 8-KASKAD-INS', d.kIns, KengHisobotPage.KASKAD_INS, 'mRS 0-2 bilan chiqqan')}`;
  },

  _voronka(sarlavha, rows, bosqichNomlari, natijaNomi) {
    if (!rows.length) {
      return `<div class="card mb-4"><h3 class="card-title mb-2">${sarlavha}</h3>
        <p class="text-slate-400 text-sm py-6 text-center">Tanlangan davrda ma'lumot yo'q</p></div>`;
    }
    const N = KengHisobotPage._n;
    const sum = k => rows.reduce((s, r) => s + N(r[k]), 0);
    const b = [sum('b1'), sum('b2'), sum('b3'), sum('b4'), sum('b5'), sum('b6')];
    const nat = sum('natija_son');
    const konv = b.slice(1).map((v, i) => b[i] > 0 ? Math.round(v / b[i] * 1000) / 10 : null);
    const engPast = konv.reduce((mi, v, i) => (v !== null && (mi === -1 || v < konv[mi])) ? i : mi, -1);
    const oq = ['1→2', '2→3', '3→4', '4→5', '5→6'];

    return `
      <div class="card mb-4">
        <div class="card-header !mb-3">
          <span class="card-title text-gray-900">${sarlavha}</span>
          <span class="text-xs text-slate-500">${rows.length} ta muassasa · jamlanma voronka</span>
        </div>

        ${b.map((v, i) => {
          const w = b[0] > 0 ? Math.max(v / b[0] * 100, 1) : 0;
          const k = i > 0 ? konv[i - 1] : null;
          const yomon = i > 0 && engPast === i - 1;
          return `
            <div style="margin-bottom:10px">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-semibold text-slate-700">${i + 1}. ${esc(bosqichNomlari[i])}</span>
                <span class="font-bold text-slate-900">${v}
                  ${k !== null ? `<span style="color:${yomon ? '#b91c1c' : '#64748b'};font-weight:600;margin-left:8px">
                    ${oq[i - 1]} ${k}%${yomon ? ' · eng katta yo\'qotish' : ''}</span>` : ''}</span>
              </div>
              <div style="height:22px;background:#f1f5f9;border-radius:6px;overflow:hidden">
                <div style="height:100%;width:${w}%;border-radius:6px;
                     background:${yomon ? 'linear-gradient(90deg,#dc2626,#f87171)' : 'linear-gradient(90deg,#1d4ed8,#60a5fa)'}"></div>
              </div>
            </div>`;
        }).join('')}

        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-dashed border-slate-200">
          <div><div class="text-xs text-slate-400">Yakuniy samaradorlik</div>
            <div class="text-lg font-bold text-blue-700">${b[0] > 0 ? (Math.round(b[4] / b[0] * 1000) / 10) : 0}%</div></div>
          <div><div class="text-xs text-slate-400">${esc(natijaNomi)}</div>
            <div class="text-lg font-bold text-slate-800">${nat}</div></div>
          <div><div class="text-xs text-slate-400">Nazorat buzilgan qatorlar</div>
            <div class="text-lg font-bold ${rows.filter(r => r.nazorat !== 'OK').length ? 'text-red-600' : 'text-green-600'}">
              ${rows.filter(r => r.nazorat !== 'OK').length}</div></div>
        </div>

        <details class="mt-4">
          <summary class="text-sm font-semibold text-blue-700 cursor-pointer">Muassasalar kesimida ko'rish</summary>
          <div class="overflow-x-auto mt-2">
            <table class="w-full text-xs border-collapse">
              <thead><tr>
                <th style="background:#1e293b;color:#e2e8f0;padding:6px;text-align:left">Viloyat</th>
                <th style="background:#1e293b;color:#e2e8f0;padding:6px;text-align:left">Muassasa</th>
                ${bosqichNomlari.map((n, i) => `<th style="background:#1e293b;color:#e2e8f0;padding:6px">${i + 1}</th>`).join('')}
                <th style="background:#1e293b;color:#e2e8f0;padding:6px">Yakuniy %</th>
                <th style="background:#1e293b;color:#e2e8f0;padding:6px">Eng katta yo'qotish</th>
                <th style="background:#1e293b;color:#e2e8f0;padding:6px">Nazorat</th>
              </tr></thead>
              <tbody>
                ${rows.map((r, i) => `<tr style="background:${r.nazorat !== 'OK' ? '#fef2f2' : (i % 2 ? '#fff' : '#f8fafc')}">
                  <td style="padding:5px">${esc(r.viloyat || '—')}</td>
                  <td style="padding:5px;font-weight:600">${esc(r.muassasa || '—')}</td>
                  ${['b1','b2','b3','b4','b5','b6'].map(k => `<td style="padding:5px;text-align:center">${N(r[k])}</td>`).join('')}
                  <td style="padding:5px;text-align:center;color:#0891b2;font-weight:600">${KengHisobotPage._foiz(r.yakuniy_foiz)}</td>
                  <td style="padding:5px;text-align:center;color:#b91c1c">${esc(r.eng_katta_yoqotish || '—')}</td>
                  <td style="padding:5px;text-align:center;font-weight:700;color:${r.nazorat === 'OK' ? '#15803d' : '#b91c1c'}">${esc(r.nazorat || '')}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </details>
      </div>`;
  },

  // ================= EKSPORT — 10 varaq =================
  eksport() {
    const d = KengHisobotPage._d;
    if (!d.inf) { showToast('Avval hisobotni shakllantiring', 'warning'); return; }
    const f = KengHisobotPage._f;

    const qator = (rows, cols) => rows.map(r => {
      const o = {};
      cols.forEach(c => {
        const v = r[c[0]];
        o[c[1]] = (v === null || v === undefined) ? '' : v;
      });
      return o;
    });

    const kaskadCols = (nomlar) => [
      ['viloyat','Viloyat'],['muassasa','Muassasa nomi'],
      ...nomlar.map((n, i) => [`b${i + 1}`, `${i + 1}. ${n}`]),
      ['k12','1→2 %'],['k23','2→3 %'],['k34','3→4 %'],['k45','4→5 %'],['k56','5→6 %'],
      ['yakuniy_foiz','YAKUNIY samaradorlik %'],
      ['natija_son','Yakuniy natija'],['natija_foiz','Yakuniy natija %'],
      ['eng_katta_yoqotish','Eng katta yo\'qotish'],['nazorat','Nazorat']
    ];

    const matritsaRows = (rows) => {
      const yubor = [...new Set(rows.map(r => r.yuboruvchi_viloyat))].sort();
      const qabul = [...new Set(rows.map(r => r.qabul_viloyat))].sort();
      const map = {};
      rows.forEach(r => { map[r.yuboruvchi_viloyat + '|' + r.qabul_viloyat] = Number(r.bemor_soni); });
      return yubor.map(y => {
        const o = { 'Yuborgan \\ Qabul': y };
        let jami = 0;
        qabul.forEach(q => { const v = map[y + '|' + q] || 0; o[q] = v || ''; jami += v; });
        o['JAMI'] = jami;
        return o;
      });
    };

    const infCols = KengHisobotPage.GURUH_INF.flatMap(g => g[2]).map(u => [u[0], u[1]]);
    const insCols = KengHisobotPage.GURUH_INS.flatMap(g => g[2]).map(u => [u[0], u[1]]);
    const marshCols = KengHisobotPage.MARSH_COLS.map(c => [c[0], c[1]]);

    const varaqlar = [
      { nom: '1-INFARKT',       rows: qator(d.inf, infCols) },
      { nom: '2-INSULT',        rows: qator(d.ins, insCols) },
      { nom: '3-XULOSA',        rows: KengHisobotPage._xulosaRows() },
      { nom: '4-MARSHRUT-INF',  rows: qator(d.mInf, marshCols) },
      { nom: '5-MARSHRUT-INS',  rows: qator(d.mIns, marshCols) },
      { nom: '6-VILOYATLARARO', rows: [
          { 'Yuborgan \\ Qabul': '— INFARKT —' }, ...matritsaRows(d.matInf),
          { 'Yuborgan \\ Qabul': '' },
          { 'Yuborgan \\ Qabul': '— INSULT —' },  ...matritsaRows(d.matIns)
        ] },
      { nom: '7-KASKAD-INF',    rows: qator(d.kInf, kaskadCols(KengHisobotPage.KASKAD_INF)) },
      { nom: '8-KASKAD-INS',    rows: qator(d.kIns, kaskadCols(KengHisobotPage.KASKAD_INS)) },
      { nom: '9-KASKAD-XULOSA', rows: KengHisobotPage._kaskadXulosa() },
      { nom: '10-LUGAT',        rows: KengHisobotPage._lugat() },
      { nom: '11-OYNA-INF',     rows: qator(d.oInf || [], KengHisobotPage.OYNA_COLS.map(c => [c[0], c[1]])) },
      { nom: '12-OYNA-INS',     rows: qator(d.oIns || [], KengHisobotPage.OYNA_COLS.map(c => [c[0], c[1]])) },
      { nom: '13-OYNA-XULOSA',  rows: KengHisobotPage._oynaXulosaRows() }
    ];

    const scope = (f.viloyat || 'Respublika').replace(/[:*?"<>|\\/]/g, '-');
    Utils.exportXLSXMulti(varaqlar, `hisobot_${scope}_${f.from}_${f.to}.xlsx`);
    showToast('✅ Excel fayl yuklab olindi — 10 varaq', 'success');
  },

  _kaskadXulosa() {
    const d = KengHisobotPage._d;
    const N = KengHisobotPage._n;
    const chiq = (rows, nomlar, turi) => {
      const vil = [...new Set(rows.map(r => r.viloyat))].filter(Boolean).sort();
      const sum = (arr, k) => arr.reduce((s, r) => s + N(r[k]), 0);
      return nomlar.map((nom, i) => {
        const k = `b${i + 1}`;
        const resp = sum(rows, k);
        const oldingi = i > 0 ? sum(rows, `b${i}`) : null;
        const boshi = sum(rows, 'b1');
        const o = {
          'Kasallik': turi,
          'Bosqich': `${i + 1}. ${nom}`,
          'Respublika bo\'yicha': resp,
          'Oldingi bosqichdan %': oldingi ? Math.round(resp / oldingi * 1000) / 10 : '',
          'Boshlanishdan %':      boshi   ? Math.round(resp / boshi   * 1000) / 10 : '',
          'Yo\'qotilgan bemor':   oldingi !== null ? oldingi - resp : '',
          'Yo\'qotish %':         oldingi ? Math.round((oldingi - resp) / oldingi * 1000) / 10 : ''
        };
        vil.forEach(v => { o[v] = sum(rows.filter(r => r.viloyat === v), k); });
        return o;
      });
    };
    return [
      ...chiq(d.kInf, KengHisobotPage.KASKAD_INF, 'Infarkt'),
      ...chiq(d.kIns, KengHisobotPage.KASKAD_INS, 'Insult')
    ];
  },

  _lugat() {
    return [
      { Varaq: 'Umumiy', Ustun: 'Bir qator = bir muassasa', Tarif: 'Har bir muassasa alohida qator; viloyat ustun sifatida takrorlanadi.', Manba: 'muassasa, viloyat' },
      { Varaq: 'Umumiy', Ustun: 'Davr', Tarif: 'Barcha raqamlar bitta hisobot davriga tegishli (qabul_vaqt bo\'yicha filtr).', Manba: 'qabul_vaqt (UTC+5)' },
      { Varaq: 'Umumiy', Ustun: 'Bosqich', Tarif: 'SSV buyrug\'i №136: 2 = MSKT + angiograf; 1 = MSKT; "-" = ro\'yxatda yo\'q. Hisoblanadi, qo\'lda kiritilmaydi.', Manba: 'muassasalar.mskt_bor / angiografiya_bor' },
      { Varaq: '1-INFARKT', Ustun: 'STEMI / NSTEMI / AMI', Tarif: 'Normallashtirilgan 3 qiymat. Matn bazada to\'liq saqlanadi, ilike bilan tasniflanadi.', Manba: 'infarkt_qabul.infarkt_turi' },
      { Varaq: '1-INFARKT', Ustun: 'TLT', Tarif: 'FAQAT trombolizis o\'tkazilgan, keyin PCI qilinmagan bemorlar.', Manba: 'tlt_vaqt, muolaja_turi' },
      { Varaq: '1-INFARKT', Ustun: 'Qutqaruvchi PCI', Tarif: 'TLT dan keyin PCI/stent qilingan. Stentlash ustuniga qayta sanalmaydi.', Manba: 'tlt_vaqt + pci_vaqt' },
      { Varaq: '1-INFARKT', Ustun: 'Faqat medikamentoz', Tarif: 'Hech qanday invaziv aralashuv va TLT bo\'lmagan bemorlar.', Manba: 'muolaja bayroqlari' },
      { Varaq: '1-INFARKT', Ustun: 'REPERFUZIYA JAMI', Tarif: 'Stentlash + TLT + Qutqaruvchi PCI. KAG diagnostik tekshiruv, reperfuziya emas.', Manba: 'hisoblanadi' },
      { Varaq: '2-INSULT', Ustun: 'MSKT qilingan', Tarif: 'MSKT TEKSHIRUV hisoblanadi, "amaliyot o\'tkazilgan" ga kirmaydi.', Manba: 'insult_qabul.mskt ~* "^ha"' },
      { Varaq: '2-INSULT', Ustun: 'TLT / Trombektomiya / TLT+TE', Tarif: 'O\'zaro istisno uch ustun: faqat TLT, faqat trombektomiya, ikkalasi (bridging).', Manba: 'trombolizis_vaqti, trombektomiya_vaqti' },
      { Varaq: '2-INSULT', Ustun: 'Ishemikda reperfuziya %', Tarif: 'Maxraj JAMI emas, ISHEMIK — asosiy sifat ko\'rsatkichi.', Manba: 'hisoblanadi' },
      { Varaq: 'Ikkalasi', Ustun: 'Yaxshilanish bilan', Tarif: 'DIQQAT: bazadagi "Reabilitatsiyaga yuborildi" qiymati shu ustunga qo\'shilgan — etalonda unga alohida ustun yo\'q.', Manba: 'hisobot_natija_guruh()' },
      { Varaq: 'Ikkalasi', Ustun: 'O\'lim ≤24 / >24 soat', Tarif: 'olim_vaqti ustuni bazada yo\'q, shuning uchun chiqish_sana o\'lim vaqti sifatida olinadi.', Manba: 'chiqish_sana - qabul_vaqt' },
      { Varaq: 'Ikkalasi', Ustun: 'Nazorat', Tarif: 'Chiqish natijalarida tasniflanmagan qiymat bo\'lsa "⚠". Barcha qatorda OK bo\'lishi kerak.', Manba: 'hisoblanadi' },
      { Varaq: '4/5-MARSHRUT', Ustun: 'Klinik maqsadli marshrut', Tarif: 'Fokus guruh: infarktda STEMI, insultda ishemik. Buyruq №136 6-bandi bo\'yicha qolgan bemorlar shu yerda davolanadi — yuborilmagani kamchilik emas.', Manba: 'buyruq №136' },
      { Varaq: '6-VILOYATLARARO', Ustun: 'Matritsa', Tarif: 'Qator = yuborgan viloyat, ustun = qabul qilgan. Diagonal (yashil) = viloyat ichida qolgan.', Manba: 'otkazilgan_muassasa -> muassasalar.viloyat' },
      { Varaq: '7/8-KASKAD', Ustun: 'Umumiy mantiq', Tarif: 'Har bosqich oldingisining ICHKI to\'plami — SQL da shart zanjiri bilan kafolatlangan.', Manba: '-' },
      { Varaq: '7/8-KASKAD', Ustun: 'Yakuniy natija', Tarif: 'STEMI o\'limi / mRS 0-2 — kaskad bosqichi EMAS, alohida baho ustuni.', Manba: '-' }
    ];
  }
};
