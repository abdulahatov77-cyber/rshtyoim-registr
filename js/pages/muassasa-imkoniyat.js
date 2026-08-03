// ==================== MUASSASA IMKONIYATLARI (MSKT / Angiografiya) ====================
// Faqat super_admin uchun: har bir muassasada qaysi apparat borligini belgilash.
// Bu belgilar bemorni tekshiruvga yo'naltirishda muassasa ro'yxatini filtrlashda ishlatiladi.
const MuassasaImkoniyatPage = {
  rows: [],
  dirty: new Map(),

  // Marshrut oqimi tahlili uchun daraja. Tartib — yuqoridan pastga.
  // Raqam ierarxiyani bildiradi: manzil raqami manbadan katta bo'lsa — eskalatsiya.
  DARAJALAR: [
    ['markaz',     '4 · Respublika markazi'],
    ['filial',     '3 · Viloyat filiali'],
    ['politravma', '2 · Politravma markazi'],
    ['ttb',        '1 · TTB / ShTB']
  ],

  darajaNomi(k) {
    return (this.DARAJALAR.find(d => d[0] === k) || [])[1] || '';
  },

  async render() {
    const user = await Auth.getUser();
    const isSA = await Profile.isSuperAdmin();
    if (!isSA) { Router.go('dashboard'); return; }

    document.getElementById('app').innerHTML = Components.renderLayout(
      'muassasa-imkoniyat', 'Muassasa imkoniyati', 'MSKT va Angiografiya mavjudligi — yo\'naltirish filtri uchun',
      `<div id="mi-inner" class="animate-fadein">
        <div class="card mb-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative">
                <input id="mi-search" class="form-input pl-9" style="min-width:260px" placeholder="Muassasa yoki viloyat bo'yicha qidirish..."/>
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">${icon('search', 16)}</span>
              </div>
              <select id="mi-filter" class="form-select" style="max-width:220px">
                <option value="">Barchasi</option>
                <option value="mskt">Faqat MSKT bor</option>
                <option value="angio">Faqat Angiografiya bor</option>
                <option value="none">Hech qaysisi yo'q</option>
              </select>
              <select id="mi-daraja-filter" class="form-select" style="max-width:220px">
                <option value="">Barcha darajalar</option>
                <option value="__bosh__">⚠️ Daraja belgilanmagan</option>
                ${MuassasaImkoniyatPage.DARAJALAR.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}
              </select>
            </div>
            <button id="mi-save" class="btn btn-primary flex items-center gap-2" disabled style="opacity:0.5">
              ${icon('save', 16)} Saqlash
            </button>
          </div>
          <div id="mi-summary" class="text-sm text-slate-500 mt-3"></div>
        </div>
        <div class="card !p-0 overflow-hidden">
          <div class="overflow-x-auto" style="max-height:70vh;overflow-y:auto">
            <table class="data-table">
              <thead style="position:sticky;top:0;z-index:1">
                <tr>
                  <th style="width:4%">#</th>
                  <th style="width:18%">Viloyat</th>
                  <th>Muassasa</th>
                  <th style="width:18%">Daraja</th>
                  <th style="width:9%;text-align:center">MSKT</th>
                  <th style="width:11%;text-align:center">Angiografiya</th>
                </tr>
              </thead>
              <tbody id="mi-tbody">
                <tr><td colspan="6" class="text-center py-10 text-gray-400">Yuklanmoqda...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`,
      user
    );
    Components.startClock();
    initIcons();

    try {
      this.rows = await DB.getMuassasalarFiltered(null, null);
    } catch (e) {
      document.getElementById('mi-tbody').innerHTML =
        `<tr><td colspan="6" class="text-center py-10 text-red-500">Xatolik: ${esc(e.message)}<br>
         <span class="text-xs text-gray-400">muassasa_imkoniyat.sql va muassasa_daraja.sql skriptlari Supabase'da ishga tushirilganini tekshiring</span></td></tr>`;
      return;
    }
    this.dirty.clear();
    this.bind();
    this.draw();
  },

  bind() {
    document.getElementById('mi-search').oninput  = Utils.debounce(() => this.draw(), 300);
    document.getElementById('mi-filter').onchange = () => this.draw();
    document.getElementById('mi-daraja-filter').onchange = () => this.draw();
    document.getElementById('mi-save').onclick    = () => this.save();

    document.getElementById('mi-tbody').onchange = (e) => {
      const el = e.target;
      const id  = Number(el.dataset.id);
      if (!id) return;
      const row = this.rows.find(r => r.id === id);
      if (!row) return;

      if (el.dataset.field === 'daraja')    row.daraja = el.value || null;
      else if (el.dataset.field === 'mskt') row.mskt_bor = el.checked;
      else if (el.dataset.field === 'angio') row.angiografiya_bor = el.checked;
      else return;

      this.dirty.set(id, {
        id,
        mskt:   row.mskt_bor,
        angio:  row.angiografiya_bor,
        daraja: row.daraja || ''
      });
      const btn = document.getElementById('mi-save');
      btn.disabled = false;
      btn.style.opacity = '';
      btn.innerHTML = `${icon('save', 16)} Saqlash (${this.dirty.size})`;
      initIcons();
      this.drawSummary();
    };
  },

  filtered() {
    const q = (document.getElementById('mi-search')?.value || '').toLowerCase().trim();
    const f = document.getElementById('mi-filter')?.value || '';
    const d = document.getElementById('mi-daraja-filter')?.value || '';
    return this.rows.filter(r => {
      const okQ = !q
        || (r.nomi || '').toLowerCase().includes(q)
        || (r.viloyat || '').toLowerCase().includes(q);
      const okF = f === ''      ? true
                : f === 'mskt'  ? r.mskt_bor
                : f === 'angio' ? r.angiografiya_bor
                : (!r.mskt_bor && !r.angiografiya_bor);
      const okD = d === ''         ? true
                : d === '__bosh__' ? !r.daraja
                : r.daraja === d;
      return okQ && okF && okD;
    });
  },

  draw() {
    const list = this.filtered();
    document.getElementById('mi-tbody').innerHTML = list.length
      ? list.map((r, i) => `
          <tr>
            <td class="text-xs text-gray-400">${i + 1}</td>
            <td class="text-sm text-gray-600">${esc(r.viloyat || '—')}</td>
            <td class="text-sm font-semibold text-gray-800">${esc(r.nomi)}</td>
            <td>
              <select data-id="${r.id}" data-field="daraja"
                      class="form-select !py-1 !text-xs"
                      style="${r.daraja ? '' : 'border-color:#fca5a5;background:#fef2f2'}">
                <option value="">— belgilanmagan —</option>
                ${this.DARAJALAR.map(([k, n]) =>
                  `<option value="${k}" ${r.daraja === k ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </td>
            <td style="text-align:center">
              <input type="checkbox" data-id="${r.id}" data-field="mskt"
                     style="width:18px;height:18px;accent-color:#2563eb;cursor:pointer"
                     ${r.mskt_bor ? 'checked' : ''}>
            </td>
            <td style="text-align:center">
              <input type="checkbox" data-id="${r.id}" data-field="angio"
                     style="width:18px;height:18px;accent-color:#7c3aed;cursor:pointer"
                     ${r.angiografiya_bor ? 'checked' : ''}>
            </td>
          </tr>`).join('')
      : `<tr><td colspan="6" class="text-center py-10 text-gray-400">Topilmadi</td></tr>`;
    this.drawSummary(list.length);
  },

  drawSummary(shown) {
    const m = this.rows.filter(r => r.mskt_bor).length;
    const a = this.rows.filter(r => r.angiografiya_bor).length;
    const d = this.rows.filter(r => !r.daraja).length;
    const n = shown ?? this.filtered().length;
    const el = document.getElementById('mi-summary');
    if (!el) return;
    el.innerHTML =
      `Jami ${this.rows.length} muassasa · MSKT: ${m} ta · Angiografiya: ${a} ta · Ko'rsatilmoqda: ${n} ta` +
      (this.dirty.size ? ` · <b>Saqlanmagan o'zgarish: ${this.dirty.size} ta</b>` : '') +
      (d ? ` · <span style="color:#b91c1c;font-weight:600">Daraja belgilanmagan: ${d} ta</span>` : '');
  },

  async save() {
    if (!this.dirty.size) return;
    const btn = document.getElementById('mi-save');
    btn.disabled = true;
    btn.textContent = 'Saqlanmoqda...';
    try {
      const n = await DB.setMuassasaImkoniyat([...this.dirty.values()]);
      this.dirty.clear();
      btn.innerHTML = `${icon('save', 16)} Saqlash`;
      btn.style.opacity = '0.5';
      initIcons();
      showToast(`✅ ${n} ta muassasa yangilandi`, 'success');
      this.drawSummary();
    } catch (e) {
      showToast('Xatolik: ' + e.message, 'error', 6000);
      btn.disabled = false;
      btn.innerHTML = `${icon('save', 16)} Saqlash (${this.dirty.size})`;
      initIcons();
    }
  }
};
