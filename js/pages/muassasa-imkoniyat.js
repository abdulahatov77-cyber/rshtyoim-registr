// ==================== MUASSASA IMKONIYATLARI (MSKT / Angiografiya) ====================
// Faqat super_admin uchun: har bir muassasada qaysi apparat borligini belgilash.
// Bu belgilar bemorni tekshiruvga yo'naltirishda muassasa ro'yxatini filtrlashda ishlatiladi.
const MuassasaImkoniyatPage = {
  rows: [],
  dirty: new Map(),
  // muassasa_overrides dagi 'remove' yozuvlari — bu muassasalar hisobotda
  // qoladi, lekin yangi bemor/ro'yxatdan o'tish formalarida chiqmaydi
  yashiringan: new Set(),

  // Marshrut oqimi tahlili uchun daraja. Tartib — yuqoridan pastga.
  // Raqam ierarxiyani bildiradi: manzil raqami manbadan katta bo'lsa — eskalatsiya.
  DARAJALAR: [
    ['markaz',     '4 · Respublika markazi'],
    ['filial',     '3 · Viloyat filiali'],
    ['politravma', '2 · Politravma markazi'],
    ['ttb',        '1 · TTB / ShTB']
  ],

  darajaNomi(k) {
    return I18n.translateText((this.DARAJALAR.find(d => d[0] === k) || [])[1] || '');
  },

  async render() {
    const user = await Auth.getUser();
    const isSA = await Profile.isSuperAdmin();
    if (!isSA) { Router.go('dashboard'); return; }

    document.getElementById('app').innerHTML = Components.renderLayout(
      'muassasa-imkoniyat', 'Muassasa imkoniyati', t('pages.capabilitiesSubtitle'),
      `<div id="mi-inner" class="animate-fadein">
        <div class="card mb-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative">
                <input id="mi-search" class="form-input pl-9" style="min-width:260px" placeholder="${t('capabilities.search')}"/>
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">${icon('search', 16)}</span>
              </div>
              <select id="mi-filter" class="form-select" style="max-width:220px">
                <option value="">${t('common.all')}</option>
                <option value="mskt">${t('capabilities.onlyMsct')}</option>
                <option value="angio">${t('capabilities.onlyAngio')}</option>
                <option value="none">${t('capabilities.neither')}</option>
                <option value="registrsiz">${t('capabilities.noRegistry')}</option>
              </select>
              <select id="mi-daraja-filter" class="form-select" style="max-width:220px">
                <option value="">${t('capabilities.allLevels')}</option>
                <option value="__bosh__">${t('capabilities.levelMissing')}</option>
                ${MuassasaImkoniyatPage.DARAJALAR.map(([k, n]) => `<option value="${k}">${I18n.translateText(n)}</option>`).join('')}
              </select>
              <select id="mi-holat-filter" class="form-select" style="max-width:200px">
                <option value="">${t('capabilities.activeHidden')}</option>
                <option value="faol">${t('capabilities.activeOnly')}</option>
                <option value="yashirin">${t('capabilities.hiddenOnly')}</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <button id="mi-add" class="btn btn-secondary flex items-center gap-2">
                ${icon('plus', 16)} ${t('facility.newInstitution')}
              </button>
              <button id="mi-save" class="btn btn-primary flex items-center gap-2" disabled style="opacity:0.5">
                ${icon('save', 16)} ${t('common.save')}
              </button>
            </div>
          </div>
          <div id="mi-summary" class="text-sm text-slate-500 mt-3"></div>
        </div>
        <div class="card !p-0 overflow-hidden">
          <div class="overflow-x-auto" style="max-height:70vh;overflow-y:auto">
            <table class="data-table">
              <thead style="position:sticky;top:0;z-index:1">
                <tr>
                  <th style="width:4%">#</th>
                  <th style="width:18%">${t('common.region')}</th>
                  <th>${t('common.institution')}</th>
                  <th style="width:18%">${t('capabilities.levelHeading')}</th>
                  <th style="width:7%;text-align:center">MSKT</th>
                  <th style="width:9%;text-align:center">${t('capabilities.angiography')}</th>
                  <th style="width:11%;text-align:center" title="${t('capabilities.registryTitle')}">${t('facility.registry')}</th>
                  <th style="width:8%;text-align:center">${t('common.actions')}</th>
                </tr>
              </thead>
              <tbody id="mi-tbody">
                <tr><td colspan="8" class="text-center py-10 text-gray-400">${t('common.loading')}</td></tr>
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
      await this.loadYashiringan();
    } catch (e) {
      document.getElementById('mi-tbody').innerHTML =
        `<tr><td colspan="8" class="text-center py-10 text-red-500">${t('common.errorPrefix', { error: esc(e.message) })}<br>
         <span class="text-xs text-gray-400">${t('capabilities.sqlHelp')}</span></td></tr>`;
      return;
    }
    this.dirty.clear();
    this.bind();
    this.draw();
  },

  // Yashirilganlar ro'yxati muassasa_overrides dan olinadi — bu jadval
  // bemor formalaridagi ochiluvchi ro'yxatni ham boshqaradi
  async loadYashiringan() {
    try {
      const ovs = await MuassasaDB.getOverrides();
      this.yashiringan = new Set(
        ovs.filter(o => o.action === 'remove').map(o => (o.nomi || '').toLowerCase())
      );
    } catch (e) { this.yashiringan = new Set(); }
  },

  yashirinmi(r) {
    return this.yashiringan.has((r.nomi || '').toLowerCase());
  },

  bind() {
    document.getElementById('mi-search').oninput  = Utils.debounce(() => this.draw(), 300);
    document.getElementById('mi-filter').onchange = () => this.draw();
    document.getElementById('mi-daraja-filter').onchange = () => this.draw();
    document.getElementById('mi-holat-filter').onchange  = () => this.draw();
    document.getElementById('mi-save').onclick    = () => this.save();
    document.getElementById('mi-add').onclick     = () => this.qoshModal();

    document.getElementById('mi-tbody').onclick = (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const id = Number(btn.dataset.id);
      if (btn.dataset.act === 'ochir')  this.ochir(id);
      if (btn.dataset.act === 'yashir') this.yashir(id, btn.dataset.yashir === '1');
    };

    document.getElementById('mi-tbody').onchange = (e) => {
      const el = e.target;
      const id  = Number(el.dataset.id);
      if (!id) return;
      const row = this.rows.find(r => r.id === id);
      if (!row) return;

      if (el.dataset.field === 'daraja')    row.daraja = el.value || null;
      else if (el.dataset.field === 'mskt') row.mskt_bor = el.checked;
      else if (el.dataset.field === 'angio') row.angiografiya_bor = el.checked;
      else if (el.dataset.field === 'registr') row.registrga_kiritadi = el.checked;
      else return;

      this.dirty.set(id, {
        id,
        mskt:    row.mskt_bor,
        angio:   row.angiografiya_bor,
        daraja:  row.daraja || '',
        registr: row.registrga_kiritadi !== false
      });
      const btn = document.getElementById('mi-save');
      btn.disabled = false;
      btn.style.opacity = '';
      btn.innerHTML = `${icon('save', 16)} ${t('common.save')} (${this.dirty.size})`;
      initIcons();
      this.drawSummary();
    };
  },

  filtered() {
    const q = (document.getElementById('mi-search')?.value || '').toLowerCase().trim();
    const f = document.getElementById('mi-filter')?.value || '';
    const d = document.getElementById('mi-daraja-filter')?.value || '';
    const h = document.getElementById('mi-holat-filter')?.value || '';
    return this.rows.filter(r => {
      const okH = h === ''         ? true
                : h === 'yashirin' ? this.yashirinmi(r)
                : !this.yashirinmi(r);
      if (!okH) return false;
      const okQ = !q
        || (r.nomi || '').toLowerCase().includes(q)
        || I18n.facilityName(r.nomi).toLowerCase().includes(q)
        || (r.viloyat || '').toLowerCase().includes(q)
        || I18n.translateText(r.viloyat || '').toLowerCase().includes(q);
      const okF = f === ''           ? true
                : f === 'mskt'       ? r.mskt_bor
                : f === 'angio'      ? r.angiografiya_bor
                : f === 'registrsiz' ? r.registrga_kiritadi === false
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
      ? list.map((r, i) => {
        const y = this.yashirinmi(r);
        return `
          <tr style="${y ? 'background:#fafafa;opacity:.7' : ''}">
            <td class="text-xs text-gray-400">${i + 1}</td>
            <td class="text-sm text-gray-600">${esc(I18n.translateText(r.viloyat || '—'))}</td>
            <td class="text-sm font-semibold text-gray-800">${esc(I18n.facilityName(r.nomi))}
              ${y ? `<span class="badge" style="background:#f1f5f9;color:#64748b;margin-left:6px;font-size:10px">${t('facility.hidden')}</span>` : ''}
            </td>
            <td>
              <select data-id="${r.id}" data-field="daraja"
                      class="form-select !py-1 !text-xs"
                      style="${r.daraja ? '' : 'border-color:#fca5a5;background:#fef2f2'}">
                <option value="">${t('capabilities.notSpecified')}</option>
                ${this.DARAJALAR.map(([k, n]) =>
                  `<option value="${k}" ${r.daraja === k ? 'selected' : ''}>${I18n.translateText(n)}</option>`).join('')}
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
            <td style="text-align:center;${r.registrga_kiritadi === false ? 'background:#fff7ed' : ''}">
              <input type="checkbox" data-id="${r.id}" data-field="registr"
                      title="${t('capabilities.registryShortTitle')}"
                     style="width:18px;height:18px;accent-color:#059669;cursor:pointer"
                     ${r.registrga_kiritadi === false ? '' : 'checked'}>
            </td>
            <td style="text-align:center;white-space:nowrap">
              <button data-act="yashir" data-id="${r.id}" data-yashir="${y ? '0' : '1'}"
                      title="${y ? t('institution.restoreTitle') : t('institution.hideTitle')}"
                      style="border:none;background:none;cursor:pointer;padding:4px;color:${y ? '#0891b2' : '#94a3b8'}">
                ${icon(y ? 'eye' : 'eye-off', 16)}
              </button>
              <button data-act="ochir" data-id="${r.id}"
                      title="${t('institution.deleteTitle')}"
                      style="border:none;background:none;cursor:pointer;padding:4px;color:#dc2626">
                ${icon('trash-2', 16)}
              </button>
            </td>
          </tr>`; }).join('')
      : `<tr><td colspan="8" class="text-center py-10 text-gray-400">${t('common.noData')}</td></tr>`;
    initIcons();
    this.drawSummary(list.length);
  },

  // ==================== QO'SHISH ====================
  qoshModal() {
    if (!this._dirtyOgoh()) return;
    const id = 'mi-add-modal';
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.style.cssText = 'position:fixed;inset:0;z-index:9500;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    el.innerHTML = `
      <div style="background:#fff;border-radius:18px;max-width:520px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.28);overflow:hidden">
        <div style="padding:16px 20px;background:#eff6ff;border-bottom:1px solid #bfdbfe">
          <div style="font-weight:800;color:#1d4ed8;font-size:15px">${t('facility.addHeading')}</div>
          <div style="font-size:12px;color:#1e3a8a;margin-top:3px">
            ${t('capabilities.addHelp')}
          </div>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
          <div>
            <label class="form-label">${t('common.region')} <span style="color:#dc2626">*</span></label>
            <select id="mi-a-vil" class="form-select" style="width:100%">
              <option value="">— ${t('common.select')} —</option>
              ${APP_CONFIG.VILOYATLAR.map(v => `<option value="${esc(v)}">${esc(I18n.translateText(v))}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">${t('facility.nameLabel')} <span style="color:#dc2626">*</span></label>
            <input id="mi-a-nomi" class="form-input" style="width:100%" autocomplete="off"
                   placeholder="${t('institution.exampleName')}"/>
            <div id="mi-a-ogoh" style="font-size:11px;color:#b45309;margin-top:4px;display:none"></div>
          </div>
          <div>
            <label class="form-label">${t('capabilities.levelHeading')}</label>
            <select id="mi-a-daraja" class="form-select" style="width:100%">
              <option value="">${t('capabilities.notSpecified')}</option>
              ${this.DARAJALAR.map(([k, n]) => `<option value="${k}">${I18n.translateText(n)}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:20px;padding-top:2px">
            <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px">
              <input type="checkbox" id="mi-a-mskt" style="width:17px;height:17px;accent-color:#2563eb">
              ${t('capabilities.msctAvailable')}
            </label>
            <label style="display:flex;align-items:center;gap:7px;cursor:pointer;font-size:13px">
              <input type="checkbox" id="mi-a-angio" style="width:17px;height:17px;accent-color:#7c3aed">
              ${t('capabilities.angioAvailable')}
            </label>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;background:#f8fafc;border-top:1px solid #f1f5f9">
          <button class="btn btn-secondary" id="mi-a-bekor">${t('common.cancel')}</button>
          <button class="btn btn-primary" id="mi-a-ok">${t('common.add')}</button>
        </div>
      </div>`;
    document.body.appendChild(el);

    const nomiEl = document.getElementById('mi-a-nomi');
    const ogoh   = document.getElementById('mi-a-ogoh');
    // Takror nomni yozayotganda darhol ogohlantirish — RPC ham tekshiradi,
    // lekin foydalanuvchi buni formani yuborishdan oldin bilgani yaxshi
    nomiEl.oninput = () => {
      const q = nomiEl.value.trim().toLowerCase();
      const bor = q && this.rows.find(r => (r.nomi || '').toLowerCase() === q);
      ogoh.style.display = bor ? '' : 'none';
      if (bor) ogoh.textContent = t('institution.duplicate', { region: I18n.translateText(bor.viloyat || '—') });
    };

    const yop = () => el.remove();
    document.getElementById('mi-a-bekor').onclick = yop;
    el.onclick = (e) => { if (e.target === el) yop(); };
    nomiEl.focus();

    document.getElementById('mi-a-ok').onclick = async () => {
      const nomi = nomiEl.value.trim();
      const vil  = document.getElementById('mi-a-vil').value;
    if (!vil)  { showToast(t('auth.selectRegion'), 'error'); return; }
    if (!nomi) { showToast(t('institution.enterName'), 'error'); return; }
      const btn = document.getElementById('mi-a-ok');
    btn.disabled = true; btn.textContent = t('institution.adding');
      try {
        await DB.muassasaQosh(
          nomi, vil,
          document.getElementById('mi-a-daraja').value,
          document.getElementById('mi-a-mskt').checked,
          document.getElementById('mi-a-angio').checked
        );
        yop();
      showToast(t('institution.added', { name: nomi }), 'success');
        await this.qaytaYukla();
      } catch (e) {
      showToast(t('common.errorPrefix', { error: muassasaXatoMatni(e) }), 'error', 8000);
      btn.disabled = false; btn.textContent = t('common.add');
      }
    };
  },

  // ==================== O'CHIRISH / YASHIRISH ====================
  // O'chirish/yashirish mantig'i components.js da — admin panel ham
  // aynan shu oqimni chaqiradi, ikki ekran turlicha ishlab qolmasin
  async ochir(id) {
    if (!this._dirtyOgoh()) return;
    const r = this.rows.find(x => x.id === id);
    if (await muassasaOchirishOqimi(r)) await this.qaytaYukla();
  },

  async yashir(id, yashir) {
    if (!this._dirtyOgoh()) return;
    const r = this.rows.find(x => x.id === id);
    if (await muassasaYashirishOqimi(r, yashir)) await this.qaytaYukla();
  },

  // Qo'shish/o'chirish ro'yxatni serverdan qayta oladi — saqlanmagan
  // galochkalar shunda yo'qoladi. Shuning uchun avval so'raladi.
  _dirtyOgoh() {
    if (!this.dirty.size) return true;
    return confirm(t('capabilities.unsavedConfirm', { count: this.dirty.size }));
  },

  async qaytaYukla() {
    this.rows = await DB.getMuassasalarFiltered(null, null);
    await this.loadYashiringan();
    // Formalardagi ochiluvchi ro'yxat ham darhol yangilansin
    try { MuassasaDB.applyToConfig(await MuassasaDB.getOverrides()); } catch (e) {}
    this.dirty.clear();
    const btn = document.getElementById('mi-save');
    if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; btn.innerHTML = `${icon('save', 16)} ${t('common.save')}`; }
    this.draw();
  },

  drawSummary(shown) {
    const m = this.rows.filter(r => r.mskt_bor).length;
    const a = this.rows.filter(r => r.angiografiya_bor).length;
    const d = this.rows.filter(r => !r.daraja).length;
    const n = shown ?? this.filtered().length;
    const el = document.getElementById('mi-summary');
    if (!el) return;
    const y = this.rows.filter(r => this.yashirinmi(r)).length;
    const rq = this.rows.filter(r => r.registrga_kiritadi === false).length;
    el.innerHTML =
      t('capabilities.summaryBase', { total: this.rows.length, msct: m, angio: a, shown: n }) +
      (rq ? ` · <span style="color:#b45309">${t('capabilities.summaryNoRegistry', { count: rq })}</span>` : '') +
      (y ? ` · <span style="color:#64748b">${t('capabilities.summaryHidden', { count: y })}</span>` : '') +
      (this.dirty.size ? ` · <b>${t('capabilities.summaryUnsaved', { count: this.dirty.size })}</b>` : '') +
      (d ? ` · <span style="color:#b91c1c;font-weight:600">${t('capabilities.summaryNoLevel', { count: d })}</span>` : '');
  },

  async save() {
    if (!this.dirty.size) return;
    const btn = document.getElementById('mi-save');
    btn.disabled = true;
    btn.textContent = t('common.saving');
    try {
      const n = await DB.setMuassasaImkoniyat([...this.dirty.values()]);
      this.dirty.clear();
      btn.innerHTML = `${icon('save', 16)} ${t('common.save')}`;
      btn.style.opacity = '0.5';
      initIcons();
      showToast(t('institution.updatedCount', { count: n }), 'success');
      this.drawSummary();
    } catch (e) {
      showToast(t('common.errorPrefix', { error: e.message }), 'error', 6000);
      btn.disabled = false;
      btn.innerHTML = `${icon('save', 16)} ${t('common.save')} (${this.dirty.size})`;
      initIcons();
    }
  }
};
