// ==================== INSULT YANGI BEMOR SAHIFASI ====================
const InsultYangiPage = {
  _step: 0,
  _data: {},
  STEPS: ['Muassasa', 'Bemor', 'Klinik', 'Muolaja'],

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    InsultYangiPage._profile = profile;
    InsultYangiPage._saving = false;
    InsultYangiPage._step = 0;
    InsultYangiPage._data = {
      kt_no: Utils.generateKtNo(profile?.muassasa || ''),
      qabul_vaqt: Utils.formatDateInput(new Date()),
      viloyat: (profile?.role === 'admin' || profile?.role === 'super_admin') ? '' : (profile?.viloyat || ''),
      fuqarolik: "O'zbekiston"
    };

    document.getElementById('app').innerHTML = Components.renderLayout(
      'insult-yangi', 'Yangi Insult Bemori', 'Bemor qabul qilish formasi',
      `<div id="insult-form-wrap"></div>`, user
    );
    Components.startClock();
    InsultYangiPage.renderStep();
  },

  renderStep() {
    const step = InsultYangiPage._step;
    const wrap = document.getElementById('insult-form-wrap');
    const sectionIcons = ['building-2', 'user', 'brain', 'pill'];
    const sectionTitles = [
      'Muassasa ma\'lumotlari',
      'Bemor ma\'lumotlari',
      'Klinik ma\'lumotlar',
      'Diagnostika va Muolaja'
    ];

    wrap.innerHTML = `
      <div class="max-w-4xl mx-auto animate-fadein pb-20">
        <div class="mb-4 sm:mb-10">
          ${Components.renderSteps(InsultYangiPage.STEPS, step)}
        </div>

        <div class="bg-white rounded-2xl sm:rounded-[32px] shadow-xl sm:shadow-2xl border border-slate-100 overflow-hidden">
          <div class="p-4 sm:p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 sm:w-14 sm:h-14 bg-purple-50 text-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                ${icon(sectionIcons[step], 24)}
              </div>
              <div>
                <p class="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-0.5">Bo'lim ${step+1} / 4</p>
                <h3 class="text-base sm:text-xl font-black text-slate-800 tracking-tight">${sectionTitles[step]}</h3>
              </div>
            </div>
            <div class="hidden sm:block text-right">
              <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">To'ldirilish darajasi</div>
              <div class="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-purple-500" style="width: ${(step+1)/4*100}%"></div>
              </div>
            </div>
          </div>

          <div class="p-4 sm:p-8" id="step-body">
            ${InsultYangiPage['renderStep' + step]()}
          </div>

          <div class="p-4 sm:p-8 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center gap-2">
            <button class="flex items-center gap-1 px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-500 hover:bg-slate-100 transition-all shrink-0" onclick="InsultYangiPage.prevStep()" ${step===0?'disabled style="opacity:0"':''}>
              ${icon('arrow-left', 16)} <span class="hidden sm:inline">Orqaga</span>
            </button>
            <div class="flex gap-2 sm:gap-4">
              <button class="px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-all hidden sm:block" onclick="Router.go('dashboard')">Bekor qilish</button>
              ${step < InsultYangiPage.STEPS.length-1
                ? `<button class="flex items-center gap-1 px-4 py-2 sm:px-8 sm:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95" onclick="InsultYangiPage.nextStep()">Keyingi ${icon('arrow-right', 16)}</button>`
                : (() => {
                    const isOtk = (InsultYangiPage._data.muolaja_turi || '').startsWith("Boshqa muassasaga o'tkazildi");
                    return `<button class="flex items-center gap-1 px-4 py-2 sm:px-8 sm:py-3 ${isOtk ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95" id="save-btn" onclick="InsultYangiPage.save()">${icon(isOtk ? 'log-out' : 'save', 16)} ${isOtk ? 'Chiqarish' : 'Saqlash'}</button>`;
                  })()
              }
            </div>
          </div>
        </div>
      </div>
    `;
    initIcons();
  },

  field(id, label, inputHtml, required = false, hint = '') {
    return `
      <div class="form-group">
        <label class="form-label ${required ? 'required' : ''}" for="${id}">${label}</label>
        ${inputHtml}
        ${hint ? `<div class="text-xs text-gray-400 mt-1">${hint}</div>` : ''}
        <div class="form-error-msg hidden" id="err-${id}"></div>
      </div>
    `;
  },

  selectOptions(arr, selected) {
    return `<option value="">Tanlang...</option>` + arr.map(a => `<option value="${a}" ${selected===a?'selected':''}>${a}</option>`).join('');
  },

  checkboxGroup(name, arr, selectedArr = []) {
    return `
      <div id="${name}-group" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        ${arr.map(item => {
          const isSel = selectedArr.includes(item);
          return `
            <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSel ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium shadow-sm' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-600'}">
              <input type="checkbox" name="${name}" value="${item}" class="hidden" ${isSel?'checked':''} onchange="InsultYangiPage.toggleCheckbox(this)">
              <div class="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSel ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-300 bg-white'}">
                ${isSel ? icon('check', 14) : ''}
              </div>
              <span class="text-sm">${item}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  },

  toggleCheckbox(el) {
    const parent = el.closest('label');
    const isSel = el.checked;
    parent.className = `flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSel ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium shadow-sm' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-600'}`;
    const box = parent.querySelector('div');
    box.className = `w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSel ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-300 bg-white'}`;
    box.innerHTML = isSel ? icon('check', 14) : '';
  },

  // ============ 1-BO'LIM: Muassasa ============
  renderStep0() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('viloyat','Viloyat / Shahar',`<select id="viloyat" class="form-select" onchange="InsultYangiPage.onViloyatChange(this.value)" ${InsultYangiPage._profile?.role !== 'admin' && InsultYangiPage._profile?.role !== 'super_admin' ? 'disabled' : ''}><option value="">Tanlang...</option>
          ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.viloyat===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}
        ${this.field('muassasa','Muassasa',`<select id="muassasa" class="form-select" onchange="InsultYangiPage.onMuassasaChange(this.value)"><option value="">Tanlang...</option>${(APP_CONFIG.MUASSASALAR[d.viloyat]||[]).map(m=>`<option value="${m}" ${d.muassasa===m?'selected':''}>${m}</option>`).join('')}<option value="Boshqa" ${d.muassasa==='Boshqa'?'selected':''}>Boshqa</option></select>`,true)}
        <div class="col-span-1 sm:col-span-2" id="boshqa-muassasa-div" style="display:${d.muassasa==='Boshqa'?'block':'none'}">
          ${this.field('boshqa_muassasa','Boshqa muassasa nomi',`<input id="boshqa_muassasa" class="form-input" value="${d.boshqa_muassasa||''}" placeholder="Muassasa nomini kiriting"/>`,true)}
        </div>
        ${this.field('kt_no','Kasallik tarixi №',`<input id="kt_no" class="form-input font-mono bg-gray-50" value="${d.kt_no||''}"/>`,true,'Avtomatik yaratiladi')}
        ${this.field('qabul_vaqt','Bemorni qabul qilgan sana va vaqt',`<div class="flex gap-2">
            <input id="qabul_sana" type="date" class="form-input" max="${new Date(Date.now()+5*3600000).toISOString().slice(0,10)}" value="${d.qabul_vaqt?.slice(0,10)||''}" onchange="InsultYangiPage.onQabulVaqtChange()"/>
            <input id="qabul_soat" type="time" class="form-input" value="${d.qabul_vaqt?.slice(11,16)||''}" onchange="InsultYangiPage.onQabulVaqtChange()"/>
          </div>`,true)}
        <div class="col-span-1 sm:col-span-2">
          ${this.field('murojaat_yoli','Murojaat yo\'li',`<select id="murojaat_yoli" class="form-select" onchange="InsultYangiPage.onMurojaatChange(this.value)">
            ${this.selectOptions(APP_CONFIG.MUROJAAT_YOLLARI, d.murojaat_yoli||'')}</select>`,true)}
        </div>
        <div class="col-span-1 sm:col-span-2" id="yuborgan-div" style="display:${d.murojaat_yoli==='Boshqa muassasadan'?'block':'none'}">
          <div class="p-4 bg-purple-50 border border-purple-100 rounded-xl">
            <p class="text-sm text-purple-700 font-medium mb-3">Agar bemor boshqa tibbiyot muassasasidan yuborilgan bo'lsa, shu muassasa nomini yozing.</p>
            ${this.field('yuborgan_muassasa','O\'tkazilgan muassasa nomi',`<input id="yuborgan_muassasa" class="form-input" value="${d.yuborgan_muassasa||''}" placeholder="Muassasa nomini kiriting"/>`,true)}
          </div>
        </div>
        <div id="tez-yordam-div" style="display:${d.murojaat_yoli==='Tez tibbiy yordam bilan'?'block':'none'}">
          ${this.field('tez_yordam_kelgan_vaqt','Tez yordam yetib keldi (vaqt)',`
            <div class="flex gap-2">
              <input id="tez_yordam_kelgan_sana" type="date" class="form-input" max="${new Date(Date.now()+5*3600000).toISOString().slice(0,10)}" value="${d.tez_yordam_kelgan_vaqt?Utils.formatDateInput(d.tez_yordam_kelgan_vaqt).slice(0,10):''}" onchange="InsultYangiPage.onTezYordamChange()"/>
              <input id="tez_yordam_kelgan_soat" type="time" class="form-input" value="${d.tez_yordam_kelgan_vaqt?Utils.formatDateInput(d.tez_yordam_kelgan_vaqt).slice(11,16):''}" onchange="InsultYangiPage.onTezYordamChange()"/>
              <input id="tez_yordam_kelgan_vaqt" type="hidden" value="${d.tez_yordam_kelgan_vaqt||''}"/>
            </div>`,true)}
        </div>
      </div>
    `;
  },

  onTezYordamChange() {
    const sana = document.getElementById('tez_yordam_kelgan_sana')?.value || '';
    const soat = document.getElementById('tez_yordam_kelgan_soat')?.value || '';
    // Sana VA soat ikkalasi ham kiritilishi shart — aks holda qiymat bo'sh qoladi
    const combined = sana && soat ? `${sana}T${soat}` : '';
    const hidden = document.getElementById('tez_yordam_kelgan_vaqt');
    if (hidden) hidden.value = combined;
    InsultYangiPage._data.tez_yordam_kelgan_vaqt = combined;
  },

  onMurojaatChange(val) {
    InsultYangiPage._data.murojaat_yoli = val;
    const yuborgan = document.getElementById('yuborgan-div');
    if (yuborgan) yuborgan.style.display = val === 'Boshqa muassasadan' ? 'block' : 'none';
    const tezYordam = document.getElementById('tez-yordam-div');
    if (tezYordam) tezYordam.style.display = val === 'Tez tibbiy yordam bilan' ? 'block' : 'none';
  },

  onMuassasaChange(val) {
    InsultYangiPage._data.muassasa = val;
    const div = document.getElementById('boshqa-muassasa-div');
    if (div) div.style.display = val === 'Boshqa' ? 'block' : 'none';
    // Muassasa tanlanganida kt_no prefiksini yangilaymiz (faqat avtomatik raqam bo'lsa)
    if (val && val !== 'Boshqa' && InsultYangiPage._data.kt_no) {
      const newKt = Utils.generateKtNo(val);
      InsultYangiPage._data.kt_no = newKt;
      const ktEl = document.getElementById('kt_no');
      if (ktEl) ktEl.value = newKt;
    }
  },

  onViloyatChange(val) {
    InsultYangiPage._data.viloyat = val;
    InsultYangiPage._data.muassasa = '';
    const sel = document.getElementById('muassasa');
    if (!sel) return;
    const list = APP_CONFIG.MUASSASALAR[val] || [];
    sel.innerHTML = `<option value="">Tanlang...</option>` +
      list.map(m => `<option value="${m}">${m}</option>`).join('') +
      `<option value="Boshqa">Boshqa</option>`;
    InsultYangiPage.onMuassasaChange('');
  },

  // ============ 2-BO'LIM: Bemor ============
  renderStep1() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <div class="col-span-1 sm:col-span-2">
          ${this.field('fio','Bemor F.I.O',`<input id="fio" class="form-input" value="${d.fio||''}" placeholder="Familiya Ism Otasining ismi" oninput="InsultYangiPage.checkDuplicate(this.value)"/>`,true)}
          <div id="fio-dup-warn"></div>
        </div>
        ${this.field('tugilgan_sana','Tug\'ilgan yili',`<input id="tugilgan_sana" type="date" class="form-input" value="${d.tugilgan_sana||''}"/>`,true)}
        <div class="col-span-1 sm:col-span-2">
          ${this.field('jins','Jinsi',`
            <div class="flex gap-4 mt-1">
              <label class="flex-1 flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${d.jins==='Erkak'?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-200 hover:bg-gray-50'}">
                <input type="radio" name="jins" value="Erkak" class="w-4 h-4 text-blue-600" ${d.jins==='Erkak'?'checked':''} onchange="InsultYangiPage.saveCurrentStep()">
                <span class="font-medium">Erkak</span>
              </label>
              <label class="flex-1 flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${d.jins==='Ayol'?'border-pink-500 bg-pink-50 text-pink-700':'border-gray-200 hover:bg-gray-50'}">
                <input type="radio" name="jins" value="Ayol" class="w-4 h-4 text-pink-600" ${d.jins==='Ayol'?'checked':''} onchange="InsultYangiPage.saveCurrentStep()">
                <span class="font-medium">Ayol</span>
              </label>
            </div>
          `,true)}
        </div>

        <!-- Doimiy yashash manzili -->
        <div class="col-span-1 sm:col-span-2 mt-2 pt-4 border-t border-dashed border-gray-200">
          ${this.field('fuqarolik','Fuqaroligi',`
            <div class="flex gap-3">
              <button type="button" onclick="InsultYangiPage.onFuqarolikChange('O\\'zbekiston')"
                class="flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${(d.fuqarolik||'O\'zbekiston')==='O\'zbekiston' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-400'}">
                🇺🇿 O'zbekiston fuqarosi
              </button>
              <button type="button" onclick="InsultYangiPage.onFuqarolikChange('Chet el')"
                class="flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${d.fuqarolik==='Chet el' ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-400'}">
                🌍 Chet el fuqarosi
              </button>
            </div>`,true)}
        </div>

        <!-- O'zbekiston: viloyat + tuman -->
        <div id="yashash-uz-div" class="col-span-1 sm:col-span-2 ${d.fuqarolik==='Chet el' ? 'hidden' : ''}">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
            ${this.field('yashash_viloyat','Yashash viloyati',`<select id="yashash_viloyat" class="form-select" onchange="InsultYangiPage.onYashashViloyatChange(this.value)">
              <option value="">Tanlang...</option>
              ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.yashash_viloyat===v?'selected':''}>${v}</option>`).join('')}
            </select>`,true)}
            ${this.field('yashash_tuman','Tuman / shahar',`<select id="yashash_tuman" class="form-select">
              <option value="">${d.yashash_viloyat ? 'Tanlang...' : 'Avval viloyatni tanlang'}</option>
              ${(APP_CONFIG.TUMANLAR[d.yashash_viloyat]||[]).map(t=>`<option value="${t}" ${d.yashash_tuman===t?'selected':''}>${t}</option>`).join('')}
            </select>`,true)}
          </div>
        </div>

        <!-- Chet el: davlat -->
        <div id="yashash-chet-div" class="col-span-1 sm:col-span-2 ${d.fuqarolik==='Chet el' ? '' : 'hidden'}">
          ${this.field('chet_el_davlati','Qaysi davlat fuqarosi',`<input id="chet_el_davlati" class="form-input" value="${d.chet_el_davlati||''}" placeholder="Masalan: Rossiya, Qozog'iston, Tojikiston..."/>`,true)}
        </div>
      </div>
    `;
  },

  // Bemorning qabul vaqtini Date obyekt sifatida olish (taqqoslash uchun)
  _qabulDate() {
    const v = InsultYangiPage._data.qabul_vaqt;
    if (!v) return null;
    const iso = (v.includes('T') && !v.endsWith('Z') && !v.includes('+')) ? v + ':00+05:00' : v;
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  },

  // Muolaja/tekshiruv vaqti o'zgarganda darhol tekshirish
  onVaqtChange(sanaId, soatId, label) {
    const sanaEl = document.getElementById(sanaId);
    const soatEl = document.getElementById(soatId);
    if (!sanaEl?.value || !soatEl?.value) return;
    const dt = new Date(`${sanaEl.value}T${soatEl.value}:00+05:00`);
    const qv = InsultYangiPage._qabulDate();
    let err = '';
    if (dt > new Date()) err = `${label} kelajakda bo'lishi mumkin emas!`;
    else if (qv && dt < qv) err = `${label} bemor qabul vaqtidan oldin bo'lishi mumkin emas!`;
    [sanaEl, soatEl].forEach(el => el.classList.toggle('border-red-500', !!err));
    if (err) showToast('⚠️ ' + err, 'error', 4000);
  },

  // Qabul vaqti o'zgarganda darhol tekshirish — kelajak bo'lsa ogohlantiramiz
  onQabulVaqtChange() {
    const sanaEl = document.getElementById('qabul_sana');
    const soatEl = document.getElementById('qabul_soat');
    if (!sanaEl?.value || !soatEl?.value) return;
    const qv = new Date(`${sanaEl.value}T${soatEl.value}:00+05:00`);
    const kelajak = qv > new Date();
    [sanaEl, soatEl].forEach(el => el.classList.toggle('border-red-500', kelajak));
    if (kelajak) showToast('⚠️ Qabul vaqti kelajakda bo\'lishi mumkin emas!', 'error', 4000);
  },

  onFuqarolikChange(val) {
    // Joriy bosqich ma'lumotlarini yo'qotmaslik uchun avval saqlaymiz
    InsultYangiPage.saveCurrentStep();
    InsultYangiPage._data.fuqarolik = val;
    if (val === 'Chet el') {
      InsultYangiPage._data.yashash_viloyat = '';
      InsultYangiPage._data.yashash_tuman = '';
    } else {
      InsultYangiPage._data.chet_el_davlati = '';
    }
    InsultYangiPage.renderStep(); // faqat joriy bosqichni qayta chizamiz
  },

  onYashashViloyatChange(val) {
    InsultYangiPage._data.yashash_viloyat = val;
    InsultYangiPage._data.yashash_tuman = '';
    const sel = document.getElementById('yashash_tuman');
    if (sel) {
      sel.innerHTML = `<option value="">${val ? 'Tanlang...' : 'Avval viloyatni tanlang'}</option>` +
        (APP_CONFIG.TUMANLAR[val]||[]).map(t=>`<option value="${t}">${t}</option>`).join('');
    }
  },

  // ============ 3-BO'LIM: Klinik ============
  renderStep2() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('simptom_vaqt','Simptomlar qachon boshlangan? (soat)',`
          <div class="flex gap-3 items-center">
            <input id="simptom_soat_raw" type="number" min="1" max="999" class="form-input w-32"
              placeholder="Soat" value="${d._simptom_soat_raw||''}"
              oninput="InsultYangiPage.onSimptomSoat(this.value)"/>
            <div id="simptom_vaqt_label" class="text-sm font-bold px-3 py-2 rounded-lg ${d.simptom_vaqt ? (d.simptom_vaqt.includes('ko\'p') || d.simptom_vaqt.includes('ortiq') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200') : 'text-slate-400'}">
              ${d.simptom_vaqt || '— soat kiriting'}
            </div>
          </div>
          <input id="simptom_vaqt" type="hidden" value="${d.simptom_vaqt||''}"/>
          <p class="text-xs text-slate-400 mt-1">24 soatgacha — aniq soat, 24 soatdan ko'p bo'lsa "24 soatdan ortiq" avtomatik ko'rinadi. Uyquda boshlangan bo'lsa <span class="underline cursor-pointer text-blue-500" onclick="InsultYangiPage.setSimptomUyqu()">shu yerni bosing</span>.</p>
        `,true)}
        ${this.field('nihss_qabul','NIHSS qabul paytida (0–42 ball)',`<div class="flex gap-2 items-center"><input id="nihss_qabul" type="number" min="0" max="42" class="form-input w-full bg-slate-50 cursor-not-allowed" value="${d.nihss_qabul||''}" placeholder="Kalkulyator orqali to'ldiring" readonly style="pointer-events:none;opacity:0.8"/><button type="button" class="flex-shrink-0 bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors border border-blue-200 flex items-center gap-1" onclick="Calculators.openNIHSS('nihss_qabul')">🧮 Hisoblash</button></div>`,true)}
        ${this.field('gcs_bali','Glazgo shkalasi (GCS), (3-15 ball)',`<div class="flex gap-2 items-center"><input id="gcs_bali" type="number" min="3" max="15" class="form-input w-full bg-slate-50 cursor-not-allowed" value="${d.gcs_bali||''}" placeholder="Kalkulyator orqali to'ldiring" readonly style="pointer-events:none;opacity:0.8"/><button type="button" class="flex-shrink-0 bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors border border-purple-200 flex items-center gap-1" onclick="Calculators.openGCS('gcs_bali')">🧮 Hisoblash</button></div>`,true)}
        ${this.field('birlamchi_yoki_takroriy','Birlamchi yoki takroriy?',`<select id="birlamchi_yoki_takroriy" class="form-select">
          ${this.selectOptions(APP_CONFIG.BIRLAMCHI_TAKROIRIY, d.birlamchi_yoki_takroriy||'')}</select>`,true)}
        ${this.field('insult_turi','Insult turi',`<select id="insult_turi" class="form-select border-purple-300 focus:border-purple-500" onchange="InsultYangiPage.saveCurrentStep();InsultYangiPage._updateAspectsVisibility()">
          ${this.selectOptions(APP_CONFIG.INSULT_TURLARI, d.insult_turi||'')}</select>`,true)}
        ${this.field('qon_bosimi','Qon bosimi (qabul paytida)',(() => {
          const [sys, dia] = (d.qon_bosimi || '').split('/');
          return `<div class="flex items-center gap-2">
            <input id="qon_sistolik" type="number" min="50" max="300" class="form-input font-mono text-center" placeholder="140"
              value="${sys || ''}" oninput="this.value=this.value.replace(/[^0-9]/g,'')" title="Sistolik (yuqori)"/>
            <span class="text-slate-400 font-bold text-lg">/</span>
            <input id="qon_diastolik" type="number" min="30" max="200" class="form-input font-mono text-center" placeholder="90"
              value="${dia || ''}" oninput="this.value=this.value.replace(/[^0-9]/g,'')" title="Diastolik (pastki)"/>
            <span class="text-xs text-slate-400 whitespace-nowrap">mm Hg</span>
          </div>
          <div class="flex gap-2 mt-1">
            <span class="flex-1 text-[10px] text-slate-400 text-center">Sistolik</span>
            <span class="w-3"></span>
            <span class="flex-1 text-[10px] text-slate-400 text-center">Diastolik</span>
            <span class="w-12"></span>
          </div>`;
        })(),true)}
        ${this.field('puls','Puls (qabul paytida)',`<input id="puls" type="number" min="20" max="300" class="form-input" placeholder="Masalan: 80" value="${d.puls||''}" oninput="this.value=this.value.replace(/[^0-9]/g,'')"/>`,true,'Zarba/daqiqa')}
      </div>
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('xavf_omillari','Xavf omillari',
          this.checkboxGroup('xavf_omillari', APP_CONFIG.XAVF_OMILLAR_INSULT, d.xavf_omillari||[]), true)}
      </div>
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('aha_bali','AHA (American Heart Association) savolnomasi bali',`<div class="flex gap-2 items-center"><input id="aha_bali" type="number" class="form-input w-full bg-slate-50 cursor-not-allowed" value="${d.aha_bali||''}" placeholder="Kalkulyator orqali to'ldiring" readonly style="pointer-events:none;opacity:0.8"/><button type="button" class="flex-shrink-0 bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors border border-rose-200 flex items-center gap-1" onclick="Calculators.openAHA('aha_bali')">🧮 Hisoblash</button></div>`,true)}
      </div>
    `;
  },

  // ============ 4-BO'LIM: Diagnostika va Muolaja ============
  renderStep3() {
    const d = InsultYangiPage._data;
    const muolaja = d.muolaja_turi || '';
    const muolajaL = muolaja.toLowerCase();
    const showOtkazilgan = muolaja.startsWith("Boshqa muassasaga o'tkazildi");
    // O'tkazish variantlarida muolaja vaqtlari so'ralmaydi (muolaja bu yerda emas, boshqa muassasada bo'ladi)
    const showTLT = !showOtkazilgan && (muolajaL.includes('trombolizis') || muolajaL.includes('tlt'));
    const showTrombektomiya = !showOtkazilgan && (muolajaL.includes('trombektomiya') || muolajaL.includes('tromboekstraksiya') || muolajaL.includes('tromboaspiratsiya') || muolajaL.includes('kombinatsiya') || muolajaL.includes('angiografiya') || muolajaL.includes('stentlash') || muolajaL.includes('tlbap'));
    const trombektomiyaLabel = (muolajaL.includes('angiografiya') || muolajaL.includes('stentlash') || muolajaL.includes('tlbap')) && !muolajaL.includes('trombektomiya') && !muolajaL.includes('tromboekstraksiya') && !muolajaL.includes('tromboaspiratsiya') ? 'Angiografiya o\'tkazilgan vaqt (Groin time)' : 'Trombektomiya (Groin time)';
    const showMsktVaqt = Utils.msktDone(d.mskt) || (!showOtkazilgan && muolajaL.includes('mskt'));
    const isIshemik = (d.insult_turi || '') === 'Ishemik insult';
    const showAngio = showMsktVaqt && isIshemik;
    const showAspects = showAngio && d.mskt_angiografiya === 'Ha';

    return `
      <div class="grid grid-cols-1 gap-x-6">
        ${this.field('mskt','MSKT (KT) o\'tkazilganmi?',`
          <div class="flex gap-3">
            <button type="button" id="mskt-ha" onclick="InsultYangiPage.onMsktChange(&quot;Ha – o&apos;tkazildi&quot;)"
              class="flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${Utils.msktDone(d.mskt) ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-400'}">
              ✅ Ha
            </button>
            <button type="button" id="mskt-yoq" onclick="InsultYangiPage.onMsktChange(&quot;Yo&apos;q – boshqa sabab&quot;)"
              class="flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${d.mskt && !Utils.msktDone(d.mskt) ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}">
              ❌ Yo'q
            </button>
          </div>`,true)}

        <div id="mskt-vaqt-div" style="display:${showMsktVaqt?'block':'none'}">
          ${this.field('kt_vaqti','KT/MSKT o\'tkazilgan vaqt',`
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sana *</label>
                <input id="kt_sana" type="date" class="form-input w-full" max="${new Date(Date.now()+5*3600000).toISOString().slice(0,10)}" value="${d.kt_vaqti?Utils.formatDateInput(d.kt_vaqti).slice(0,10):''}" onchange="InsultYangiPage.onVaqtChange('kt_sana','kt_soat','KT/MSKT vaqti')"/>
              </div>
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Soat * (HH:MM)</label>
                <input id="kt_soat" type="time" class="form-input w-full" value="${d.kt_vaqti?Utils.formatDateInput(d.kt_vaqti).slice(11,16):''}" onchange="InsultYangiPage.onVaqtChange('kt_sana','kt_soat','KT/MSKT vaqti')"/>
              </div>
            </div>`,true,'Door-to-CT mezonini hisoblash uchun')}
          <input id="kt_vaqti" type="hidden" value="${d.kt_vaqti||''}"/>
        </div>

        <!-- MSKT Angiografiya savoli — faqat MSKT o'tkazilgan + Ishemik insult -->
        <div id="mskt-angio-div" style="display:${showAngio?'block':'none'}">
          ${this.field('mskt_angiografiya','MSKT Angiografiya qilindimi?',`
            <div class="flex gap-3">
              <button type="button" id="mskt-angio-ha" onclick="InsultYangiPage.onMsktAngioChange('Ha')"
                class="flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${d.mskt_angiografiya==='Ha' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}">
                ✅ Ha
              </button>
              <button type="button" id="mskt-angio-yoq" onclick="InsultYangiPage.onMsktAngioChange('Yo\'q')"
                class="flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${d.mskt_angiografiya==='Yo\'q' ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}">
                ❌ Yo'q
              </button>
            </div>`,true)}
        </div>

        <!-- ASPECTS bloki — faqat MSKT Angiografiya Ha + Ishemik insult -->
        <div id="aspects-div" style="display:${showAspects?'block':'none'}">
          ${this._renderAspects(d)}
        </div>

        ${this.field('muolaja_turi','Bajarilgan muolaja turi',`<select id="muolaja_turi" class="form-select border-purple-300 focus:border-purple-500" onchange="InsultYangiPage.onMuolajaChange(this.value)">
          ${this.selectOptions(APP_CONFIG.INSULT_MUOLAJALARI, muolaja)}</select>`,true)}

        <div id="trombolizis-vaqt-div" style="display:${showTLT?'block':'none'}">
          ${this.field('trombolizis_vaqti','Trombolizis (TLT) o\'tkazilgan vaqt',`
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sana *</label>
                <input id="trombolizis_sana" type="date" class="form-input w-full" max="${new Date(Date.now()+5*3600000).toISOString().slice(0,10)}" value="${d.trombolizis_vaqti?Utils.formatDateInput(d.trombolizis_vaqti).slice(0,10):''}" onchange="InsultYangiPage.onVaqtChange('trombolizis_sana','trombolizis_soat','Trombolizis vaqti')"/>
              </div>
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Soat * (HH:MM)</label>
                <input id="trombolizis_soat" type="time" class="form-input w-full" value="${d.trombolizis_vaqti?Utils.formatDateInput(d.trombolizis_vaqti).slice(11,16):''}" onchange="InsultYangiPage.onVaqtChange('trombolizis_sana','trombolizis_soat','Trombolizis vaqti')"/>
              </div>
            </div>`,true,'Door-to-needle mezonini hisoblash uchun')}
          <input id="trombolizis_vaqti" type="hidden" value="${d.trombolizis_vaqti||''}"/>
        </div>

        <div id="trombektomiya-vaqt-div" style="display:${showTrombektomiya?'block':'none'}">
          ${this.field('trombektomiya_vaqti', trombektomiyaLabel, `
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sana *</label>
                <input id="trombektomiya_sana" type="date" class="form-input w-full" max="${new Date(Date.now()+5*3600000).toISOString().slice(0,10)}" value="${d.trombektomiya_vaqti?Utils.formatDateInput(d.trombektomiya_vaqti).slice(0,10):''}" onchange="InsultYangiPage.onVaqtChange('trombektomiya_sana','trombektomiya_soat','Trombektomiya vaqti')"/>
              </div>
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Soat * (HH:MM)</label>
                <input id="trombektomiya_soat" type="time" class="form-input w-full" value="${d.trombektomiya_vaqti?Utils.formatDateInput(d.trombektomiya_vaqti).slice(11,16):''}" onchange="InsultYangiPage.onVaqtChange('trombektomiya_sana','trombektomiya_soat','Trombektomiya vaqti')"/>
              </div>
            </div>`,true,'Door-to-groin mezonini hisoblash uchun')}
          <input id="trombektomiya_vaqti" type="hidden" value="${d.trombektomiya_vaqti||''}"/>
        </div>

        <div id="otkazilgan-div" style="display:${showOtkazilgan?'block':'none'}">
          ${this.field('otkazilgan_muassasa','O\'tkazilgan muassasa nomi',`<select id="otkazilgan_muassasa" class="form-select" onchange="InsultYangiPage.onOtkazilganMuassasa(this.value)">
            <option value="">Muassasani tanlang...</option>
            ${this.getAllMuassasalar().map(m => `<option value="${m}" ${d.otkazilgan_muassasa===m?'selected':''}>${m}</option>`).join('')}
            <option value="__boshqa__" ${d.otkazilgan_muassasa==='__boshqa__'?'selected':''}>➕ Boshqa (ro'yxatda yo'q) — qo'lda yozish</option>
          </select>`)}
          <div id="otkazilgan-boshqa-div" style="display:${d.otkazilgan_muassasa==='__boshqa__'?'block':'none'}">
            ${this.field('otkazilgan_boshqa','Muassasa nomini qo\'lda yozing',`<input id="otkazilgan_boshqa" class="form-input" value="${d.otkazilgan_boshqa||''}" placeholder="Masalan: Toshkent shahar 1-son klinik shifoxonasi"/>`)}
          </div>
        </div>

        <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
          ${this.field('shifokor_fio','Ushbu formani to\'ldiruvchi shifokor F.I.O',`<input id="shifokor_fio" class="form-input" value="${d.shifokor_fio||''}" placeholder="Familiya Ism Otasining ismi"/>`,true)}
          ${this.field('shifokor_tel','Shifokor telefon raqami',`<input id="shifokor_tel" class="form-input" value="${d.shifokor_tel||''}" placeholder="+998 90 000 00 00" type="tel"/>`,true)}
        </div>

        <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
          ${icon('check-circle', 24, 'text-green-500 flex-shrink-0 mt-0.5')}
          <div>
            <div class="font-semibold text-green-800">Saqlashga tayyor</div>
            <div class="text-sm text-green-700 mt-1">Barcha ma'lumotlarni tekshirib chiqing va "Saqlash" tugmasini bosing.</div>
          </div>
        </div>
      </div>
    `;
  },

  getAllMuassasalar() {
    return Object.values(APP_CONFIG.MUASSASALAR).flat().sort();
  },

  _dupTimer: null,
  async checkDuplicate(fio) {
    clearTimeout(this._dupTimer);
    const warn = document.getElementById('fio-dup-warn');
    if (!warn) return;
    const q = Utils.normalizeFio((fio || '').trim());
    if (q.length < 3) { warn.innerHTML = ''; return; }
    this._dupTimer = setTimeout(async () => {
      try {
        const sb = getSupabase();
        const [{ data: inf }, { data: ins }] = await Promise.all([
          sb.from('infarkt_qabul').select('kt_no,fio,qabul_vaqt').ilike('fio', `%${q}%`).limit(5),
          sb.from('insult_qabul').select('kt_no,fio,qabul_vaqt').ilike('fio', `%${q}%`).limit(5)
        ]);
        const found = [
          ...(inf || []).map(p => ({ ...p, _t: 'Infarkt' })),
          ...(ins || []).map(p => ({ ...p, _t: 'Insult' }))
        ];
        if (found.length === 0) { warn.innerHTML = ''; return; }
        const rows = found.map(p => {
          const d = p.qabul_vaqt ? new Date(p.qabul_vaqt).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'Asia/Tashkent' }) : '—';
          return `<div class="flex items-center gap-2 text-xs py-1 border-b border-amber-100 last:border-0">
            <span class="font-bold text-amber-900">${esc(p.fio)}</span>
            <span class="text-amber-600">·</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${p._t==='Infarkt'?'bg-red-100 text-red-700':'bg-purple-100 text-purple-700'}">${esc(p._t)}</span>
            <span class="text-amber-600">·</span>
            <span class="text-amber-700">${d} sanasida yotgan</span>
            <span class="text-amber-400">·</span>
            <span class="font-mono text-amber-500 text-[10px]">${esc(p.kt_no)}</span>
          </div>`;
        }).join('');
        warn.innerHTML = `
          <div class="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl">
            <div class="flex items-center gap-2 font-bold text-amber-800 text-sm mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              Bu bemor avval ham ro'yxatda bor!
            </div>
            ${rows}
          </div>`;
      } catch(e) { /* silent */ }
    }, 700);
  },

  onSimptomSoat(val) {
    const soat = parseInt(val);
    const labelEl = document.getElementById('simptom_vaqt_label');
    const hiddenEl = document.getElementById('simptom_vaqt');
    if (!labelEl || !hiddenEl) return;
    if (!val || isNaN(soat) || soat <= 0) {
      labelEl.textContent = soat === 0 ? "0 bo'lmaydi — aniq soat kiriting" : '— soat kiriting';
      labelEl.className = 'text-sm font-bold px-3 py-2 rounded-lg ' + (soat === 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'text-slate-400');
      hiddenEl.value = '';
      InsultYangiPage._data.simptom_vaqt = '';
      InsultYangiPage._data._simptom_soat_raw = '';
      return;
    }
    InsultYangiPage._data._simptom_soat_raw = val;
    let label, isOver;
    if (soat > 24) {
      label = "24 soatdan ortiq";
      isOver = true;
    } else {
      label = `${soat} soat`;
      isOver = false;
    }
    labelEl.textContent = label;
    labelEl.className = `text-sm font-bold px-3 py-2 rounded-lg border ${isOver ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`;
    hiddenEl.value = label;
    InsultYangiPage._data.simptom_vaqt = label;
  },

  _renderAspects(d) {
    const regions = [
      { key:'aspects_c',  label:'C',  name:'Kaudat yadro',           group:'ganglion' },
      { key:'aspects_l',  label:'L',  name:'Lentikulyar yadro',      group:'ganglion' },
      { key:'aspects_ic', label:'IC', name:'Ichki kapsula',           group:'ganglion' },
      { key:'aspects_i',  label:'I',  name:'Insula',                  group:'ganglion' },
      { key:'aspects_m1', label:'M1', name:'Frontal operkulum',       group:'ganglion' },
      { key:'aspects_m2', label:'M2', name:'Oldingi chakka bo\'lagi', group:'ganglion' },
      { key:'aspects_m3', label:'M3', name:'Orqa chakka bo\'lagi',    group:'ganglion' },
      { key:'aspects_m4', label:'M4', name:'M1 ustida',               group:'supra' },
      { key:'aspects_m5', label:'M5', name:'M2 ustida',               group:'supra' },
      { key:'aspects_m6', label:'M6', name:'M3 ustida',               group:'supra' },
    ];
    const ball = this._calcAspects(d);
    const rec = ball >= 8 ? { text:"Reperfuzion terapiya uchun yaxshi nomzod (kichik infarkt)", color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0' }
              : ball >= 6 ? { text:"Reperfuzion terapiya ko'rsatilgan, individual baholash zarur", color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe' }
              : ball >= 4 ? { text:"Keng infarkt — gemorragik transformatsiya xavfi oshgan", color:'#d97706', bg:'#fffbeb', border:'#fde68a' }
              :             { text:"Keng shakllangan infarkt — multidisiplinar qaror", color:'#dc2626', bg:'#fef2f2', border:'#fecaca' };

    const mkBox = (r) => `
      <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:10px;border:1.5px solid ${d[r.key]?'#7c3aed':'#e2e8f0'};background:${d[r.key]?'#f5f3ff':'#fafafa'};cursor:pointer;transition:all 0.15s">
        <input type="checkbox" id="${r.key}" ${d[r.key]?'checked':''}
          onchange="InsultYangiPage.onAspectsChange('${r.key}',this.checked)"
          style="width:18px;height:18px;margin-top:1px;accent-color:#7c3aed;flex-shrink:0"/>
        <div>
          <div style="font-size:14px;font-weight:700;color:#1e293b">${r.label} <span style="font-size:12px;font-weight:500;color:#64748b">— ${r.name}</span></div>
        </div>
      </label>`;

    const ganglion = regions.filter(r=>r.group==='ganglion');
    const supra    = regions.filter(r=>r.group==='supra');

    return `
      <div style="border:2px solid #7c3aed;border-radius:16px;padding:18px 20px;background:linear-gradient(135deg,#faf5ff,#fff);margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div style="font-size:15px;font-weight:800;color:#6d28d9">🧮 ASPECTS shkala (OMA havzasi)</div>
          <div id="aspects-score-badge" style="font-size:20px;font-weight:900;padding:6px 18px;border-radius:30px;background:${rec.bg};color:${rec.color};border:2px solid ${rec.border}">
            ${ball} / 10
          </div>
        </div>

        <div style="margin-bottom:12px">
          <div style="font-size:11px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Gangliyonar sath (bazal yadrolar darajasi)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            ${ganglion.map(mkBox).join('')}
          </div>
        </div>

        <div style="margin-bottom:14px">
          <div style="font-size:11px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px">Supragangliyonar sath (qorinchalar darajasi)</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
            ${supra.map(mkBox).join('')}
          </div>
        </div>

        <div id="aspects-rec" style="padding:10px 14px;border-radius:10px;background:${rec.bg};border:1px solid ${rec.border};font-size:13px;font-weight:700;color:${rec.color}">
          ${ball >= 8 ? '✅' : ball >= 6 ? '🔵' : ball >= 4 ? '⚠️' : '🔴'} ${rec.text}
        </div>
      </div>`;
  },

  _calcAspects(d) {
    const keys = ['aspects_c','aspects_l','aspects_ic','aspects_i','aspects_m1','aspects_m2','aspects_m3','aspects_m4','aspects_m5','aspects_m6'];
    return 10 - keys.filter(k => d[k]).length;
  },

  onAspectsChange(key, checked) {
    InsultYangiPage._data[key] = checked;
    const ball = InsultYangiPage._calcAspects(InsultYangiPage._data);
    const rec = ball >= 8 ? { text:"Reperfuzion terapiya uchun yaxshi nomzod (kichik infarkt)", color:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', icon:'✅' }
              : ball >= 6 ? { text:"Reperfuzion terapiya ko'rsatilgan, individual baholash zarur", color:'#2563eb', bg:'#eff6ff', border:'#bfdbfe', icon:'🔵' }
              : ball >= 4 ? { text:"Keng infarkt — gemorragik transformatsiya xavfi oshgan", color:'#d97706', bg:'#fffbeb', border:'#fde68a', icon:'⚠️' }
              :             { text:"Keng shakllangan infarkt — multidisiplinar qaror", color:'#dc2626', bg:'#fef2f2', border:'#fecaca', icon:'🔴' };
    // Badge yangilash
    const badge = document.getElementById('aspects-score-badge');
    if (badge) {
      badge.textContent = `${ball} / 10`;
      badge.style.background = rec.bg;
      badge.style.color = rec.color;
      badge.style.borderColor = rec.border;
    }
    // Tavsiya yangilash
    const recEl = document.getElementById('aspects-rec');
    if (recEl) {
      recEl.style.background = rec.bg;
      recEl.style.borderColor = rec.border;
      recEl.style.color = rec.color;
      recEl.textContent = `${rec.icon} ${rec.text}`;
    }
    // Checkbox border yangilash
    const label = document.getElementById(key)?.closest('label');
    if (label) {
      label.style.border = `1.5px solid ${checked ? '#7c3aed' : '#e2e8f0'}`;
      label.style.background = checked ? '#f5f3ff' : '#fafafa';
    }
  },

  setSimptomUyqu() {
    const label = "Uyquda boshlangan";
    const labelEl = document.getElementById('simptom_vaqt_label');
    const hiddenEl = document.getElementById('simptom_vaqt');
    const rawEl = document.getElementById('simptom_soat_raw');
    if (labelEl) { labelEl.textContent = label; labelEl.className = 'text-sm font-bold px-3 py-2 rounded-lg border bg-blue-50 text-blue-700 border-blue-200'; }
    if (hiddenEl) hiddenEl.value = label;
    if (rawEl) rawEl.value = '';
    InsultYangiPage._data.simptom_vaqt = label;
    InsultYangiPage._data._simptom_soat_raw = '';
  },

  onMsktChange(val) {
    InsultYangiPage._data.mskt = val;
    // MSKT "Yo'q" bosilsa angiografiya va ASPECTS ni ham tozalaymiz
    if (val !== "Ha – o'tkazildi") {
      InsultYangiPage._data.mskt_angiografiya = '';
    }
    const muolaja = (InsultYangiPage._data.muolaja_turi || '').toLowerCase();
    const show = val === "Ha – o'tkazildi" || muolaja.includes('mskt');
    const div = document.getElementById('mskt-vaqt-div');
    if (div) div.style.display = show ? 'block' : 'none';
    InsultYangiPage._updateAspectsVisibility();
    const haBtn = document.getElementById('mskt-ha');
    const yoqBtn = document.getElementById('mskt-yoq');
    if (haBtn) haBtn.className = `flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${show ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200 hover:border-purple-400'}`;
    if (yoqBtn) yoqBtn.className = `flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${!show ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`;
    const trombDiv = document.getElementById('trombektomiya-vaqt-div');
    if (trombDiv) {
      const isTromb = muolaja.includes('trombektomiya') || muolaja.includes('tromboekstraksiya') || muolaja.includes('tromboaspiratsiya') || muolaja.includes('kombinatsiya') || muolaja.includes('angiografiya') || muolaja.includes('stentlash') || muolaja.includes('tlbap');
      trombDiv.style.display = isTromb ? 'block' : 'none';
    }
  },

  onMsktAngioChange(val) {
    InsultYangiPage._data.mskt_angiografiya = val;
    const haBtn = document.getElementById('mskt-angio-ha');
    const yoqBtn = document.getElementById('mskt-angio-yoq');
    if (haBtn) haBtn.className = `flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${val === 'Ha' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-400'}`;
    if (yoqBtn) yoqBtn.className = `flex-1 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${val === "Yo'q" ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`;
    InsultYangiPage._updateAspectsVisibility();
  },

  _updateAspectsVisibility() {
    const d = InsultYangiPage._data;
    const msktOk = Utils.msktDone(d.mskt) || (d.muolaja_turi || '').toLowerCase().includes('mskt');
    const isIshemik = (d.insult_turi || '') === 'Ishemik insult';
    const angioDiv = document.getElementById('mskt-angio-div');
    const angioShow = msktOk && isIshemik;
    if (angioDiv) angioDiv.style.display = angioShow ? 'block' : 'none';
    // Angio savoli yashirilsa — javobini va ASPECTS ni tozalaymiz (eski ma'lumot saqlanib qolmasin)
    if (!angioShow && d.mskt_angiografiya) {
      d.mskt_angiografiya = '';
    }
    const show = angioShow && d.mskt_angiografiya === 'Ha';
    const aspectsDiv = document.getElementById('aspects-div');
    if (aspectsDiv) aspectsDiv.style.display = show ? 'block' : 'none';
    // ASPECTS bloki yashirilsa — barcha aspects_* belgilarini tozalaymiz
    if (!show) {
      ['aspects_c','aspects_l','aspects_ic','aspects_i','aspects_m1','aspects_m2','aspects_m3','aspects_m4','aspects_m5','aspects_m6']
        .forEach(k => { if (d[k]) d[k] = false; });
    }
  },

  onOtkazilganMuassasa(val) {
    InsultYangiPage._data.otkazilgan_muassasa = val;
    const div = document.getElementById('otkazilgan-boshqa-div');
    if (div) div.style.display = val === '__boshqa__' ? 'block' : 'none';
    if (val !== '__boshqa__') {
      InsultYangiPage._data.otkazilgan_boshqa = '';
      const e = document.getElementById('otkazilgan_boshqa');
      if (e) e.value = '';
    }
  },

  onMuolajaChange(val) {
    InsultYangiPage._data.muolaja_turi = val;
    const v = val.toLowerCase();
    const isOtk = val.startsWith("Boshqa muassasaga o'tkazildi");
    // O'tkazish variantlarida muolaja vaqtlari so'ralmaydi
    const isTLT = !isOtk && (v.includes('trombolizis') || v.includes('tlt'));
    const isTrombektomiya = !isOtk && (v.includes('trombektomiya') || v.includes('tromboekstraksiya') || v.includes('tromboaspiratsiya') || v.includes('kombinatsiya') || v.includes('angiografiya') || v.includes('stentlash') || v.includes('tlbap'));
    const isMskt = Utils.msktDone(InsultYangiPage._data.mskt) || (!isOtk && v.includes('mskt'));
    const otkazDiv = document.getElementById('otkazilgan-div');
    const tltDiv = document.getElementById('trombolizis-vaqt-div');
    const trombDiv = document.getElementById('trombektomiya-vaqt-div');
    const msktDiv = document.getElementById('mskt-vaqt-div');
    // Muolaja o'zgarganda mos kelmaydigan yashirin vaqtlarni tozalaymiz
    if (!isTLT) { InsultYangiPage._data.trombolizis_vaqti = ''; const e=document.getElementById('trombolizis_vaqti'); if(e) e.value=''; }
    if (!isTrombektomiya) { InsultYangiPage._data.trombektomiya_vaqti = ''; const e=document.getElementById('trombektomiya_vaqti'); if(e) e.value=''; }
    if (!isOtk) { InsultYangiPage._data.otkazilgan_muassasa = ''; InsultYangiPage._data.otkazish_sababi = ''; }
    if (otkazDiv) otkazDiv.style.display = isOtk ? 'block' : 'none';
    if (tltDiv) tltDiv.style.display = isTLT ? 'block' : 'none';
    if (trombDiv) {
      trombDiv.style.display = isTrombektomiya ? 'block' : 'none';
      // Label ni dinamik yangilash
      const lbl = trombDiv.querySelector('label');
      if (lbl) {
        const isAngio = (v.includes('angiografiya') || v.includes('stentlash') || v.includes('tlbap')) && !v.includes('trombektomiya') && !v.includes('tromboekstraksiya') && !v.includes('tromboaspiratsiya');
        lbl.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent = isAngio ? "Angiografiya o'tkazilgan vaqt (Groin time)" : 'Trombektomiya (Groin time)'; });
      }
    }
    if (msktDiv) msktDiv.style.display = isMskt ? 'block' : 'none';
    const btn = document.getElementById('save-btn');
    if (btn) {
      btn.className = `flex items-center gap-2 px-10 py-3 ${isOtk ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'} text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95`;
      btn.innerHTML = `${icon(isOtk ? 'log-out' : 'save', 18)} ${isOtk ? 'Chiqarish' : 'Saqlash'}`;
      initIcons();
    }
  },

  saveCurrentStep() {
    const wrap = document.getElementById('step-body');
    if (!wrap) return;

    // qabul_vaqt: alohida sana + soat inputlaridan yig'ish
    const qabulSana = document.getElementById('qabul_sana')?.value;
    const qabulSoat = document.getElementById('qabul_soat')?.value;
    if (qabulSana && qabulSoat) InsultYangiPage._data.qabul_vaqt = `${qabulSana}T${qabulSoat}`;
    else if (qabulSana) InsultYangiPage._data.qabul_vaqt = qabulSana;
    else if (document.getElementById('qabul_sana')) InsultYangiPage._data.qabul_vaqt = '';


    ['viloyat','muassasa','boshqa_muassasa','kt_no','murojaat_yoli','yuborgan_muassasa',
     'tez_yordam_kelgan_vaqt',
     'fio','simptom_vaqt','gcs_bali','birlamchi_yoki_takroriy','insult_turi','aha_bali','nihss_qabul','puls',
     'yashash_viloyat','yashash_tuman','chet_el_davlati',
     'mskt','mskt_angiografiya','otkazilgan_muassasa','otkazilgan_boshqa','shifokor_fio','shifokor_tel']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) InsultYangiPage._data[id] = el.value;
    });

    // Qon bosimi — ikkita katakdan "140/90" ko'rinishida yig'amiz
    const sysEl = document.getElementById('qon_sistolik');
    const diaEl = document.getElementById('qon_diastolik');
    if (sysEl || diaEl) {
      const sys = sysEl?.value?.trim() || '';
      const dia = diaEl?.value?.trim() || '';
      InsultYangiPage._data.qon_bosimi = (sys && dia) ? `${sys}/${dia}` : '';
    }

    // ASPECTS checkboxlarini o'qish
    ['aspects_c','aspects_l','aspects_ic','aspects_i','aspects_m1','aspects_m2',
     'aspects_m3','aspects_m4','aspects_m5','aspects_m6'].forEach(k => {
      const el = document.getElementById(k);
      if (el) InsultYangiPage._data[k] = el.checked;
    });

    // kt_vaqti, trombolizis_vaqti, trombektomiya_vaqti: sana + soat IKKALASI bo'lganda yig'ish
    for (const [prefix, field] of [['kt','kt_vaqti'],['trombolizis','trombolizis_vaqti'],['trombektomiya','trombektomiya_vaqti']]) {
      const sanaEl = document.getElementById(`${prefix}_sana`);
      const soatEl = document.getElementById(`${prefix}_soat`);
      if (!sanaEl) continue; // Bu qadam render qilinmagan — o'zgartirmaymiz
      const sana = sanaEl.value;
      const soat = soatEl?.value || '';
      InsultYangiPage._data[`_${prefix}_sana`] = sana;
      InsultYangiPage._data[`_${prefix}_soat`] = soat;
      if (sana && soat) {
        InsultYangiPage._data[field] = `${sana}T${soat}`;
      } else if (!sana) {
        InsultYangiPage._data[field] = '';
      }
      // sana bor, soat yo'q bo'lsa — oldingi qiymatni saqlab qolamiz (navigatsiyada yo'qolmasin)
    }

    const tugilgan = document.getElementById('tugilgan_sana');
    if (tugilgan) {
      InsultYangiPage._data.tugilgan_sana = tugilgan.value;                    // to'liq sana → tugilgan_sana ustuni
      InsultYangiPage._data.tugilgan_yil  = (tugilgan.value || '').slice(0, 4); // faqat yil → tugilgan_yil ustuni
    }

    const jinsEl = document.querySelector('input[name="jins"]:checked');
    if (jinsEl) InsultYangiPage._data.jins = jinsEl.value;

    // Muolaja turi — endi select (infarkt formasi bilan bir xil)
    const muolajaEl = document.getElementById('muolaja_turi');
    if (muolajaEl) InsultYangiPage._data.muolaja_turi = muolajaEl.value;

    ['xavf_omillari','asoratlar'].forEach(name => {
      // Faqat shu qadamda inputlar mavjud bo'lsa o'qiymiz
      if (document.querySelector(`input[name="${name}"]`)) {
        const els = document.querySelectorAll(`input[name="${name}"]:checked`);
        const key = name === 'xavf_omillari' ? 'xavf_omil' : name;
        InsultYangiPage._data[key] = Array.from(els).map(e=>e.value);
      }
    });
  },

  // Qizil belgilangan katak to'ldirilishi bilan qizilni darhol olib tashlaydi
  _wireRedClear() {
    document.querySelectorAll('.err-red').forEach(el => {
      if (el._redWired) return;
      el._redWired = true;
      const clear = () => {
        const filled = el.tagName === 'DIV'
          ? !!el.querySelector('input:checked')
          : (el.value || '') !== '';
        if (filled) {
          el.classList.remove('border-red-500', 'err-red', 'p-2');
          if (el.id && el.id.endsWith('-group')) el.classList.remove('border', 'rounded-xl');
          const errEl = document.getElementById('err-' + el.id.replace(/-group$/, ''));
          if (errEl) errEl.classList.add('hidden');
        }
      };
      el.addEventListener('input', clear);
      el.addEventListener('change', clear);
    });
  },

  validateStep() {
    this.saveCurrentStep();
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('border-red-500'));
    document.querySelectorAll('.err-red').forEach(el => { el.classList.remove('border-red-500', 'err-red', 'p-2'); if (el.id && el.id.endsWith('-group')) el.classList.remove('border', 'rounded-xl'); });
    document.querySelectorAll('.form-error-msg').forEach(el => { el.textContent=''; el.classList.add('hidden'); });

    let required = [];
    if (this._step === 0) {
      required = ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli'];
      if (this._data.muassasa === 'Boshqa') required.push('boshqa_muassasa');
      if (this._data.murojaat_yoli === 'Boshqa muassasadan') required.push('yuborgan_muassasa');
      if (this._data.murojaat_yoli === 'Tez tibbiy yordam bilan') required.push('tez_yordam_kelgan_vaqt');
    }
    if (this._step === 1) {
      required = ['fio','tugilgan_sana','jins'];
      // Yashash manzili — fuqarolikка qarab
      if (this._data.fuqarolik === 'Chet el') required.push('chet_el_davlati');
      else required.push('yashash_viloyat','yashash_tuman');
    }
    // qon_bosimi bu ro'yxatда yo'q — sistolik/diastolik orqali alohida tekshiriladi
    if (this._step === 2) required = ['aha_bali','simptom_vaqt','nihss_qabul','gcs_bali','birlamchi_yoki_takroriy','insult_turi','puls'];
    if (this._step === 3) {
      required = ['mskt','muolaja_turi','shifokor_fio','shifokor_tel'];
      if ((this._data.muolaja_turi || '').startsWith("Boshqa muassasaga o'tkazildi")) required.push('otkazilgan_muassasa');
    }

    const errs = Utils.validate(this._data, required);
    let valid = true;
    for (const [key, msg] of Object.entries(errs)) {
      valid = false;
      const el = document.getElementById(key) || document.getElementById(key + '-group');
      if (el) el.classList.add('border', 'border-red-500', 'rounded-xl', 'err-red');
      else if (key === 'jins') showToast('Jinsini tanlang', 'warning');
      else if (key === 'muolaja_turi') showToast('Muolaja turini tanlang', 'warning');
      const errEl = document.getElementById('err-'+key);
      if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
    }
    // 2-bosqich: qon bosimi va xavf omillari bo'sh bo'lsa ham darhol qizil belgilaymiz
    if (this._step === 2) {
      const sysEl = document.getElementById('qon_sistolik');
      const diaEl = document.getElementById('qon_diastolik');
      if (sysEl && !sysEl.value) { valid = false; sysEl.classList.add('border-red-500', 'err-red'); }
      if (diaEl && !diaEl.value) { valid = false; diaEl.classList.add('border-red-500', 'err-red'); }
      if (!document.querySelector('input[name="xavf_omillari"]:checked')) {
        valid = false;
        const grp = document.getElementById('xavf_omillari-group');
        if (grp) grp.classList.add('border', 'border-red-500', 'rounded-xl', 'p-2', 'err-red');
        const errEl = document.getElementById('err-xavf_omillari');
        if (errEl) { errEl.textContent = 'Kamida bitta xavf omilini belgilang'; errEl.classList.remove('hidden'); }
      }
    }
    // "Boshqa" muassasa tanlanganda nomi qo'lda yozilishi shart
    if (this._step === 3 && valid && this._data.otkazilgan_muassasa === '__boshqa__') {
      if (!(this._data.otkazilgan_boshqa || '').trim()) {
        valid = false;
        document.getElementById('otkazilgan_boshqa')?.classList.add('border-red-500', 'err-red');
        showToast("⚠️ O'tkazilgan muassasa nomini qo'lda yozing!", 'error', 5000);
      }
    }
    if (!valid) {
      const firstRed = document.querySelector('.err-red');
      if (firstRed) {
        firstRed.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast("⚠️ Qizil belgilangan kataklarni to'ldiring!", 'error', 4000);
      }
      InsultYangiPage._wireRedClear();
    }
    // 0 yoki noreal qiymatlar — keyingi bosqichga o'tkazmaymiz
    if (this._step === 2 && valid) {
      const nihss = parseInt(this._data.nihss_qabul);
      if (!(nihss >= 1 && nihss <= 42)) {
        valid = false;
        const el = document.getElementById('nihss_qabul');
        if (el) el.classList.add('border-red-500');
        showToast("⚠️ NIHSS 0 yoki bo'sh bo'lishi mumkin emas — bemorni kalkulyator orqali baholang!", 'error', 6000);
      }
      const gcs = parseInt(this._data.gcs_bali);
      if (!(gcs >= 3 && gcs <= 15)) {
        valid = false;
        const el = document.getElementById('gcs_bali');
        if (el) el.classList.add('border-red-500');
        showToast("⚠️ GCS 3–15 oralig'ida bo'lishi kerak — kalkulyator orqali baholang!", 'error', 6000);
      }
      if ((this._data.simptom_vaqt || '') === '0 soat') {
        valid = false;
        const el = document.getElementById('simptom_soat_raw');
        if (el) el.classList.add('border-red-500');
        showToast("⚠️ Simptom vaqti 0 bo'lishi mumkin emas — necha soat oldin boshlanganini kiriting!", 'error', 6000);
      }
      const pulsV = parseInt(this._data.puls);
      if (this._data.puls && !(pulsV >= 20 && pulsV <= 300)) {
        valid = false;
        document.getElementById('puls')?.classList.add('border-red-500', 'err-red');
        showToast("⚠️ Puls qiymati noreal (20–300 oralig'ida bo'lishi kerak)!", 'error', 6000);
      }
    }
    // F.I.O — kamida bitta harf bo'lishi kerak
    if (this._step === 1 && valid && this._data.fio) {
      if (!/[a-zA-Zа-яА-ЯўқғҳЎҚҒҲ']/.test(this._data.fio)) {
        valid = false;
        const el = document.getElementById('fio');
        if (el) { el.classList.add('border-red-500'); el.focus(); }
        showToast('⚠️ F.I.O harflardan iborat bo\'lishi kerak!', 'error', 5000);
      }
    }
    // Tug'ilgan sana tekshiruvi
    if (this._step === 1 && this._data.tugilgan_sana) {
      const birth = new Date(this._data.tugilgan_sana);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const age = today.getFullYear() - birth.getFullYear();
      if (birth >= today) {
        valid = false;
        const el = document.getElementById('tugilgan_sana');
        if (el) { el.classList.add('border-red-500'); el.focus(); }
        showToast('⚠️ Tug\'ilgan sana bugun yoki kelajakda bo\'lishi mumkin emas!', 'error', 5000);
      } else if (age < 1) {
        valid = false;
        const el = document.getElementById('tugilgan_sana');
        if (el) { el.classList.add('border-red-500'); el.focus(); }
        showToast('⚠️ Bemor yoshi 1 yoshdan kichik bo\'lishi mumkin emas!', 'error', 5000);
      } else if (age > 120) {
        valid = false;
        const el = document.getElementById('tugilgan_sana');
        if (el) { el.classList.add('border-red-500'); el.focus(); }
        showToast('⚠️ Tug\'ilgan sana noto\'g\'ri kiritilgan!', 'error', 5000);
      }
    }
    // Qabul vaqti — sana VA soat majburiy
    if (this._step === 0) {
      const sanaEl = document.getElementById('qabul_sana');
      const soatEl = document.getElementById('qabul_soat');
      if (sanaEl && soatEl) {
        if (!sanaEl.value) {
          valid = false;
          sanaEl.classList.add('border-red-500'); sanaEl.focus();
          showToast('⚠️ Qabul sanasini kiriting!', 'error', 5000);
        } else if (!soatEl.value) {
          valid = false;
          soatEl.classList.add('border-red-500'); soatEl.focus();
          showToast('⚠️ Qabul soatini kiriting!', 'error', 5000);
        } else {
          const qv = new Date(`${sanaEl.value}T${soatEl.value}:00+05:00`);
          const oneYearAgo = new Date(); oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          if (qv > new Date()) {
            valid = false;
            sanaEl.classList.add('border-red-500');
            showToast('⚠️ Qabul vaqti kelajakda bo\'lishi mumkin emas!', 'error', 5000);
            const errEl = document.getElementById('err-qabul_vaqt');
            if (errEl) { errEl.textContent = 'Kelajak sana kiritilgan — iltimos to\'g\'irlang'; errEl.classList.remove('hidden'); }
          } else if (qv < oneYearAgo) {
            valid = false;
            sanaEl.classList.add('border-red-500');
            showToast('⚠️ Qabul vaqti 1 yildan eski bo\'lishi mumkin emas — sanani tekshiring!', 'error', 6000);
          }
        }
      }
      // Tez yordam vaqti — sana va soat ikkalasi ham to'liq bo'lishi shart
      if (valid && this._data.murojaat_yoli === 'Tez tibbiy yordam bilan') {
        const tySana = document.getElementById('tez_yordam_kelgan_sana')?.value;
        const tySoat = document.getElementById('tez_yordam_kelgan_soat')?.value;
        if (!tySana || !tySoat) {
          valid = false;
          if (!tySana) document.getElementById('tez_yordam_kelgan_sana')?.classList.add('border-red-500');
          if (!tySoat) document.getElementById('tez_yordam_kelgan_soat')?.classList.add('border-red-500');
          showToast("⚠️ Tez yordam yetib kelgan sana VA soatni to'liq kiriting!", 'error', 5000);
        }
      }
      // Tez yordam yetib kelgan vaqti — kelajakda bo'lmasin va qabul vaqtidan keyin bo'lmasin
      if (valid) {
        const tySana = document.getElementById('tez_yordam_kelgan_sana')?.value;
        const tySoat = document.getElementById('tez_yordam_kelgan_soat')?.value;
        if (tySana && tySoat) {
          const tyDt = new Date(`${tySana}T${tySoat}:00+05:00`);
          if (tyDt > new Date()) {
            valid = false;
            document.getElementById('tez_yordam_kelgan_sana')?.classList.add('border-red-500');
            document.getElementById('tez_yordam_kelgan_soat')?.classList.add('border-red-500');
            showToast('⚠️ Tez yordam vaqti kelajakda bo\'lishi mumkin emas!', 'error', 5000);
          } else if (this._data.qabul_vaqt) {
            const qabulDt = new Date(`${this._data.qabul_vaqt}:00+05:00`);
            if (!isNaN(qabulDt) && tyDt > qabulDt) {
              valid = false;
              document.getElementById('tez_yordam_kelgan_sana')?.classList.add('border-red-500');
              document.getElementById('tez_yordam_kelgan_soat')?.classList.add('border-red-500');
              showToast('⚠️ Tez yordam yetib kelgan vaqt bemor kasalxonaga yotqizilgan (qabul) vaqtidan keyin bo\'lishi mumkin emas!', 'error', 6000);
            }
          }
        }
      }
    }
    // Qon bosimi — sistolik va diastolik alohida tekshiriladi
    if (this._step === 2 && valid) {
      const sysEl = document.getElementById('qon_sistolik');
      const diaEl = document.getElementById('qon_diastolik');
      const sys = parseInt(sysEl?.value);
      const dia = parseInt(diaEl?.value);
      if (isNaN(sys) || sys < 50 || sys > 300) {
        valid = false;
        sysEl?.classList.add('border-red-500'); sysEl?.focus();
        showToast('⚠️ Sistolik bosim 50–300 oralig\'ida bo\'lishi kerak!', 'error', 5000);
      } else if (isNaN(dia) || dia < 30 || dia > 200) {
        valid = false;
        diaEl?.classList.add('border-red-500'); diaEl?.focus();
        showToast('⚠️ Diastolik bosim 30–200 oralig\'ida bo\'lishi kerak!', 'error', 5000);
      } else if (dia >= sys) {
        valid = false;
        diaEl?.classList.add('border-red-500'); diaEl?.focus();
        showToast('⚠️ Diastolik bosim sistolikdan kichik bo\'lishi kerak!', 'error', 5000);
      }
    }
    if (this._step === 2 && valid) {
      if (!this._data.xavf_omil || this._data.xavf_omil.length === 0) {
        valid = false;
        showToast('Xavf omillarini belgilang (kamida bittasini)', 'warning');
      }
    }
    // Shifokor telefoni — kamida 7 raqam
    if (this._step === 3 && valid && this._data.shifokor_tel) {
      const digits = (this._data.shifokor_tel.match(/\d/g) || []).length;
      if (digits < 7) {
        valid = false;
        document.getElementById('shifokor_tel')?.classList.add('border-red-500');
        document.getElementById('shifokor_tel')?.focus();
        showToast('⚠️ Shifokor telefonini to\'g\'ri kiriting (kamida 7 raqam)!', 'error', 5000);
      }
    }
    // Step 3: vaqt mezonlari validatsiyasi
    if (this._step === 3 && valid) {
      const now = new Date();
      const qv = (() => { try { return this._data.qabul_vaqt ? new Date(this._data.qabul_vaqt + (this._data.qabul_vaqt.includes('T') ? ':00+05:00' : '')) : null; } catch(e) { return null; } })();
      const muolaja = this._data.muolaja_turi || '';
      const muolajaL = muolaja.toLowerCase();
      const isOtkM = muolaja.startsWith("Boshqa muassasaga o'tkazildi");
      // O'tkazish variantlarida muolaja vaqtlari talab qilinmaydi
      const isTLT = !isOtkM && (muolajaL.includes('trombolizis') || muolajaL.includes('tlt'));
      const isTrombektomiya = !isOtkM && (muolajaL.includes('trombektomiya') || muolajaL.includes('tromboekstraksiya') || muolajaL.includes('tromboaspiratsiya') || muolajaL.includes('kombinatsiya') || muolajaL.includes('angiografiya') || muolajaL.includes('stentlash') || muolajaL.includes('tlbap'));
      const isMskt = Utils.msktDone(this._data.mskt) || (!isOtkM && muolajaL.includes('mskt'));

      // KT/MSKT vaqti majburiy (MSKT o'tkazilganda) — sana VA soat ikkalasi ham shart
      if (isMskt) {
        const ktSana = document.getElementById('kt_sana')?.value;
        const ktSoat = document.getElementById('kt_soat')?.value;
        if (!ktSana) {
          valid = false;
          document.getElementById('kt_sana')?.classList.add('border-red-500');
          document.getElementById('kt_sana')?.focus();
          showToast('⚠️ KT/MSKT sanasini kiriting!', 'error', 5000);
        } else if (!ktSoat) {
          valid = false;
          document.getElementById('kt_soat')?.classList.add('border-red-500');
          document.getElementById('kt_soat')?.focus();
          showToast('⚠️ KT/MSKT soatini kiriting!', 'error', 5000);
        }
      } else {
        // MSKT tanlanmagan — stale qiymatni tozalaymiz
        InsultYangiPage._data.kt_vaqti = '';
      }

      // Trombolizis vaqti majburiy (TLT muolajasi tanlanganda)
      if (isTLT && !this._data.trombolizis_vaqti) {
        const sana = document.getElementById('trombolizis_sana')?.value;
        const soat = document.getElementById('trombolizis_soat')?.value;
        if (!sana) {
          valid = false;
          document.getElementById('trombolizis_sana')?.classList.add('border-red-500');
          document.getElementById('trombolizis_sana')?.focus();
          showToast('⚠️ Trombolizis sanasini kiriting!', 'error', 5000);
        } else if (!soat) {
          valid = false;
          document.getElementById('trombolizis_soat')?.classList.add('border-red-500');
          document.getElementById('trombolizis_soat')?.focus();
          showToast('⚠️ Trombolizis soatini kiriting!', 'error', 5000);
        } else { valid = false; showToast('⚠️ Trombolizis vaqtini kiriting!', 'error', 5000); }
      } else if (this._data.trombolizis_vaqti) {
        const tv = new Date(this._data.trombolizis_vaqti + ':00+05:00');
        if (tv > now) {
          valid = false;
          document.getElementById('trombolizis_sana')?.classList.add('border-red-500');
          showToast('⚠️ Trombolizis vaqti kelajakda bo\'lishi mumkin emas!', 'error', 5000);
        } else if (qv && tv < qv) {
          valid = false;
          document.getElementById('trombolizis_sana')?.classList.add('border-red-500');
          showToast('⚠️ Trombolizis vaqti bemor qabul vaqtidan oldin bo\'lishi mumkin emas!', 'error', 5000);
        }
      }

      // Trombektomiya vaqti majburiy (trombektomiya muolajasi tanlanganda)
      if (isTrombektomiya && !this._data.trombektomiya_vaqti) {
        const sana = document.getElementById('trombektomiya_sana')?.value;
        const soat = document.getElementById('trombektomiya_soat')?.value;
        if (!sana) {
          valid = false;
          document.getElementById('trombektomiya_sana')?.classList.add('border-red-500');
          document.getElementById('trombektomiya_sana')?.focus();
          showToast('⚠️ Trombektomiya sanasini kiriting!', 'error', 5000);
        } else if (!soat) {
          valid = false;
          document.getElementById('trombektomiya_soat')?.classList.add('border-red-500');
          document.getElementById('trombektomiya_soat')?.focus();
          showToast('⚠️ Trombektomiya soatini kiriting!', 'error', 5000);
        } else { valid = false; showToast('⚠️ Trombektomiya vaqtini kiriting!', 'error', 5000); }
      } else if (this._data.trombektomiya_vaqti) {
        const trv = new Date(this._data.trombektomiya_vaqti + ':00+05:00');
        if (trv > now) {
          valid = false;
          document.getElementById('trombektomiya_sana')?.classList.add('border-red-500');
          showToast('⚠️ Trombektomiya vaqti kelajakda bo\'lishi mumkin emas!', 'error', 5000);
        } else if (qv && trv < qv) {
          valid = false;
          document.getElementById('trombektomiya_sana')?.classList.add('border-red-500');
          showToast('⚠️ Trombektomiya vaqti bemor qabul vaqtidan oldin bo\'lishi mumkin emas!', 'error', 5000);
        }
      }
    }
    return valid;
  },

  prevStep() {
    if (this._step > 0) {
      this.saveCurrentStep();
      this._step--;
      this.renderStep();
    }
  },

  nextStep() {
    if (this.validateStep()) {
      this._step++;
      this.renderStep();
    }
  },

  async save() {
    if (InsultYangiPage._saving) return;
    if (!this.validateStep()) return;
    InsultYangiPage._saving = true;
    const btn = document.getElementById('save-btn');
    setLoading(btn, true);
    try {
      const payload = { ...this._data };
      if (payload.muassasa === 'Boshqa' && payload.boshqa_muassasa) {
        payload.muassasa = payload.boshqa_muassasa;
      }
      delete payload.boshqa_muassasa;
      // "Boshqa" muassasa — qo'lda yozilgan nom ishlatiladi
      if (payload.otkazilgan_muassasa === '__boshqa__') {
        payload.otkazilgan_muassasa = (payload.otkazilgan_boshqa || '').trim();
      }
      delete payload.otkazilgan_boshqa;
      delete payload._simptom_soat_raw;
      // aspects_ball GENERATED ustun — bazaga yozmaymiz
      delete payload.aspects_ball;
      if ((payload.muolaja_turi || '').startsWith("Boshqa muassasaga o'tkazildi")) {
        payload.status = 'otkazildi';
      }
      // datetime-local qiymatlari Toshkent vaqti (UTC+5) — bazaga UTC ISO sifatida yuboramiz
      // Agar allaqachon ISO UTC bo'lsa (Z) — qayta o'zgartirmaymiz
      for (const f of ['qabul_vaqt', 'kt_vaqti', 'trombolizis_vaqti', 'trombektomiya_vaqti', 'tez_yordam_kelgan_vaqt']) {
        if (!payload[f]) { payload[f] = null; continue; }
        if (!payload[f].endsWith('Z') && !payload[f].includes('+05:00')) {
          payload[f] = new Date(payload[f] + ':00+05:00').toISOString();
        } else if (payload[f].includes('+05:00')) {
          payload[f] = new Date(payload[f]).toISOString();
        }
      }

      // FIO ni normalize qil: KARIMOV JASUR → Karimov Jasur
      if (payload.fio) payload.fio = Utils.toTitleCase(payload.fio);
      if (payload.shifokor_fio) payload.shifokor_fio = Utils.toTitleCase(payload.shifokor_fio);

      // Duplikat tekshiruv — bir xil bemor (F.I.O + tug'ilgan yili + qabul sanasi) bazada bormi?
      const dup = await DB.checkDuplicate('insult_qabul', payload.fio, payload.tugilgan_yil, payload.qabul_vaqt);
      if (dup) {
        showToast(`❌ Bu bemor allaqachon ro'yxatda: ${dup.fio} · ${dup.muassasa} · K/T: ${dup.kt_no}`, 'error', 8000);
        setLoading(btn, false);
        return;
      }

      const saved = await DB.insultQabul(payload);
      // Telegram xabar endi server tomondan yuboriladi (insult_qabul INSERT trigger —
      // telegram_server_notify.sql). Brauzerdan yuborsak dublikat bo'ladi.
      // Telegram.notify(saved, 'insult').catch(() => {});
      const isOtk = payload.status === 'otkazildi';
      showToast(isOtk ? `✅ Bemor ${payload.otkazilgan_muassasa || 'boshqa muassasa'}ga o'tkazildi!` : '🎉 Bemor muvaffaqiyatli saqlandi!', 'success');
      setTimeout(() => Router.go('dashboard'), 1500);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
      InsultYangiPage._saving = false;
    }
  }
};
