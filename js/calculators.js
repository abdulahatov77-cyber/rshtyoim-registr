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

  saveResult(groupClass) {
    let total = 0;
    document.querySelectorAll('.' + groupClass + ':checked').forEach(el => {
      total += parseInt(el.value);
    });
    const input = document.getElementById(this._currentInputId);
    if (input) {
      input.value = total;
      
      // Kichik vizual effekt (miltillash)
      input.classList.add('bg-green-100', 'border-green-500', 'text-green-800');
      setTimeout(() => input.classList.remove('bg-green-100', 'border-green-500', 'text-green-800'), 1000);
      
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    }
    this.closeModal();
  }
};
