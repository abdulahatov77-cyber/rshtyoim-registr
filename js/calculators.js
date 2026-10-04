// ==================== KALKULYATORLAR ====================
const Calculators = {
  _currentInputId: null,

  _scaleQuestion(id, key, scores) {
    return {
      id,
      title: t(`${key}.title`),
      opts: scores.map(score => ({ val: score, text: `${score} — ${t(`${key}.score${score}`)}` }))
    };
  },

  openModal(title, bodyHtml, onSave) {
    const el = document.createElement('div');
    el.id = 'calc-modal-wrapper';
    el.innerHTML = `
      <div class="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 overflow-y-auto">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-scalein my-8">
          <div class="flex items-center justify-between p-5 border-b border-gray-100">
            <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
              <i data-lucide="calculator" class="w-6 h-6 text-blue-600"></i>
              ${title}
            </h3>
            <button class="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors" onclick="Calculators.closeModal()">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <div class="p-6 overflow-y-auto max-h-[65vh] bg-gray-50/50">
            ${bodyHtml}
          </div>
          <div class="p-5 border-t border-gray-100 bg-white rounded-b-2xl flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div class="text-lg font-bold text-gray-900 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
              ${t('calc.totalScore')}: <span id="calc-total" class="text-2xl text-blue-600">0</span>
            </div>
            <div class="flex gap-3">
              <button class="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors" onclick="Calculators.closeModal()">${t('common.cancel')}</button>
              <button class="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all" onclick="${onSave}">${t('calc.saveResult')}</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    else if (typeof initIcons === 'function') initIcons();
  },

  closeModal() {
    const el = document.getElementById('calc-modal-wrapper');
    if (el) {
      el.querySelector('.bg-white').classList.add('scale-95', 'opacity-0');
      setTimeout(() => el.remove(), 200);
    }
  },

  updateTotal(groupClass) {
    let total = 0;
    document.querySelectorAll('.' + groupClass + ':checked').forEach(el => {
      total += parseInt(el.value);
    });
    const totalEl = document.getElementById('calc-total');
    if (totalEl) {
      if (groupClass === 'aha-radio') {
        let level = '';
        let color = '';
        if (total <= 6) { level = ` (${t('risk.low')})`; color = "text-green-600"; }
        else if (total <= 13) { level = ` (${t('risk.medium')})`; color = "text-amber-500"; }
        else { level = ` (${t('risk.high')})`; color = "text-red-600"; }
        totalEl.innerHTML = `<span class="${color}">${total}${level}</span>`;
      } else {
        totalEl.textContent = total;
      }
    }
  },

  openNIHSS(targetInputId) {
    this._currentInputId = targetInputId;
    const questions = [
      this._scaleQuestion('n1a', 'nihss.1a', [0,1,2,3]),
      this._scaleQuestion('n1b', 'nihss.1b', [0,1,2]),
      this._scaleQuestion('n1c', 'nihss.1c', [0,1,2]),
      this._scaleQuestion('n2', 'nihss.2', [0,1,2]),
      this._scaleQuestion('n3', 'nihss.3', [0,1,2,3]),
      this._scaleQuestion('n4', 'nihss.4', [0,1,2,3]),
      this._scaleQuestion('n5a', 'nihss.5a', [0,1,2,3,4]),
      this._scaleQuestion('n5b', 'nihss.5b', [0,1,2,3,4]),
      this._scaleQuestion('n6a', 'nihss.6a', [0,1,2,3,4]),
      this._scaleQuestion('n6b', 'nihss.6b', [0,1,2,3,4]),
      this._scaleQuestion('n7', 'nihss.7', [0,1,2]),
      this._scaleQuestion('n8', 'nihss.8', [0,1,2]),
      this._scaleQuestion('n9', 'nihss.9', [0,1,2,3]),
      this._scaleQuestion('n10', 'nihss.10', [0,1,2]),
      this._scaleQuestion('n11', 'nihss.11', [0,1,2])
    ];

    let html = `<div class="space-y-5">`;
    questions.forEach((q) => {
      html += `
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 class="font-bold text-gray-800 mb-4">${q.title}</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${q.opts.map((opt, j) => `
              <label class="group relative flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-all has-[:checked]:bg-blue-50/50 has-[:checked]:border-blue-500 has-[:checked]:shadow-sm">
                <input type="radio" name="${q.id}" value="${opt.val}" class="nihss-radio mt-0.5 text-blue-600 focus:ring-blue-500" ${j===0?'checked':''} onchange="Calculators.updateTotal('nihss-radio')">
                <span class="text-sm font-medium text-gray-700 group-has-[:checked]:text-blue-900">${opt.text}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    });
    html += `</div>`;

    this.openModal(t('nihss.title'), html, `Calculators.saveResult('nihss-radio')`);
    setTimeout(() => this.updateTotal('nihss-radio'), 50);
  },

  openGCS(targetInputId) {
    this._currentInputId = targetInputId;
    const questions = [
      this._scaleQuestion('g1', 'gcs.eye', [4,3,2,1]),
      this._scaleQuestion('g2', 'gcs.verbal', [5,4,3,2,1]),
      this._scaleQuestion('g3', 'gcs.motor', [6,5,4,3,2,1])
    ];

    let html = `<div class="space-y-5">`;
    questions.forEach((q) => {
      html += `
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 class="font-bold text-gray-800 mb-4">${q.title}</h4>
          <div class="grid grid-cols-1 gap-3">
            ${q.opts.map((opt, j) => `
              <label class="group flex items-center gap-4 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-all has-[:checked]:bg-purple-50/60 has-[:checked]:border-purple-500 has-[:checked]:shadow-sm">
                <input type="radio" name="${q.id}" value="${opt.val}" class="gcs-radio w-5 h-5 text-purple-600 focus:ring-purple-500" ${j===0?'checked':''} onchange="Calculators.updateTotal('gcs-radio')">
                <span class="text-[15px] font-semibold text-gray-700 group-has-[:checked]:text-purple-900">${opt.text}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    });
    html += `</div>`;

    this.openModal(t('gcs.title'), html, `Calculators.saveResult('gcs-radio')`);
    setTimeout(() => this.updateTotal('gcs-radio'), 50);
  },

  openAHA(targetInputId) {
    this._currentInputId = targetInputId;
    const questions = [
      { id: 'a1', title: "1. Arterial bosim oshganmi (140/90) yoki bosim tushiruvchi dori ichasizmi?", opts: [
        {val:0, text:"Yo'q"},
        {val:3, text:"Ha"},
        {val:2, text:"Bilmadim / muntazam o'lchamayman"}
      ]},
      { id: 'a2', title: "2. Yurak ritmi buzilishlari yoki boshqa yurak kasalliklari bormi?", opts: [
        {val:0, text:"Yo'q"},
        {val:4, text:"Ha, bo'lmachalar fibrillyatsiyasi"},
        {val:3, text:"Ha, boshqa yurak kasalliklari (ishemiya, infarkt)"},
        {val:1, text:"Bilmadim"}
      ]},
      { id: 'a3', title: "3. Qandli diabet yoki qonda qand darajasi oshishi kuzatilganmi?", opts: [
        {val:0, text:"Yo'q"},
        {val:3, text:"Ha, diabet tashxisi qo'yilgan"},
        {val:2, text:"Ha, prediabet"},
        {val:1, text:"Bilmadim / oxirgi 1 yilda tekshirmaganman"}
      ]},
      { id: 'a4', title: "4. Hozir sigareta chekyapsizmi yoki oldin chekkanmisiz?", opts: [
        {val:0, text:"Hech qachon chekmaganman"},
        {val:3, text:"Ha, hozir chekayapman"},
        {val:2, text:"Tashlaganman (5 yildan kam)"},
        {val:1, text:"Tashlaganman (5 yildan ortiq)"}
      ]},
      { id: 'a5', title: "5. Xolesterin darajasi yuqorimi yoki statinlar qabul qilasizmi?", opts: [
        {val:0, text:"Yo'q"},
        {val:2, text:"Ha, umumiy xolesterin > 5,2 mmol/l"},
        {val:3, text:"Ha, statinlar qabul qilaman (nazorat ostida)"},
        {val:1, text:"Bilmadim / oxirgi 1 yilda tekshirmaganman"}
      ]},
      { id: 'a6', title: "6. TMI (tana massasi indeksi) yoki bel aylanangiz ortiqcha vaznni ko'rsatadimi?", opts: [
        {val:0, text:"Yo'q, vazn normal"},
        {val:3, text:"TMI > 30 (semizlik)"},
        {val:2, text:"TMI 25–30 yoki bel (erkak >102sm / ayol >88sm)"},
        {val:1, text:"Bilmadim"}
      ]},
      { id: 'a7', title: "7. Jismoniy faolligingiz qanday?", opts: [
        {val:0, text:"Yuqori faollik (kunlik > 60 daqiqa)"},
        {val:1, text:"O'rtacha faollik (kunlik 30–60 daqiqa)"},
        {val:2, text:"Kamharakat (kunlik 30 daqiqadan kam)"}
      ]},
      { id: 'a8', title: "8. O'zingizda yoki yaqin qarindoshlarda (65 yoshgacha) insult/infarkt bo'lganmi?", opts: [
        {val:0, text:"Yo'q"},
        {val:5, text:"Ha, o'zimda insult yoki TIA bo'lgan"},
        {val:2, text:"Ha, qarindoshlarda erta yoshda bo'lgan"},
        {val:1, text:"Bilmadim"}
      ]},
      { id: 'a9', title: "9. Yoshingiz:", opts: [
        {val:0, text:"30 yoshdan kichik"},
        {val:2, text:"30–45 yosh"},
        {val:3, text:"45 yosh va katta"}
      ]},
      { id: 'a10', title: "10. Alkogol iste'moli va stress darajasi qanday?", opts: [
        {val:0, text:"Yo'q"},
        {val:2, text:"Alkogol muntazam ko'p miqdorda"},
        {val:2, text:"Doimiy yuqori stress"},
        {val:3, text:"Ikkalasi ham bor"}
      ]}
    ];

    let html = `<div class="space-y-5">`;
    questions.forEach((q) => {
      html += `
        <div class="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <h4 class="font-bold text-gray-800 mb-4">${I18n.translateText(q.title)}</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${q.opts.map((opt, j) => `
              <label class="group relative flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-rose-50 hover:border-rose-300 transition-all has-[:checked]:bg-rose-50/50 has-[:checked]:border-rose-500 has-[:checked]:shadow-sm">
                <input type="radio" name="${q.id}" value="${opt.val}" class="aha-radio mt-0.5 text-rose-600 focus:ring-rose-500" ${j===0?'checked':''} onchange="Calculators.updateTotal('aha-radio')">
                <span class="text-sm font-medium text-gray-700 group-has-[:checked]:text-rose-900">${I18n.translateText(opt.text)}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    });
    html += `</div>`;

    this.openModal(t('aha.questionnaireTitle'), html, `Calculators.saveResult('aha-radio')`);
    setTimeout(() => this.updateTotal('aha-radio'), 50);
  },

  // ==================== GRACE SCORE ====================
  GRACE_KILLIP_MAP: {
    "Killip I (yo'q)": 1,
    "Killip II (yengil)": 2,
    "Killip III (o'pka shishi)": 3,
    "Killip IV (kardiogen shok)": 4
  },

  _gracePoints: {
    age(v) {
      if (v < 30) return 0; if (v < 40) return 8; if (v < 50) return 25;
      if (v < 60) return 41; if (v < 70) return 58; if (v < 80) return 75; return 91;
    },
    hr(v) {
      if (v < 50) return 0; if (v < 70) return 3; if (v < 90) return 9;
      if (v < 110) return 15; if (v < 150) return 24; if (v < 200) return 38; return 46;
    },
    sbp(v) {
      if (v < 80) return 58; if (v < 100) return 53; if (v < 120) return 43;
      if (v < 140) return 34; if (v < 160) return 24; if (v < 200) return 10; return 0;
    },
    cr(v) {
      // Rasmiy GRACE 1.0 (in-hospital mortality) kreatinin ballari (mg/dL)
      if (v < 0.4) return 1; if (v < 0.8) return 4; if (v < 1.2) return 7;
      if (v < 1.6) return 10; if (v < 2.0) return 13; if (v < 4.0) return 21; return 28;
    },
    killip: { 1: 0, 2: 20, 3: 39, 4: 59 }
  },

  graceRiskInfo(total) {
    if (total <= 108) return { level: t('risk.low'), percent: "< 1%", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", tavsiya: t('grace.recommendation.low') };
    if (total <= 140) return { level: t('risk.medium'), percent: "1–3%", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", tavsiya: t('grace.recommendation.medium') };
    return { level: t('risk.high'), percent: "> 3%", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", tavsiya: t('grace.recommendation.high') };
  },

  graceResultBadgeHtml(total) {
    if (!total || isNaN(total)) return '';
    const r = this.graceRiskInfo(total);
    return `<div class="mt-3 p-4 rounded-xl border ${r.border} ${r.bg}">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="text-xs font-bold uppercase tracking-wide ${r.color} mb-1">${t('grace.result')}</div>
          <div class="text-2xl font-black ${r.color}">${t('calc.points', { count: total })} — ${r.level}</div>
          <div class="text-sm font-semibold ${r.color} mt-0.5">${t('grace.hospitalMortality', { percent: r.percent })}</div>
        </div>
        <div class="text-xs font-bold ${r.color} bg-white/70 px-3 py-2 rounded-lg border ${r.border} max-w-xs">${r.tavsiya}</div>
      </div>
    </div>`;
  },

  updateGraceTotal() {
    const age = parseInt(document.getElementById('g_age')?.value);
    const hr  = parseInt(document.getElementById('g_hr')?.value);
    const sbp = parseInt(document.getElementById('g_sbp')?.value);
    const cr  = parseFloat(document.getElementById('g_cr')?.value);
    const killipVal = parseInt(document.getElementById('g_killip')?.value || '1');
    const arrest = document.getElementById('g_arrest')?.checked ? 39 : 0;
    const stDev  = document.getElementById('g_stdev')?.checked  ? 28 : 0;
    const enzymes= document.getElementById('g_enzymes')?.checked ? 14 : 0;

    const totalEl = document.getElementById('calc-total');
    const riskBox = document.getElementById('grace-risk-box');

    if (isNaN(age) || isNaN(hr) || isNaN(sbp) || isNaN(cr)) {
      if (totalEl) totalEl.textContent = '—';
      if (riskBox) riskBox.innerHTML = `<span class="text-gray-400 text-sm">${t('grace.fillRequired')}</span>`;
      return null;
    }

    const gp = this._gracePoints;
    const total = gp.age(age) + gp.hr(hr) + gp.sbp(sbp) + gp.cr(cr) +
                  (gp.killip[killipVal] || 0) + arrest + stDev + enzymes;

    if (totalEl) {
      const r = this.graceRiskInfo(total);
      totalEl.innerHTML = `<span class="${r.color}">${total} (${r.level})</span>`;
    }
    if (riskBox) riskBox.innerHTML = this.graceResultBadgeHtml(total);
    return total;
  },

  openGRACE(targetInputId) {
    this._currentInputId = targetInputId;
    // Formadagi joriy qiymatlarni _data ga saqlash (puls, AD, killip yangi kiritilgan bo'lishi mumkin)
    if (typeof InfarktYangiPage !== 'undefined' && typeof InfarktYangiPage.saveCurrentStep === 'function') {
      InfarktYangiPage.saveCurrentStep();
    }
    const d = (typeof InfarktYangiPage !== 'undefined') ? (InfarktYangiPage._data || {}) : {};

    // Yosh
    let defaultAge = '';
    if (d.tugilgan_sana) {
      const birth = new Date(d.tugilgan_sana);
      const today = new Date();
      defaultAge = today.getFullYear() - birth.getFullYear() -
        (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
    }

    // Killip
    const killipNum = this.GRACE_KILLIP_MAP[d.killip] || 1;

    // Sistolik AD
    let defaultSbp = '';
    if (d.qon_bosimi && d.qon_bosimi.includes('/')) {
      const sbpStr = d.qon_bosimi.split('/')[0].trim();
      if (!isNaN(parseInt(sbpStr))) defaultSbp = parseInt(sbpStr);
    }

    // Puls
    const defaultHr = d.puls ? parseInt(d.puls) : '';

    // Kardiomarkerlar default
    const defaultEnzymes = (d.troponin === 'Yuqori' || d.kkfmb === 'Yuqori');

    // ST deviatsiya default
    const ekg = Array.isArray(d.ekg_natija) ? d.ekg_natija : (d.ekg_natija ? [d.ekg_natija] : []);
    const defaultSt = ekg.some(e => e && (e.toLowerCase().includes('st pasayishi') || e.toLowerCase().includes("st ko'tarilishi")));

    const killipOpts = Object.entries(this.GRACE_KILLIP_MAP).map(([, num]) =>
      `<option value="${num}" ${num === killipNum ? 'selected' : ''}>${t(`killip.class${num}`)}</option>`
    ).join('');

    const html = `
      <div class="space-y-5">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 font-medium">
          ${t('grace.description')}
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">${t('grace.age')} *</label>
            <input id="g_age" type="number" min="18" max="120" class="form-input w-full"
              value="${defaultAge}" placeholder="${t('calc.example', { value: 65 })}" oninput="Calculators.updateGraceTotal()"/>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">${t('grace.heartRate')} *</label>
            <input id="g_hr" type="number" min="20" max="300" class="form-input w-full"
              value="${defaultHr}" placeholder="${t('calc.example', { value: 80 })}" oninput="Calculators.updateGraceTotal()"/>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">${t('grace.sbp')} *</label>
            <input id="g_sbp" type="number" min="40" max="300" class="form-input w-full"
              value="${defaultSbp}" placeholder="${t('calc.example', { value: 130 })}" oninput="Calculators.updateGraceTotal()"/>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">${t('grace.creatinine')} *</label>
            <input id="g_cr" type="number" min="0" max="20" step="0.1" class="form-input w-full"
              value="" placeholder="${t('calc.example', { value: '1.0' })}" oninput="Calculators.updateGraceTotal()"/>
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-2">${t('grace.killip')}</label>
          <select id="g_killip" class="form-select" onchange="Calculators.updateGraceTotal()">
            ${killipOpts}
          </select>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <label class="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all">
            <input type="checkbox" id="g_arrest" class="w-5 h-5 rounded text-indigo-600"
              ${false ? 'checked' : ''} onchange="Calculators.updateGraceTotal()"/>
            <div>
              <div class="font-bold text-gray-800 text-sm">${t('grace.arrest')}</div>
              <div class="text-xs text-gray-500">${t('grace.arrestHelp')}</div>
            </div>
            <span class="ml-auto text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">+${t('calc.points', { count: 39 })}</span>
          </label>
          <label class="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all">
            <input type="checkbox" id="g_stdev" class="w-5 h-5 rounded text-indigo-600"
              ${defaultSt ? 'checked' : ''} onchange="Calculators.updateGraceTotal()"/>
            <div>
              <div class="font-bold text-gray-800 text-sm">${t('grace.stDeviation')}</div>
              <div class="text-xs text-gray-500">${t('grace.stDeviationHelp')}</div>
            </div>
            <span class="ml-auto text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">+${t('calc.points', { count: 28 })}</span>
          </label>
          <label class="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all">
            <input type="checkbox" id="g_enzymes" class="w-5 h-5 rounded text-indigo-600"
              ${defaultEnzymes ? 'checked' : ''} onchange="Calculators.updateGraceTotal()"/>
            <div>
              <div class="font-bold text-gray-800 text-sm">${t('grace.markers')}</div>
              <div class="text-xs text-gray-500">${t('grace.markersHelp')}</div>
            </div>
            <span class="ml-auto text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">+${t('calc.points', { count: 14 })}</span>
          </label>
        </div>

        <div id="grace-risk-box" class="min-h-[60px] flex items-center">
          <span class="text-gray-400 text-sm">${t('grace.fillRequired')}</span>
        </div>
      </div>
    `;

    this.openModal(t('grace.title'), html, "Calculators.saveGraceResult()");
    setTimeout(() => this.updateGraceTotal(), 50);
  },

  saveGraceResult() {
    const total = this.updateGraceTotal();
    if (total === null || isNaN(total)) {
      showToast(`⚠️ ${t('grace.fillRequiredDetailed')}`, 'warning');
      return;
    }
    const input = document.getElementById(this._currentInputId);
    if (input) {
      const wasReadonly = input.hasAttribute('readonly');
      if (wasReadonly) input.removeAttribute('readonly');
      input.value = total;
      if (wasReadonly) input.setAttribute('readonly', '');
      input.classList.add('bg-indigo-50', 'border-indigo-500', 'text-indigo-800');
      setTimeout(() => input.classList.remove('bg-indigo-50', 'border-indigo-500', 'text-indigo-800'), 1000);
    }
    if (typeof InfarktYangiPage !== 'undefined' && InfarktYangiPage._data) {
      InfarktYangiPage._data[this._currentInputId] = String(total);
    }
    const resultBox = document.getElementById('grace-result-box');
    if (resultBox) resultBox.innerHTML = this.graceResultBadgeHtml(total);
    this.closeModal();
  },

  // ===== Klinik tavsiyalar (ball qo'yilgandan keyin avtomatik ko'rsatiladi) =====

  // Glazgo (GCS) — ong darajasi bo'yicha
  gcsTavsiya(total) {
    const g = parseInt(total);
    if (isNaN(g) || g < 3 || g > 15) return null;
    if (g <= 9) return {
      daraja: "Og'ir (chuqur ong buzilishi)",
      matn: "Nafas yo'llari himoyalanmagan — <b>intubatsiya va sun'iy nafas olish apparatiga ulash</b> tavsiya etiladi. Bemorni reanimatsiya bo'limiga o'tkazing.",
      rang: '#b91c1c', fon: '#fef2f2', chegara: '#fecaca', belgi: '🔴'
    };
    if (g <= 12) return {
      daraja: "O'rtacha",
      matn: "Ong o'rtacha darajada buzilgan. Nafas va ong holatini uzluksiz kuzating; yomonlashsa <b>intubatsiyaga tayyor turing</b>.",
      rang: '#b45309', fon: '#fffbeb', chegara: '#fde68a', belgi: '🟡'
    };
    return {
      daraja: 'Yengil',
      matn: 'Ong saqlangan. Standart kuzatuv va davolash rejimi.',
      rang: '#15803d', fon: '#f0fdf4', chegara: '#bbf7d0', belgi: '🟢'
    };
  },

  // NIHSS — insult og'irligi bo'yicha.
  // MUHIM: gemorragik insultda TLT/endovaskulyar muolaja umuman ko'rib chiqilmaydi —
  // shuning uchun tavsiyada bu muolajalar tilga ham olinmaydi.
  nihssTavsiya(total, insultTuri) {
    const n = parseInt(total);
    if (isNaN(n) || n < 0 || n > 42) return null;
    const gem = /gemorragik/i.test(insultTuri || '');

    // QOIDA: ishemik insultda NIHSS ≥ 20 bo'lsa angiografiya (KTA / MSKT
    // angiografiya) umuman tavsiya etilmaydi — GCS qanday bo'lishidan qat'i nazar.
    if (/ishemik/i.test(insultTuri || '') && n >= 20) return {
      daraja: "Juda og'ir",
      matn: "Juda og'ir ishemik insult. <b>Reanimatsiya sharoitida intensiv kuzatuv</b>, nafas yo'llarini himoyalash birinchi darajali vazifa.",
      rang: '#b91c1c', fon: '#fef2f2', chegara: '#fecaca', belgi: '🔴'
    };

    if (n === 0) return {
      daraja: 'Simptom yo‘q',
      matn: gem
        ? 'Nevrologik defitsit aniqlanmadi. Qon bosimini nazorat qiling, KT dinamikasini kuzating.'
        : 'Nevrologik defitsit aniqlanmadi. Tashxisni qayta baholang (TIA ehtimoli).',
      rang: '#15803d', fon: '#f0fdf4', chegara: '#bbf7d0', belgi: '🟢'
    };
    if (n <= 4) return {
      daraja: 'Yengil',
      matn: gem
        ? "Yengil defitsit. <b>Qon bosimi nazorati</b> (sistolik &lt; 140 mm sim.ust.), takroriy KT bilan gematoma dinamikasini kuzating."
        : 'Yengil defitsit. Trombolitik terapiya ko‘rsatmasi individual baholanadi (vaqt oynasi va defitsit ahamiyatiga qarab).',
      rang: '#15803d', fon: '#f0fdf4', chegara: '#bbf7d0', belgi: '🟢'
    };
    if (n <= 15) return {
      daraja: "O'rtacha",
      matn: gem
        ? "<b>Neyroxirurg konsultatsiyasi</b> va qon bosimi nazorati talab etiladi. Gematoma hajmi va siljish belgilariga qarab jarrohlik ko'rsatmasi baholanadi."
        : "Yirik tomir okklyuziyasi ehtimoli bor — <b>MSKT angiografiya ko'rsatmasini baholang</b>. Vaqt oynasi ichida bo'lsa TLT imkoniyati ham ko'rib chiqiladi.",
      rang: '#b45309', fon: '#fffbeb', chegara: '#fde68a', belgi: '🟡'
    };
    if (n <= 20) return {
      daraja: "O'rtacha-og'ir",
      matn: gem
        ? "<b>Neyroxirurgni shoshilinch chaqiring</b> — dekompressiv trepanatsiya yoki gematoma evakuatsiyasi ko'rsatmasini baholang. Intensiv kuzatuv, qon bosimi va ichki bosh bosimi nazorati."
        : "Yirik tomir okklyuziyasi ehtimoli yuqori — <b>MSKT angiografiya</b> o'tkazib, tromboekstraksiya ko'rsatmasini shoshilinch baholang. Intensiv kuzatuv talab etiladi.",
      rang: '#c2410c', fon: '#fff7ed', chegara: '#fed7aa', belgi: '🟠'
    };
    return {
      daraja: "Og'ir",
      matn: gem
        ? "Yuqori o'lim xavfi. <b>Reanimatsiya va shoshilinch neyroxirurgik baholash</b>."
        : "Yuqori asorat va o'lim xavfi. <b>Reanimatsiya sharoitida intensiv kuzatuv</b>. Shoshilinch <b>MSKT angiografiya</b> o'tkazing.",
      rang: '#b91c1c', fon: '#fef2f2', chegara: '#fecaca', belgi: '🔴'
    };
  },

  // Davolash taktikasi — MSKT angiografiya natijasiga asoslanadi.
  // MSKT angiografiyasiz TLT/tromboekstraksiya haqida xulosa chiqarilmaydi.
  //   ASPECTS ≥ 6 + M1/M2 → tromboekstraksiya ko'rsatmasini ko'rib chiqish
  //   ASPECTS ≥ 6 + M3/M4 → TLT ko'rsatmasini ko'rib chiqish
  //   ASPECTS < 6         → konservativ davolash
  taktikaTavsiya(aspectsBall, segment, insultTuri, msktAngio) {
    // Gemorragik insultda bu algoritm qo'llanmaydi
    if (/gemorragik/i.test(insultTuri || '')) return null;
    if (msktAngio !== 'Ha') return null;
    const a = parseInt(aspectsBall);
    if (isNaN(a)) return null;

    if (a < 6) return {
      daraja: `ASPECTS ${a} — konservativ`,
      matn: "Keng shakllangan infarkt (ASPECTS &lt; 6) — <b>konservativ davolash</b>. Reperfuzion muolajalar gemorragik transformatsiya xavfi tufayli tavsiya etilmaydi.",
      rang: '#b45309', fon: '#fffbeb', chegara: '#fde68a', belgi: '🟡'
    };

    const s = String(segment || '').toUpperCase().trim();
    if (s === 'M1' || s === 'M2') return {
      daraja: `ASPECTS ${a} · ${s} segment`,
      matn: "Proksimal okklyuziya va ASPECTS ≥ 6 — <b>tromboekstraksiya (mexanik trombektomiya) ko'rsatmasini ko'rib chiqing</b>. Endovaskulyar imkoniyati bor muassasaga zudlik bilan yo'naltiring.",
      rang: '#b91c1c', fon: '#fef2f2', chegara: '#fecaca', belgi: '🔴'
    };
    if (s === 'M3' || s === 'M4') return {
      daraja: `ASPECTS ${a} · ${s} segment`,
      matn: "Distal okklyuziya va ASPECTS ≥ 6 — <b>trombolitik terapiya (TLT) ko'rsatmasini ko'rib chiqing</b> (vaqt oynasi va qarshi ko'rsatmalarni baholab).",
      rang: '#c2410c', fon: '#fff7ed', chegara: '#fed7aa', belgi: '🟠'
    };
    return {
      daraja: `ASPECTS ${a}`,
      matn: "ASPECTS ≥ 6 — reperfuzion muolaja uchun nomzod. Taktikani aniqlash uchun <b>okklyuziya segmentini belgilang</b> (M1/M2 — tromboekstraksiya, M3/M4 — TLT).",
      rang: '#2563eb', fon: '#eff6ff', chegara: '#bfdbfe', belgi: '🔵'
    };
  },

  // Taktika blokini yangilash (ASPECTS yoki segment o'zgarganda)
  taktikaniYangilash() {
    const box = document.getElementById('taktika-tavsiya');
    if (!box) return;
    const d = (typeof InsultYangiPage !== 'undefined' ? InsultYangiPage._data : null) || {};
    const ball = (typeof InsultYangiPage !== 'undefined' && InsultYangiPage._calcAspects)
      ? InsultYangiPage._calcAspects(d) : null;
    const t = this.taktikaTavsiya(ball, d.okklyuziya_segmenti, d.insult_turi, d.mskt_angiografiya);
    box.innerHTML = t ? this.tavsiyaHtml(t, '', 'Davolash taktikasi') : '';
    if (typeof InsultYangiPage !== 'undefined' && InsultYangiPage.cdssYangilash) InsultYangiPage.cdssYangilash();
  },

  // Formadagi yoki kartadagi joriy insult turini aniqlash
  _joriyInsultTuri() {
    return document.getElementById('insult_turi')?.value
        || document.getElementById('edit-turi')?.value
        || (typeof InsultYangiPage !== 'undefined' ? (InsultYangiPage._data || {}).insult_turi : '')
        || (typeof BemorKartaPage !== 'undefined' ? (BemorKartaPage._patient || {}).insult_turi : '')
        || '';
  },

  // Tavsiya blokining HTML ko'rinishi
  tavsiyaHtml(t, ball, nomi) {
    if (!t) return '';
    const label = I18n.translateText(nomi);
    const level = /^ASPECTS (\d+) — konservativ$/.test(t.daraja)
      ? I18n.t('calcRec.aspectsConservative', { score: t.daraja.match(/\d+/)[0] })
      : /^ASPECTS (\d+) · (M[1-4]) segment$/.test(t.daraja)
        ? I18n.t('calcRec.aspectsSegment', { score: t.daraja.match(/\d+/)[0], segment: t.daraja.match(/M[1-4]/)[0] })
        : I18n.translateText(t.daraja);
    return `<div class="mt-2 p-3 rounded-xl border" style="background:${t.fon};border-color:${t.chegara}">
      <div class="flex items-start gap-2">
        <span style="font-size:16px;line-height:1.2">${t.belgi}</span>
        <div>
          <div style="color:${t.rang};font-weight:800;font-size:12px;text-transform:uppercase;letter-spacing:.03em">
            ${label} ${ball} — ${level}
          </div>
          <div style="color:#334155;font-size:13px;margin-top:2px;line-height:1.45">${I18n.translateText(t.matn)}</div>
        </div>
      </div>
    </div>`;
  },

  // Ball qo'yilgandan keyin tavsiya blokini yangilash
  tavsiyaniYangilash(inputId, total) {
    const isGcs   = /gcs/i.test(inputId);
    const isNihss = /nihss/i.test(inputId);
    if (!isGcs && !isNihss) return;
    const box = document.getElementById(isGcs ? 'gcs-tavsiya' : 'nihss-tavsiya');
    if (!box) return;
    box.innerHTML = isGcs
      ? this.tavsiyaHtml(this.gcsTavsiya(total), total, 'Glazgo (GCS)')
      : this.tavsiyaHtml(this.nihssTavsiya(total, this._joriyInsultTuri()), total, 'NIHSS');
    if (typeof InsultYangiPage !== 'undefined' && InsultYangiPage.cdssYangilash) InsultYangiPage.cdssYangilash();
  },

  saveResult(groupClass) {
    let total = 0;
    document.querySelectorAll('.' + groupClass + ':checked').forEach(el => {
      total += parseInt(el.value);
    });
    const input = document.getElementById(this._currentInputId);
    if (input) {
      // readonly bo'lsa ham yozish uchun vaqtincha olib, keyin qaytarish
      const wasReadonly = input.hasAttribute('readonly');
      if (wasReadonly) input.removeAttribute('readonly');
      input.value = total;
      if (wasReadonly) input.setAttribute('readonly', '');

      // _data ni to'g'ridan yangilash (readonly inputda change event ishlamaydi)
      const id = this._currentInputId;
      if (typeof InsultYangiPage !== 'undefined' && InsultYangiPage._data) InsultYangiPage._data[id] = String(total);
      if (typeof InfarktYangiPage !== 'undefined' && InfarktYangiPage._data) InfarktYangiPage._data[id] = String(total);

      // Kichik vizual effekt (miltillash)
      input.classList.add('bg-green-100', 'border-green-500', 'text-green-800');
      setTimeout(() => input.classList.remove('bg-green-100', 'border-green-500', 'text-green-800'), 1000);

      // Klinik tavsiyani ko'rsatamiz (GCS ≤ 9 — intubatsiya va h.k.)
      this.tavsiyaniYangilash(id, total);
    }
    this.closeModal();
  }
};
