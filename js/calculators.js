// ==================== KALKULYATORLAR ====================
const Calculators = {
  _currentInputId: null,

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
              Jami ball: <span id="calc-total" class="text-2xl text-blue-600">0</span>
            </div>
            <div class="flex gap-3">
              <button class="px-5 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors" onclick="Calculators.closeModal()">Bekor qilish</button>
              <button class="px-5 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all" onclick="${onSave}">Natijani saqlash</button>
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
        if (total <= 6) { level = " (Past xavf)"; color = "text-green-600"; }
        else if (total <= 13) { level = " (O'rta xavf)"; color = "text-amber-500"; }
        else { level = " (Yuqori xavf)"; color = "text-red-600"; }
        totalEl.innerHTML = `<span class="${color}">${total}${level}</span>`;
      } else {
        totalEl.textContent = total;
      }
    }
  },

  openNIHSS(targetInputId) {
    this._currentInputId = targetInputId;
    const questions = [
      { id: 'n1a', title: "1A. Ong darajasi", opts: [
        {val:0, text:"0 - Hushida, faol"},
        {val:1, text:"1 - Uyquchan, yengil turtkiga uyg'onadi"},
        {val:2, text:"2 - Stupor, faqat kuchli og'riqqa javob beradi"},
        {val:3, text:"3 - Koma, hech qanday javob yo'q"}
      ]},
      { id: 'n1b', title: "1B. Savollarga javob (Joriy oy va yoshini so'rash)", opts: [
        {val:0, text:"0 - Ikkalasiga ham to'g'ri javob"},
        {val:1, text:"1 - Bittasiga to'g'ri javob"},
        {val:2, text:"2 - Ikkalasiga ham noto'g'ri"}
      ]},
      { id: 'n1c', title: "1C. Buyruqlarni bajarish (Ko'zni yum/och, qo'lni qis)", opts: [
        {val:0, text:"0 - Ikkalasini ham to'g'ri bajaradi"},
        {val:1, text:"1 - Bittasini to'g'ri bajaradi"},
        {val:2, text:"2 - Bajarolmaydi"}
      ]},
      { id: 'n2', title: "2. Ko'zlarning harakati", opts: [
        {val:0, text:"0 - Normal harakat"},
        {val:1, text:"1 - Qisman parez (nigoh cheklangan)"},
        {val:2, text:"2 - To'liq parez (majburiy nigoh)"}
      ]},
      { id: 'n3', title: "3. Ko'rish maydoni", opts: [
        {val:0, text:"0 - Normal"},
        {val:1, text:"1 - Qisman gemianopsiya"},
        {val:2, text:"2 - To'liq gemianopsiya"},
        {val:3, text:"3 - Ikki tomonlama ko'rlik"}
      ]},
      { id: 'n4', title: "4. Yuz mushaklari parezi", opts: [
        {val:0, text:"0 - Normal (simmetrik)"},
        {val:1, text:"1 - Yengil asimmetriya (kulishda)"},
        {val:2, text:"2 - Qisman parez (pastki qism)"},
        {val:3, text:"3 - To'liq parez (plegiya)"}
      ]},
      { id: 'n5a', title: "5A. Chap qo'l harakati (10 soniya ushlab turish)", opts: [
        {val:0, text:"0 - Normal ushlaydi (tushmaydi)"},
        {val:1, text:"1 - Sekin pastga tushadi"},
        {val:2, text:"2 - Tortishish kuchi bor, lekin darhol tushib ketadi"},
        {val:3, text:"3 - Faqat gorizontal siljish (tortishish yo'q)"},
        {val:4, text:"4 - Harakat mutlaqo yo'q (Plegiya)"}
      ]},
      { id: 'n5b', title: "5B. O'ng qo'l harakati (10 soniya ushlab turish)", opts: [
        {val:0, text:"0 - Normal ushlaydi (tushmaydi)"},
        {val:1, text:"1 - Sekin pastga tushadi"},
        {val:2, text:"2 - Tortishish kuchi bor, lekin darhol tushib ketadi"},
        {val:3, text:"3 - Faqat gorizontal siljish (tortishish yo'q)"},
        {val:4, text:"4 - Harakat mutlaqo yo'q (Plegiya)"}
      ]},
      { id: 'n6a', title: "6A. Chap oyoq harakati (5 soniya ushlab turish)", opts: [
        {val:0, text:"0 - Normal ushlaydi (tushmaydi)"},
        {val:1, text:"1 - Sekin pastga tushadi"},
        {val:2, text:"2 - Tortishish kuchi bor, lekin darhol tushib ketadi"},
        {val:3, text:"3 - Faqat gorizontal siljish"},
        {val:4, text:"4 - Harakat mutlaqo yo'q (Plegiya)"}
      ]},
      { id: 'n6b', title: "6B. O'ng oyoq harakati (5 soniya ushlab turish)", opts: [
        {val:0, text:"0 - Normal ushlaydi (tushmaydi)"},
        {val:1, text:"1 - Sekin pastga tushadi"},
        {val:2, text:"2 - Tortishish kuchi bor, lekin darhol tushib ketadi"},
        {val:3, text:"3 - Faqat gorizontal siljish"},
        {val:4, text:"4 - Harakat mutlaqo yo'q (Plegiya)"}
      ]},
      { id: 'n7', title: "7. Ataksiya (Barmoq-burun, Tizza-tovon testi)", opts: [
        {val:0, text:"0 - Ataksiya yo'q"},
        {val:1, text:"1 - Bir tomonda mavjud"},
        {val:2, text:"2 - Ikki tomonda mavjud"}
      ]},
      { id: 'n8', title: "8. Sezgi (Og'riqqa reaksiya)", opts: [
        {val:0, text:"0 - Normal sezgi"},
        {val:1, text:"1 - Qisman pasaygan"},
        {val:2, text:"2 - To'liq yo'qolgan"}
      ]},
      { id: 'n9', title: "9. Afaziya (Nutq va tushunish)", opts: [
        {val:0, text:"0 - Normal"},
        {val:1, text:"1 - Yengil / O'rta afaziya"},
        {val:2, text:"2 - Og'ir afaziya (Faqat ayrim so'zlar)"},
        {val:3, text:"3 - To'liq afaziya / Mutizm"}
      ]},
      { id: 'n10', title: "10. Dizartriya (Talaffuz)", opts: [
        {val:0, text:"0 - Normal"},
        {val:1, text:"1 - Yengil dizartriya"},
        {val:2, text:"2 - Og'ir dizartriya (gapini umuman tushunib bo'lmaydi)"}
      ]},
      { id: 'n11', title: "11. Ignor qilish (Inattention / Neglect)", opts: [
        {val:0, text:"0 - Yo'q"},
        {val:1, text:"1 - Qisman (bir tomonlama vizual/taktil ignor)"},
        {val:2, text:"2 - To'liq (ikki tomonlama / chuqur ignor)"}
      ]}
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

    this.openModal('NIHSS Kalkulyatori', html, `Calculators.saveResult('nihss-radio')`);
    setTimeout(() => this.updateTotal('nihss-radio'), 50);
  },

  openGCS(targetInputId) {
    this._currentInputId = targetInputId;
    const questions = [
      { id: 'g1', title: "1. Ko'zlarni ochishi (Eye opening)", opts: [
        {val:4, text:"4 - O'z-o'zidan ochiladi"},
        {val:3, text:"3 - Ovoz / chaqiriqqa ochiladi"},
        {val:2, text:"2 - Og'riq ta'siriga ochiladi"},
        {val:1, text:"1 - Umuman ochilmaydi"}
      ]},
      { id: 'g2', title: "2. Nutq reaksiyasi (Verbal response)", opts: [
        {val:5, text:"5 - Bemor orientatsiyalangan, to'g'ri javob beradi"},
        {val:4, text:"4 - Orientatsiya buzilgan, chalkash nutq"},
        {val:3, text:"3 - Faqat alohida so'zlarni aytadi"},
        {val:2, text:"2 - Tushunarsiz tovushlar (ingrash)"},
        {val:1, text:"1 - Nutq mutlaqo yo'q"}
      ]},
      { id: 'g3', title: "3. Harakat reaksiyasi (Motor response)", opts: [
        {val:6, text:"6 - Buyruqlarni to'g'ri bajaradi"},
        {val:5, text:"5 - Og'riqni joyini aniqlaydi (lokalizatsiya)"},
        {val:4, text:"4 - Og'riqdan qochadi (normal bukish)"},
        {val:3, text:"3 - Patologik bukish (dekortikatsion poza)"},
        {val:2, text:"2 - Patologik yozish (deserebratsion poza)"},
        {val:1, text:"1 - Harakat mutlaqo yo'q"}
      ]}
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

    this.openModal('Glazgo Koma Shkalasi (GCS)', html, `Calculators.saveResult('gcs-radio')`);
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
        {val:2, text:"Ha, statinlar qabul qilaman"},
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
          <h4 class="font-bold text-gray-800 mb-4">${q.title}</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${q.opts.map((opt, j) => `
              <label class="group relative flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-rose-50 hover:border-rose-300 transition-all has-[:checked]:bg-rose-50/50 has-[:checked]:border-rose-500 has-[:checked]:shadow-sm">
                <input type="radio" name="${q.id}" value="${opt.val}" class="aha-radio mt-0.5 text-rose-600 focus:ring-rose-500" ${j===0?'checked':''} onchange="Calculators.updateTotal('aha-radio')">
                <span class="text-sm font-medium text-gray-700 group-has-[:checked]:text-rose-900">${opt.text}</span>
              </label>
            `).join('')}
          </div>
        </div>
      `;
    });
    html += `</div>`;

    this.openModal('AHA Xavfni Baholash Shkalasi', html, `Calculators.saveResult('aha-radio')`);
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
      if (v < 0.4) return 1; if (v < 0.8) return 3; if (v < 1.2) return 5;
      if (v < 1.6) return 7; if (v < 2.0) return 9; if (v < 4.0) return 15; return 20;
    },
    killip: { 1: 0, 2: 20, 3: 39, 4: 59 }
  },

  graceRiskInfo(total) {
    if (total <= 108) return { level: "Past xavf", percent: "< 1%", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", tavsiya: "Konservativ yondashuv mumkin" };
    if (total <= 140) return { level: "O'rta xavf", percent: "1–3%", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", tavsiya: "Erta invaziv strategiya — 72 soat ichida" };
    return { level: "Yuqori xavf", percent: "> 3%", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", tavsiya: "Erta invaziv strategiya — 24 soat ichida (og'ir holatda < 2 soat)" };
  },

  graceResultBadgeHtml(total) {
    if (!total || isNaN(total)) return '';
    const r = this.graceRiskInfo(total);
    return `<div class="mt-3 p-4 rounded-xl border ${r.border} ${r.bg}">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div class="text-xs font-bold uppercase tracking-wide ${r.color} mb-1">GRACE Score natijasi</div>
          <div class="text-2xl font-black ${r.color}">${total} ball — ${r.level}</div>
          <div class="text-sm font-semibold ${r.color} mt-0.5">Gospital o'lim xavfi: ${r.percent}</div>
        </div>
        <div class="text-xs font-bold ${r.color} bg-white/70 px-3 py-2 rounded-lg border ${r.border} max-w-xs">${r.tavsiya}</div>
      </div>
    </div>`;
  },

  updateGraceTotal() {
    const age = parseInt(document.getElementById('g_age')?.value);
    const hr  = parseInt(document.getElementById('g_hr')?.value);
    const sbp = parseInt(document.getElementById('g_sbp')?.value);
    const crRaw = parseFloat(document.getElementById('g_cr')?.value);
    const cr  = isNaN(crRaw) ? 1.0 : crRaw;
    const killipVal = parseInt(document.getElementById('g_killip')?.value || '1');
    const arrest = document.getElementById('g_arrest')?.checked ? 39 : 0;
    const stDev  = document.getElementById('g_stdev')?.checked  ? 28 : 0;
    const enzymes= document.getElementById('g_enzymes')?.checked ? 14 : 0;

    const totalEl = document.getElementById('calc-total');
    const riskBox = document.getElementById('grace-risk-box');

    if (isNaN(age) || isNaN(hr) || isNaN(sbp)) {
      if (totalEl) totalEl.textContent = '—';
      if (riskBox) riskBox.innerHTML = '<span class="text-gray-400 text-sm">Yosh, puls va AD ni kiriting</span>';
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

    const killipOpts = Object.entries(this.GRACE_KILLIP_MAP).map(([label, num]) =>
      `<option value="${num}" ${num === killipNum ? 'selected' : ''}>${label}</option>`
    ).join('');

    const html = `
      <div class="space-y-5">
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 font-medium">
          GRACE 2.0 — NSTEMI bemorlar uchun gospital ichi o'lim xavfini baholash shkalasi
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Yosh (yil) *</label>
            <input id="g_age" type="number" min="18" max="120" class="form-input w-full"
              value="${defaultAge}" placeholder="Masalan: 65" oninput="Calculators.updateGraceTotal()"/>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Puls (zarbalar/min) *</label>
            <input id="g_hr" type="number" min="20" max="300" class="form-input w-full"
              value="${defaultHr}" placeholder="Masalan: 80" oninput="Calculators.updateGraceTotal()"/>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Sistolik AD (mmHg) *</label>
            <input id="g_sbp" type="number" min="40" max="300" class="form-input w-full"
              value="${defaultSbp}" placeholder="Masalan: 130" oninput="Calculators.updateGraceTotal()"/>
          </div>
          <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Serum kreatinin (mg/dL) *</label>
            <input id="g_cr" type="number" min="0" max="20" step="0.1" class="form-input w-full"
              value="1.0" placeholder="Masalan: 1.0" oninput="Calculators.updateGraceTotal()"/>
          </div>
        </div>

        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Killip klassifikatsiyasi</label>
          <select id="g_killip" class="form-select" onchange="Calculators.updateGraceTotal()">
            ${killipOpts}
          </select>
        </div>

        <div class="grid grid-cols-1 gap-3">
          <label class="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all">
            <input type="checkbox" id="g_arrest" class="w-5 h-5 rounded text-indigo-600"
              ${false ? 'checked' : ''} onchange="Calculators.updateGraceTotal()"/>
            <div>
              <div class="font-bold text-gray-800 text-sm">Kardioarest bo'lganmi?</div>
              <div class="text-xs text-gray-500">Qabul paytida yoki oldin yurak to'xtashi</div>
            </div>
            <span class="ml-auto text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">+39 ball</span>
          </label>
          <label class="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all">
            <input type="checkbox" id="g_stdev" class="w-5 h-5 rounded text-indigo-600"
              ${defaultSt ? 'checked' : ''} onchange="Calculators.updateGraceTotal()"/>
            <div>
              <div class="font-bold text-gray-800 text-sm">ST segment deviatsiyasi</div>
              <div class="text-xs text-gray-500">EKG da ST ko'tarilishi yoki pasayishi</div>
            </div>
            <span class="ml-auto text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">+28 ball</span>
          </label>
          <label class="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-all">
            <input type="checkbox" id="g_enzymes" class="w-5 h-5 rounded text-indigo-600"
              ${defaultEnzymes ? 'checked' : ''} onchange="Calculators.updateGraceTotal()"/>
            <div>
              <div class="font-bold text-gray-800 text-sm">Kardiomarkerlar ko'tarilgan</div>
              <div class="text-xs text-gray-500">Troponin yoki KFK-MB yuqori</div>
            </div>
            <span class="ml-auto text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">+14 ball</span>
          </label>
        </div>

        <div id="grace-risk-box" class="min-h-[60px] flex items-center">
          <span class="text-gray-400 text-sm">Barcha majburiy maydonlarni to'ldiring</span>
        </div>
      </div>
    `;

    this.openModal('GRACE Score Kalkulyatori (NSTEMI)', html, "Calculators.saveGraceResult()");
    setTimeout(() => this.updateGraceTotal(), 50);
  },

  saveGraceResult() {
    const total = this.updateGraceTotal();
    if (total === null || isNaN(total)) {
      showToast('⚠️ Yosh, puls va sistolik AD ni kiriting!', 'warning');
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
    }
    this.closeModal();
  }
};
