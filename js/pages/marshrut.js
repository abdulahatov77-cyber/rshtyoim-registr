// ==================== MARSHRUT ====================
// Bemorning muassasadan muassasaga ko'chishi: oqim matritsasi, yo'nalish
// KPI lari va imkoniyat pasaygan o'tkir marshrutlar auditi.
//
// Ma'lumot manbai — v_marshrut VIEW (uch manbadan yig'iladi):
//   o'tkir        — transfer_log + qabul.otkazilgan_muassasa
//   chiqish       — chiqarish varaqasi "Boshqa shifoxonaga o'tkazildi"
//   reabilitatsiya— chiqarish varaqasi "Reabilitatsiyaga yuborildi"
const MarshrutPage = {
  _f: { viloyat: '', from: '', to: '', bosqich: "o'tkir" },
  _xulosa: [],
  _matritsa: [],
  _audit: [],

  BOSQICHLAR: [
    ["o'tkir",         "O'tkir yo'naltirish", '#b91c1c'],
    ['chiqish',        'Chiqishdagi o\'tkazish', '#1d4ed8'],
    ['reabilitatsiya', 'Reabilitatsiyaga',      '#15803d']
  ],

  async render() {
    const user = await Auth.getUser();
    MarshrutPage._profile = await Profile.getCurrent();
    const isSA = MarshrutPage._profile?.role === 'super_admin'
              || MarshrutPage._profile?.role === 'rahbar';
    if (!isSA) MarshrutPage._f.viloyat = MarshrutPage._profile?.viloyat || '';

    document.getElementById('app').innerHTML = Components.renderLayout(
      'marshrut', 'Marshrut', 'Bemorning muassasalar orasidagi harakati va marshrut sifati',
      `<div id="mr-inner" class="animate-fadein">
        <div class="card mb-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            ${isSA ? `
            <div>
              <label class="form-label">${icon('map-pin', 14)} Viloyat</label>
              <select id="mr-viloyat" class="form-select">
                <option value="">Barchasi</option>
                ${APP_CONFIG.VILOYATLAR.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}
              </select>
            </div>` : ''}
            <div>
              <label class="form-label">${icon('calendar', 14)} Sana (dan)</label>
              <input type="date" id="mr-from" class="form-input"/>
            </div>
            <div>
              <label class="form-label">${icon('calendar', 14)} Sana (gacha)</label>
              <input type="date" id="mr-to" class="form-input"/>
            </div>
            <div class="flex items-end">
              <button id="mr-apply" class="btn btn-primary flex items-center gap-2 w-full justify-center">
                ${icon('refresh-cw', 16)} Yangilash
              </button>
            </div>
          </div>
        </div>

        <div id="mr-kpi"></div>

        <div class="card !p-0 overflow-hidden mb-4">
          <div class="card-header bg-gray-50 !mb-0 !border-b-gray-200 flex-wrap gap-3">
            <span class="card-title text-gray-900">${icon('git-fork', 18)} Oqim matritsasi</span>
            <div class="flex gap-2" id="mr-bosqich-tabs"></div>
          </div>
          <div class="overflow-x-auto" id="mr-matritsa">
            <div class="flex justify-center py-16">
              <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          </div>
        </div>

        <div class="card !p-0 overflow-hidden">
          <div class="card-header bg-red-50 !mb-0 !border-b-red-100">
            <span class="card-title text-red-800">${icon('alert-triangle', 18)} Marshrut auditi — imkoniyat pasaygan o'tkir yo'naltirishlar</span>
            <span class="text-xs text-red-700" id="mr-audit-count"></span>
          </div>
          <div class="overflow-x-auto" id="mr-audit"></div>
        </div>
      </div>`,
      user
    );
    Components.startClock();
    initIcons();
    MarshrutPage.bind();
    await MarshrutPage.load();
  },

  bind() {
    const v = document.getElementById('mr-viloyat');
    if (v) v.value = MarshrutPage._f.viloyat;
    document.getElementById('mr-apply').onclick = () => {
      MarshrutPage._f.viloyat = document.getElementById('mr-viloyat')?.value ?? MarshrutPage._f.viloyat;
      MarshrutPage._f.from    = document.getElementById('mr-from').value;
      MarshrutPage._f.to      = document.getElementById('mr-to').value;
      MarshrutPage.load();
    };
  },

  async load() {
    const f = MarshrutPage._f;
    try {
      const [xulosa, matritsa, audit] = await Promise.all([
        DB.marshrutXulosa(f.viloyat, f.from, f.to),
        DB.marshrutMatritsa(f.bosqich, f.viloyat, f.from, f.to, 40),
        DB.marshrutAudit(f.viloyat, f.from, f.to, 200)
      ]);
      MarshrutPage._xulosa   = xulosa;
      MarshrutPage._matritsa = matritsa;
      MarshrutPage._audit    = audit;
      MarshrutPage.drawKpi();
      MarshrutPage.drawTabs();
      MarshrutPage.drawMatritsa();
      MarshrutPage.drawAudit();
    } catch (e) {
      const box = document.getElementById('mr-matritsa');
      if (!box) return;   // sahifa almashgan
      box.innerHTML = `
        <div class="py-16 text-center">
          <div class="text-red-500 mb-3">${icon('alert-circle', 40, 'mx-auto')}</div>
          <h3 class="text-lg font-bold text-gray-900 mb-2">Ma'lumot yuklanmadi</h3>
          <p class="text-gray-500 text-sm">${esc(e.message)}</p>
          <p class="text-xs text-gray-400 mt-2">
            v_marshrut VIEW va marshrut_rpc.sql Supabase'da ishga tushirilganini tekshiring
          </p>
        </div>`;
      initIcons();
    }
  },

  // ---------- KPI kartochkalari ----------
  drawKpi() {
    const el = document.getElementById('mr-kpi');
    if (!el) return;
    const rows = MarshrutPage._xulosa;
    if (!rows.length) { el.innerHTML = ''; return; }

    const otkir = rows.find(r => r.bosqich === "o'tkir") || {};
    const jamiOtkir = Number(otkir.jami || 0);
    const pasaydi   = Number(otkir.imkoniyat_pasaydi || 0);
    const eskal     = Number(otkir.eskalatsiya || 0);
    const foiz = (n, d) => d ? Math.round(n / d * 1000) / 10 : 0;

    el.innerHTML = `
      <div class="stat-grid mb-4">
        ${MarshrutPage.kpiCard('git-fork', "O'tkir yo'naltirish", jamiOtkir,
            'Diagnostika yoki muolaja uchun ko\'chirilgan', '#b91c1c')}
        ${MarshrutPage.kpiCard('trending-up', "To'g'ri yo'nalish", `${foiz(eskal, jamiOtkir)}%`,
            `${eskal} ta — imkoniyati yuqori muassasaga`, '#15803d')}
        ${MarshrutPage.kpiCard('alert-triangle', 'Imkoniyat pasaygan', pasaydi,
            `${foiz(pasaydi, jamiOtkir)}% — MSKT yoki angiografiya yo'qolgan`, '#c2410c')}
        ${MarshrutPage.kpiCard('log-out', 'Chiqishda o\'tkazilgan',
            Number((rows.find(r => r.bosqich === 'chiqish') || {}).jami || 0),
            'Davolash tugagach boshqa shifoxonaga', '#1d4ed8')}
        ${MarshrutPage.kpiCard('activity', 'Reabilitatsiyaga',
            Number((rows.find(r => r.bosqich === 'reabilitatsiya') || {}).jami || 0),
            'Reabilitatsiya yoki ambulator kuzatuvga', '#15803d')}
      </div>`;
    initIcons();
  },

  kpiCard(ic, label, value, hint, color) {
    return `
      <div class="stat-card">
        <div class="stat-icon" style="background:${color}1a;color:${color}">${icon(ic, 22)}</div>
        <div>
          <div class="stat-value" style="color:${color}">${value}</div>
          <div class="stat-label">${esc(label)}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px">${esc(hint)}</div>
        </div>
      </div>`;
  },

  // ---------- Bosqich tanlash ----------
  drawTabs() {
    const el = document.getElementById('mr-bosqich-tabs');
    if (!el) return;
    el.innerHTML = MarshrutPage.BOSQICHLAR.map(([k, nom, rang]) => {
      const on = MarshrutPage._f.bosqich === k;
      return `<button class="btn btn-sm ${on ? '' : 'btn-secondary'}"
        style="${on ? `background:${rang};color:#fff;border-color:${rang}` : ''}"
        onclick="MarshrutPage.setBosqich('${k}')">${esc(nom)}</button>`;
    }).join('');
  },

  async setBosqich(k) {
    MarshrutPage._f.bosqich = k;
    MarshrutPage.drawTabs();
    const f = MarshrutPage._f;
    document.getElementById('mr-matritsa').innerHTML =
      `<div class="flex justify-center py-16"><div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>`;
    try {
      MarshrutPage._matritsa = await DB.marshrutMatritsa(k, f.viloyat, f.from, f.to, 40);
      MarshrutPage.drawMatritsa();
    } catch (e) { showToast(e.message, 'error'); }
  },

  // ---------- Oqim matritsasi ----------
  drawMatritsa() {
    const el = document.getElementById('mr-matritsa');
    if (!el) return;
    const rows = MarshrutPage._matritsa;
    if (!rows.length) {
      el.innerHTML = `<div class="py-14 text-center text-gray-400">Bu bosqichda ma'lumot yo'q</div>`;
      return;
    }
    const max = Math.max(...rows.map(r => Number(r.bemorlar)));

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:30%">Qayerdan</th>
            <th style="width:30%">Qayerga</th>
            <th style="width:14%">Yo'nalish</th>
            <th style="width:12%">Imkoniyat</th>
            <th style="width:14%">Bemorlar</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => {
            const n = Number(r.bemorlar);
            const pasaydi = (r.dan_mskt && !r.ga_mskt) || (r.dan_angio && !r.ga_angio);
            return `
            <tr style="cursor:default">
              <td>
                <div class="text-sm font-semibold text-gray-800">${esc(r.muassasa_dan || '—')}</div>
                <div class="text-xs text-gray-400">${MarshrutPage.darajaBadge(r.dan_daraja)} ${MarshrutPage.imkBadge(r.dan_mskt, r.dan_angio)}</div>
              </td>
              <td>
                <div class="text-sm font-semibold text-gray-800">${esc(r.muassasa_ga || '—')}</div>
                <div class="text-xs text-gray-400">${MarshrutPage.darajaBadge(r.ga_daraja)} ${MarshrutPage.imkBadge(r.ga_mskt, r.ga_angio)}</div>
              </td>
              <td>${MarshrutPage.yonalishBadge(r.yonalish)}</td>
              <td>${pasaydi
                    ? `<span class="badge badge-red">${icon('alert-triangle', 12)} pasaydi</span>`
                    : `<span class="text-xs text-gray-300">—</span>`}</td>
              <td>
                <div class="flex items-center gap-2">
                  <div style="flex:1;height:8px;background:#f1f5f9;border-radius:99px;overflow:hidden">
                    <div style="height:100%;width:${Math.round(n / max * 100)}%;background:#3b82f6"></div>
                  </div>
                  <span class="text-sm font-bold text-gray-900" style="min-width:38px;text-align:right">${n}</span>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;
    initIcons();
  },

  darajaBadge(d) {
    const map = { markaz: '4·markaz', filial: '3·filial', politravma: '2·politravma', ttb: '1·TTB/ShTB' };
    return d ? `<span style="color:#64748b">${map[d] || d}</span>` : `<span style="color:#cbd5e1">daraja yo'q</span>`;
  },

  imkBadge(mskt, angio) {
    const p = [];
    if (mskt)  p.push('MSKT');
    if (angio) p.push('angio');
    return p.length ? `· <span style="color:#0891b2">${p.join(' + ')}</span>` : '';
  },

  yonalishBadge(y) {
    if (y === 'eskalatsiya')   return `<span class="badge badge-green">${icon('arrow-up', 12)} yuqoriga</span>`;
    if (y === 'deeskalatsiya') return `<span class="badge badge-blue">${icon('arrow-down', 12)} pastga</span>`;
    if (y === 'gorizontal')    return `<span class="badge badge-gray">${icon('arrow-right', 12)} gorizontal</span>`;
    return `<span class="badge badge-gray">noma'lum</span>`;
  },

  // ---------- Audit ----------
  drawAudit() {
    const el = document.getElementById('mr-audit');
    const cnt = document.getElementById('mr-audit-count');
    if (!el) return;
    const rows = MarshrutPage._audit;
    if (cnt) cnt.textContent = rows.length ? `${rows.length} ta holat` : '';

    if (!rows.length) {
      el.innerHTML = `<div class="py-14 text-center text-green-600 font-semibold">
        ${icon('check-circle', 32, 'mx-auto mb-3')} Imkoniyat pasaygan marshrut topilmadi</div>`;
      initIcons();
      return;
    }

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width:8%">Tur</th>
            <th style="width:12%">K/T No</th>
            <th style="width:10%">Sana</th>
            <th style="width:22%">Qayerdan</th>
            <th style="width:22%">Qayerga</th>
            <th style="width:14%">Sabab</th>
            <th style="width:12%">Muammo</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr class="mr-audit-row" data-kt="${esc(r.kt_no)}" data-type="${esc(r.turi)}" style="cursor:pointer">
              <td><span class="badge ${r.turi === 'infarkt' ? 'badge-red' : 'badge-purple'}">${esc(r.turi)}</span></td>
              <td class="font-mono text-xs text-gray-500">${esc(r.kt_no)}</td>
              <td class="text-sm text-gray-600">${esc(Utils.formatDate(r.sana))}</td>
              <td class="text-sm text-gray-800">${esc(r.muassasa_dan)}</td>
              <td class="text-sm text-gray-800">${esc(r.muassasa_ga)}</td>
              <td class="text-xs text-gray-500">${esc(r.sabab || '— ko\'rsatilmagan')}</td>
              <td class="text-xs font-semibold text-red-700">${esc(r.muammo)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
    initIcons();

    document.querySelectorAll('.mr-audit-row').forEach(tr => {
      tr.addEventListener('click', function () {
        Router.go('bemor-karta', { kt_no: this.dataset.kt, type: this.dataset.type });
      });
    });
  }
};
