// ==================== INFARKT YANGI BEMOR SAHIFASI ====================
const InfarktYangiPage = {
  _step: 0,
  _data: {},
  STEPS: ['Muassasa', 'Bemor', 'Klinik', 'Muolaja'],

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    InfarktYangiPage._profile = profile;
    InfarktYangiPage._step = 0;
    InfarktYangiPage._data = {
      kt_no: Utils.generateKtNo(profile?.muassasa || ''),
      qabul_vaqt: Utils.formatDateInput(new Date()),
      viloyat: (profile?.role === 'admin' || profile?.role === 'super_admin') ? '' : (profile?.viloyat || '')
    };

    document.getElementById('app').innerHTML = Components.renderLayout(
      'infarkt-yangi', 'Yangi Infarkt Bemori', 'Bemor qabul qilish formasi',
      `<div id="infarkt-form-wrap"></div>`, user
    );
    Components.startClock();
    InfarktYangiPage.renderStep();
  },

  renderStep() {
    const step = InfarktYangiPage._step;
    const wrap = document.getElementById('infarkt-form-wrap');
    const sectionIcons = ['building-2', 'user', 'activity', 'pill'];
    const sectionTitles = [
      'Muassasa ma\'lumotlari',
      'Bemor ma\'lumotlari',
      'Klinik ma\'lumotlar',
      'Muolaja va Shifokor'
    ];

    wrap.innerHTML = `
      <div class="max-w-4xl mx-auto animate-fadein pb-20">
        <div class="mb-4 sm:mb-10">
          ${Components.renderSteps(InfarktYangiPage.STEPS, step)}
        </div>

        <div class="bg-white rounded-2xl sm:rounded-[32px] shadow-xl sm:shadow-2xl border border-slate-100 overflow-hidden">
          <div class="p-4 sm:p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 sm:w-14 sm:h-14 bg-red-50 text-red-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                ${icon(sectionIcons[step], 24)}
              </div>
              <div>
                <p class="text-[10px] font-black text-red-600 uppercase tracking-widest mb-0.5">Bo'lim ${step+1} / 4</p>
                <h3 class="text-base sm:text-xl font-black text-slate-800 tracking-tight">${sectionTitles[step]}</h3>
              </div>
            </div>
            <div class="hidden sm:block text-right">
              <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">To'ldirilish darajasi</div>
              <div class="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-red-500" style="width: ${(step+1)/4*100}%"></div>
              </div>
            </div>
          </div>

          <div class="p-4 sm:p-8" id="step-body">
            ${InfarktYangiPage['renderStep' + step]()}
          </div>

          <div class="p-4 sm:p-8 border-t border-slate-50 bg-slate-50/50 flex justify-between items-center gap-2">
            <button class="flex items-center gap-1 px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-500 hover:bg-slate-100 transition-all shrink-0" onclick="InfarktYangiPage.prevStep()" ${step===0?'disabled style="opacity:0"':''}>
              ${icon('arrow-left', 16)} <span class="hidden sm:inline">Orqaga</span>
            </button>
            <div class="flex gap-2 sm:gap-4">
              <button class="px-3 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all hidden sm:block" onclick="Router.go('dashboard')">Bekor qilish</button>
              ${step < InfarktYangiPage.STEPS.length-1
                ? `<button class="flex items-center gap-1 px-4 py-2 sm:px-8 sm:py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95" onclick="InfarktYangiPage.nextStep()">Keyingi ${icon('arrow-right', 16)}</button>`
                : (() => {
                    const isOtk = InfarktYangiPage._data.muolaja_turi === "Boshqa muassasaga o'tkazildi";
                    return `<button class="flex items-center gap-1 px-4 py-2 sm:px-8 sm:py-3 ${isOtk ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95" id="save-btn" onclick="InfarktYangiPage.save()">${icon(isOtk ? 'log-out' : 'save', 16)} ${isOtk ? 'Chiqarish' : 'Saqlash'}</button>`;
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
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        ${arr.map(item => {
          const isSel = selectedArr.includes(item);
          return `
            <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSel ? 'border-red-500 bg-red-50 text-red-700 font-medium shadow-sm' : 'border-gray-200 hover:border-red-300 hover:bg-gray-50 text-gray-600'}">
              <input type="checkbox" name="${name}" value="${item}" class="hidden" ${isSel?'checked':''} onchange="InfarktYangiPage.toggleCheckbox(this)">
              <div class="w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSel ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white'}">
                ${isSel ? icon('check', 14) : ''}
              </div>
              <span class="text-sm">${item}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  },

  radioGroup(name, arr, selected) {
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
        ${arr.map(item => {
          const isSel = selected === item;
          return `
            <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSel ? 'border-red-500 bg-red-50 text-red-700 font-medium shadow-sm' : 'border-gray-200 hover:border-red-300 hover:bg-gray-50 text-gray-600'}">
              <input type="radio" name="${name}" value="${item}" class="hidden" ${isSel?'checked':''} onchange="InfarktYangiPage.onRadioChange(this)">
              <div class="w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors ${isSel ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white'}">
                ${isSel ? '<div class="w-2 h-2 bg-white rounded-full"></div>' : ''}
              </div>
              <span class="text-sm">${item}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  },

  onRadioChange(el) {
    const name = el.name;
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
      const parent = input.closest('label');
      const box = parent.querySelector('div');
      parent.className = `flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all border-gray-200 hover:border-red-300 hover:bg-gray-50 text-gray-600`;
      box.className = `w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors border-gray-300 bg-white`;
      box.innerHTML = '';
    });
    const parent = el.closest('label');
    const box = parent.querySelector('div');
    parent.className = `flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all border-red-500 bg-red-50 text-red-700 font-medium shadow-sm`;
    box.className = `w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors bg-red-500 border-red-500 text-white`;
    box.innerHTML = '<div class="w-2 h-2 bg-white rounded-full"></div>';
    this.saveCurrentStep();
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
          const d = p.qabul_vaqt ? new Date(p.qabul_vaqt).toLocaleDateString('uz-UZ', { day:'2-digit', month:'2-digit', year:'numeric' }) : '—';
          return `<div class="flex items-center gap-2 text-xs py-1 border-b border-amber-100 last:border-0">
            <span class="font-bold text-amber-900">${esc(p.fio)}</span>
            <span class="text-amber-600">·</span>
            <span class="px-1.5 py-0.5 rounded text-[10px] font-bold ${p._t==='Infarkt'?'bg-red-100 text-red-700':'bg-purple-100 text-purple-700'}">${esc(p._t)}</span>
            <span class="text-amber-600">·</span>
            <span class="text-amber-700">${esc(d)} sanasida yotgan</span>
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

  toggleCheckbox(el) {
    const parent = el.closest('label');
    const isSel = el.checked;
    parent.className = `flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSel ? 'border-red-500 bg-red-50 text-red-700 font-medium shadow-sm' : 'border-gray-200 hover:border-red-300 hover:bg-gray-50 text-gray-600'}`;
    const box = parent.querySelector('div');
    box.className = `w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${isSel ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white'}`;
    box.innerHTML = isSel ? icon('check', 14) : '';
  },

  // ============ 1-BO'LIM: Muassasa ============
  renderStep0() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('viloyat','Viloyat / Shahar',`<select id="viloyat" class="form-select" onchange="InfarktYangiPage.onViloyatChange(this.value)" ${InfarktYangiPage._profile?.role !== 'admin' && InfarktYangiPage._profile?.role !== 'super_admin' ? 'disabled' : ''}><option value="">Tanlang...</option>
          ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.viloyat===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}
        ${this.field('muassasa','Muassasa',`<select id="muassasa" class="form-select" onchange="InfarktYangiPage.onMuassasaChange(this.value)"><option value="">Tanlang...</option>${(APP_CONFIG.MUASSASALAR[d.viloyat]||[]).map(m=>`<option value="${m}" ${d.muassasa===m?'selected':''}>${m}</option>`).join('')}<option value="Boshqa" ${d.muassasa==='Boshqa'?'selected':''}>Boshqa</option></select>`,true)}
        <div class="col-span-1 sm:col-span-2" id="boshqa-muassasa-div" style="display:${d.muassasa==='Boshqa'?'block':'none'}">
          ${this.field('boshqa_muassasa','Boshqa muassasa nomi',`<input id="boshqa_muassasa" class="form-input" value="${d.boshqa_muassasa||''}" placeholder="Muassasa nomini kiriting"/>`,true)}
        </div>
        ${this.field('kt_no','Kasallik tarixi №',`<input id="kt_no" class="form-input font-mono bg-gray-50" value="${d.kt_no||''}"/>`,true,'Avtomatik yaratiladi')}
        ${this.field('qabul_vaqt','Bemor qabul qilingan sana va vaqt',`<input id="qabul_vaqt" type="datetime-local" class="form-input" value="${d.qabul_vaqt||''}"/>`,true)}
        <div class="col-span-1 sm:col-span-2">
          ${this.field('murojaat_yoli','Murojaat yo\'li',`<select id="murojaat_yoli" class="form-select" onchange="InfarktYangiPage.onMurojaatChange(this.value)">
            ${this.selectOptions(APP_CONFIG.MUROJAAT_YOLLARI, d.murojaat_yoli||'')}</select>`,true)}
        </div>
        <div class="col-span-1 sm:col-span-2" id="yuborgan-div" style="display:${d.murojaat_yoli==='Boshqa muassasadan'?'block':'none'}">
          ${this.field('yuborgan_muassasa','Yuborgan muassasa nomi',`<input id="yuborgan_muassasa" class="form-input" value="${d.yuborgan_muassasa||''}" placeholder="Muassasa nomini kiriting"/>`)}
        </div>
        <div id="tez-yordam-div" style="display:${d.murojaat_yoli==='Tez tibbiy yordam bilan'?'block':'none'}">
          ${this.field('tez_yordam_kelgan_vaqt','Tez yordam yetib keldi (vaqt)',`<input id="tez_yordam_kelgan_vaqt" type="datetime-local" class="form-input" value="${d.tez_yordam_kelgan_vaqt||''}"/>`,true)}
        </div>
      </div>
    `;
  },

  onMurojaatChange(val) {
    InfarktYangiPage._data.murojaat_yoli = val;
    const yuborgan = document.getElementById('yuborgan-div');
    if (yuborgan) yuborgan.style.display = val === 'Boshqa muassasadan' ? 'block' : 'none';
    const tezYordam = document.getElementById('tez-yordam-div');
    if (tezYordam) tezYordam.style.display = val === 'Tez tibbiy yordam bilan' ? 'block' : 'none';
  },

  onMuassasaChange(val) {
    InfarktYangiPage._data.muassasa = val;
    const div = document.getElementById('boshqa-muassasa-div');
    if (div) div.style.display = val === 'Boshqa' ? 'block' : 'none';
    if (val && val !== 'Boshqa' && InfarktYangiPage._data.kt_no) {
      const newKt = Utils.generateKtNo(val);
      InfarktYangiPage._data.kt_no = newKt;
      const ktEl = document.getElementById('kt_no');
      if (ktEl) ktEl.value = newKt;
    }
  },

  onInfarktTuriChange(val) {
    InfarktYangiPage._data.infarkt_turi = val;
    const graceDiv = document.getElementById('grace-bali-div');
    if (graceDiv) graceDiv.style.display = (val === "O'KS ST elevatsiyasiz (NSTEMI)") ? 'block' : 'none';
  },

  onViloyatChange(val) {
    InfarktYangiPage._data.viloyat = val;
    InfarktYangiPage._data.muassasa = '';
    const sel = document.getElementById('muassasa');
    if (!sel) return;
    const list = APP_CONFIG.MUASSASALAR[val] || [];
    sel.innerHTML = `<option value="">Tanlang...</option>` +
      list.map(m => `<option value="${m}">${m}</option>`).join('') +
      `<option value="Boshqa">Boshqa</option>`;
    InfarktYangiPage.onMuassasaChange('');
  },

  // ============ 2-BO'LIM: Bemor ============
  renderStep1() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        <div class="col-span-1 sm:col-span-2">
          ${this.field('fio','Bemor F.I.O',`<input id="fio" class="form-input" value="${d.fio||''}" placeholder="Familiya Ism Otasining ismi" oninput="InfarktYangiPage.checkDuplicate(this.value)"/>`,true)}
          <div id="fio-dup-warn"></div>
        </div>
        ${this.field('tugilgan_sana','Tug\'ilgan sanasi',`<input id="tugilgan_sana" type="date" class="form-input" value="${d.tugilgan_sana||''}"/>`,true)}
        <div class="col-span-1 sm:col-span-2">
          ${this.field('jins','Jinsi',`
            <div class="flex gap-4 mt-1">
              <label class="flex-1 flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${d.jins==='Erkak'?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-200 hover:bg-gray-50'}">
                <input type="radio" name="jins" value="Erkak" class="w-4 h-4 text-blue-600" ${d.jins==='Erkak'?'checked':''} onchange="InfarktYangiPage.saveCurrentStep()">
                <span class="font-medium">Erkak</span>
              </label>
              <label class="flex-1 flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${d.jins==='Ayol'?'border-pink-500 bg-pink-50 text-pink-700':'border-gray-200 hover:bg-gray-50'}">
                <input type="radio" name="jins" value="Ayol" class="w-4 h-4 text-pink-600" ${d.jins==='Ayol'?'checked':''} onchange="InfarktYangiPage.saveCurrentStep()">
                <span class="font-medium">Ayol</span>
              </label>
            </div>
          `,true)}
        </div>
      </div>
    `;
  },

  // ============ 3-BO'LIM: Klinik ============
  renderStep2() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('aha_bali','AHA (American Heart Association) savolnomasi bali',`<div class="flex gap-2 items-center"><input id="aha_bali" type="number" class="form-input w-full bg-slate-50 cursor-not-allowed" value="${d.aha_bali||''}" placeholder="Kalkulyator orqali to'ldiring" readonly style="pointer-events:none;opacity:0.8"/><button type="button" class="flex-shrink-0 bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors border border-rose-200 flex items-center gap-1" onclick="Calculators.openAHA('aha_bali')">🧮 Hisoblash</button></div>`,true)}
        ${this.field('simptom_vaqt','Simptomlar qachon boshlangan? (soat)',`
          <div class="flex gap-3 items-center">
            <input id="simptom_soat_raw" type="number" min="0" max="999" class="form-input w-32"
              placeholder="Soat" value="${d._simptom_soat_raw||''}"
              oninput="InfarktYangiPage.onSimptomSoat(this.value)"/>
            <div id="simptom_vaqt_label" class="text-sm font-bold px-3 py-2 rounded-lg ${d.simptom_vaqt ? (d.simptom_vaqt.includes('ko\'p') || d.simptom_vaqt.includes('ortiq') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200') : 'text-slate-400'}">
              ${d.simptom_vaqt || '— soat kiriting'}
            </div>
          </div>
          <input id="simptom_vaqt" type="hidden" value="${d.simptom_vaqt||''}"/>
          <p class="text-xs text-slate-400 mt-1">Aniq soat kiriting. 24 dan ortiq bo'lsa "24 soatdan ko'p" avtomatik ko'rinadi.</p>
        `,true)}
        ${this.field('birlamchi_yoki_takroriy','Birlamchi yoki takroriy?',`<select id="birlamchi_yoki_takroriy" class="form-select">
          ${this.selectOptions(APP_CONFIG.BIRLAMCHI_TAKROIRIY, d.birlamchi_yoki_takroriy||'')}</select>`,true)}
        ${this.field('infarkt_turi','Tashxis',`<select id="infarkt_turi" class="form-select border-red-300 focus:border-red-500" onchange="InfarktYangiPage.onInfarktTuriChange(this.value)">
          ${this.selectOptions(APP_CONFIG.INFARKT_TURLARI, d.infarkt_turi||'')}</select>`,true)}
        ${this.field('killip','Killip klassifikatsiyasi',`<select id="killip" class="form-select">
          ${this.selectOptions(APP_CONFIG.KILLIP_KLASSLAR, d.killip||'')}</select>`,true)}
        ${this.field('qon_bosimi','Qon bosimi (qabul paytida)',`<input id="qon_bosimi" class="form-input font-mono" value="${d.qon_bosimi||''}" placeholder="140/90"/>`,true)}
        ${this.field('puls','Puls (qabul paytida)',`<input id="puls" type="number" min="20" max="300" class="form-input" value="${d.puls||''}" placeholder="76" oninput="this.value=this.value.replace(/[^0-9]/g,'')"/>`,true)}
        ${this.field('ekg_vaqti','EKG o\'tkazilgan vaqt',`<input id="ekg_vaqti" type="time" class="form-input" value="${d.ekg_vaqti||''}"/>`,true)}
        ${this.field('troponin','Troponin natijasi',`<select id="troponin" class="form-select">
          ${this.selectOptions(['Normal','Yuqori','O\'lchanmagan'], d.troponin||'')}</select>`,true)}
        ${this.field('kkfmb','KFK-MB natijasi',`<select id="kkfmb" class="form-select">
          ${this.selectOptions(['Normal','Yuqori','O\'lchanmagan'], d.kkfmb||'')}</select>`,true)}

        <div id="grace-bali-div" class="col-span-1 sm:col-span-2" style="display:${d.infarkt_turi === "O'KS ST elevatsiyasiz (NSTEMI)" ? 'block' : 'none'}">
          ${this.field('grace_bali','GRACE Score (NSTEMI xavf baholash)',`
            <div class="flex gap-2 items-center">
              <input id="grace_bali" type="number" class="form-input w-full bg-slate-50 cursor-not-allowed" value="${d.grace_bali||''}" placeholder="Kalkulyator orqali to'ldiring" readonly style="pointer-events:none;opacity:0.8"/>
              <button type="button" class="flex-shrink-0 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors border border-indigo-200 flex items-center gap-1" onclick="Calculators.openGRACE('grace_bali')">🧮 Hisoblash</button>
            </div>
            <div id="grace-result-box">${d.grace_bali ? Calculators.graceResultBadgeHtml(parseInt(d.grace_bali)) : ''}</div>
          `,true)}
        </div>
      </div>
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('ekg_natija','EKG natijasi (faqat bittasini tanlang)',
          this.radioGroup('ekg_natija', APP_CONFIG.EKG_NATIJALARI, d.ekg_natija||''))}
      </div>
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('xavf_omillari','Xavf omillari (bir nechta tanlash mumkin)',
          this.checkboxGroup('xavf_omillari', APP_CONFIG.XAVF_OMILLAR_INFARKT, d.xavf_omillari||[]))}
      </div>
    `;
  },

  // ============ 4-BO'LIM: Muolaja ============
  _isTLT(val) {
    return val && (val.includes('TLT') || val.includes('trombolitik'));
  },
  _isPCI(val) {
    return val && (val.includes('PCI') || val.includes('stentlash') || val.includes('TLBAP') || val.includes('ballon') || val.includes('KAG'));
  },

  renderStep3() {
    const d = InfarktYangiPage._data;
    const muolaja = d.muolaja_turi || '';
    const showAngio = muolaja === 'Faqat KAG (diagnostik koronar angiografiya)';
    const showOtkazilgan = muolaja === 'Boshqa muassasaga o\'tkazildi';
    const showTLT = InfarktYangiPage._isTLT(muolaja);
    const showPCI = InfarktYangiPage._isPCI(muolaja);
    const pciLabel = muolaja === 'Faqat KAG (diagnostik koronar angiografiya)' ? 'KAG o\'tkazilgan vaqt (Groin time)' : 'PCI/KAG (kateter kiritilgan vaqt — Groin time)';

    return `
      <div class="grid grid-cols-1 gap-x-6">
        ${this.field('muolaja_turi','Bajarilgan muolaja turi',`<select id="muolaja_turi" class="form-select border-blue-300 focus:border-blue-500" onchange="InfarktYangiPage.onMuolajaChange(this.value)">
          ${this.selectOptions(APP_CONFIG.INFARKT_MUOLAJALARI, muolaja)}</select>`,true)}

        <div id="tlt-vaqt-div" style="display:${showTLT?'block':'none'}">
          ${this.field('tlt_vaqt','TLT (trombolitik terapiya) o\'tkazilgan vaqt',`
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sana *</label>
                <input id="tlt_sana" type="date" class="form-input w-full" value="${d.tlt_vaqt?d.tlt_vaqt.split('T')[0]:''}"/>
              </div>
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Soat * (HH:MM)</label>
                <input id="tlt_soat" type="time" class="form-input w-full" value="${d.tlt_vaqt?d.tlt_vaqt.split('T')[1]?.slice(0,5):''}"/>
              </div>
            </div>`,true,'Door-to-needle mezonini hisoblash uchun')}
          <input id="tlt_vaqt" type="hidden" value="${d.tlt_vaqt||''}"/>
        </div>

        <div id="pci-vaqt-div" style="display:${showPCI?'block':'none'}">
          ${this.field('pci_vaqt', pciLabel, `
            <div class="flex gap-2">
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sana *</label>
                <input id="pci_sana" type="date" class="form-input w-full" value="${d.pci_vaqt?d.pci_vaqt.split('T')[0]:''}"/>
              </div>
              <div class="flex-1">
                <label class="block text-[10px] font-bold text-slate-500 uppercase mb-1">Soat * (HH:MM)</label>
                <input id="pci_soat" type="time" class="form-input w-full" value="${d.pci_vaqt?d.pci_vaqt.split('T')[1]?.slice(0,5):''}"/>
              </div>
            </div>`,true,'Door-to-groin mezonini hisoblash uchun')}
          <input id="pci_vaqt" type="hidden" value="${d.pci_vaqt||''}"/>
        </div>

        <div id="angio-div" style="display:${showAngio?'block':'none'}">
          ${this.field('angio_natija','Diagnostik koronar angiografiya natijasi',`<select id="angio_natija" class="form-select" onchange="InfarktYangiPage.onAngioChange(this.value)">
            ${this.selectOptions(APP_CONFIG.ANGIO_NATIJALARI, d.angio_natija||'')}</select>`)}
          <div id="aksh-hint" class="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm hidden">
            <strong>Tavsiya:</strong> To'liq okklyuziya yoki ko'p tomirli zararlanish holatida operativ davo (AKSH) tavsiya etiladi.
          </div>
        </div>

        <div id="otkazilgan-div" style="display:${showOtkazilgan?'block':'none'}">
          ${this.field('otkazish_sababi','O\'tkazish sababi',`<select id="otkazish_sababi" class="form-select">
            ${this.selectOptions(['Koronarografiya (KAG) uchun', 'Boshqa sabab'], d.otkazish_sababi||'')}</select>`,true)}
          ${this.field('otkazilgan_muassasa','O\'tkazilgan muassasa nomi',`<select id="otkazilgan_muassasa" class="form-select">
            <option value="">Muassasani tanlang...</option>
            ${this.getAllMuassasalar().map(m => `<option value="${m}" ${d.otkazilgan_muassasa===m?'selected':''}>${m}</option>`).join('')}
          </select>`)}
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

  onSimptomSoat(val) {
    const soat = parseInt(val);
    const labelEl = document.getElementById('simptom_vaqt_label');
    const hiddenEl = document.getElementById('simptom_vaqt');
    if (!labelEl || !hiddenEl) return;
    if (!val || isNaN(soat) || soat < 0) {
      labelEl.textContent = '— soat kiriting';
      labelEl.className = 'text-sm font-bold px-3 py-2 rounded-lg text-slate-400';
      hiddenEl.value = '';
      InfarktYangiPage._data.simptom_vaqt = '';
      InfarktYangiPage._data._simptom_soat_raw = '';
      return;
    }
    InfarktYangiPage._data._simptom_soat_raw = val;
    let label, isOver;
    if (soat > 24) {
      label = "24 soatdan ko'p";
      isOver = true;
    } else {
      label = `${soat} soat`;
      isOver = false;
    }
    labelEl.textContent = label;
    labelEl.className = `text-sm font-bold px-3 py-2 rounded-lg border ${isOver ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`;
    hiddenEl.value = label;
    InfarktYangiPage._data.simptom_vaqt = label;
  },

  setSimptomNoma() {
    const label = "Noma'lum";
    const labelEl = document.getElementById('simptom_vaqt_label');
    const hiddenEl = document.getElementById('simptom_vaqt');
    const rawEl = document.getElementById('simptom_soat_raw');
    if (labelEl) { labelEl.textContent = label; labelEl.className = 'text-sm font-bold px-3 py-2 rounded-lg border bg-slate-100 text-slate-600 border-slate-200'; }
    if (hiddenEl) hiddenEl.value = label;
    if (rawEl) rawEl.value = '';
    InfarktYangiPage._data.simptom_vaqt = label;
    InfarktYangiPage._data._simptom_soat_raw = '';
  },

  onMuolajaChange(val) {
    InfarktYangiPage._data.muolaja_turi = val;
    const isOtk = val === "Boshqa muassasaga o'tkazildi";
    const angioDiv = document.getElementById('angio-div');
    const otkazDiv = document.getElementById('otkazilgan-div');
    const tltDiv = document.getElementById('tlt-vaqt-div');
    const pciDiv = document.getElementById('pci-vaqt-div');
    if (tltDiv) tltDiv.style.display = InfarktYangiPage._isTLT(val) ? 'block' : 'none';
    if (pciDiv) {
      pciDiv.style.display = InfarktYangiPage._isPCI(val) ? 'block' : 'none';
      const lbl = pciDiv.querySelector('label');
      if (lbl) {
        const isFaqatKag = val === 'Faqat KAG (diagnostik koronar angiografiya)';
        lbl.childNodes.forEach(n => { if (n.nodeType === 3) n.textContent = isFaqatKag ? "KAG o'tkazilgan vaqt (Groin time)" : 'PCI/KAG (kateter kiritilgan vaqt — Groin time)'; });
      }
    }
    if (angioDiv) {
      const isAngio = val === 'Faqat KAG (diagnostik koronar angiografiya)';
      angioDiv.style.display = isAngio ? 'block' : 'none';
      if (isAngio) {
        const angioVal = document.getElementById('angio_natija')?.value;
        if (angioVal) InfarktYangiPage.onAngioChange(angioVal);
      }
    }
    if (otkazDiv) otkazDiv.style.display = isOtk ? 'block' : 'none';
    const btn = document.getElementById('save-btn');
    if (btn) {
      btn.className = `flex items-center gap-2 px-10 py-3 ${isOtk ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' : 'bg-green-600 hover:bg-green-700 shadow-green-200'} text-white rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95`;
      btn.innerHTML = `${icon(isOtk ? 'log-out' : 'save', 18)} ${isOtk ? 'Chiqarish' : 'Saqlash'}`;
      initIcons();
    }
  },

  onAngioChange(val) {
    InfarktYangiPage._data.angio_natija = val;
    const hint = document.getElementById('aksh-hint');
    if (hint) {
      const show = val === 'To\'liq okklyuziya' || val === 'Ko\'p tomirli diffuz zararlanishi';
      hint.classList.toggle('hidden', !show);
    }
  },

  // renderStep4 removed as it is now part of renderStep3

  saveCurrentStep() {
    const wrap = document.getElementById('step-body');
    if (!wrap) return;

    ['viloyat','muassasa','boshqa_muassasa','kt_no','qabul_vaqt','murojaat_yoli','yuborgan_muassasa',
     'tez_yordam_kelgan_vaqt','birinchi_murojaat_vaqti',
     'fio','aha_bali','simptom_vaqt','birlamchi_yoki_takroriy',
     'infarkt_turi','killip','qon_bosimi','puls','ekg_vaqti','troponin','kkfmb',
     'muolaja_turi','angio_natija','otkazilgan_muassasa','otkazish_sababi','shifokor_fio','shifokor_tel']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) InfarktYangiPage._data[id] = el.value;
    });
    // grace_bali faqat NSTEMI uchun
    const graceEl = document.getElementById('grace_bali');
    if (graceEl && InfarktYangiPage._data.infarkt_turi === "O'KS ST elevatsiyasiz (NSTEMI)") {
      InfarktYangiPage._data.grace_bali = graceEl.value;
    } else {
      delete InfarktYangiPage._data.grace_bali;
    }

    // tlt_vaqt va pci_vaqt: sana + soat dan yig'ish
    for (const [prefix, field] of [['tlt','tlt_vaqt'],['pci','pci_vaqt']]) {
      const sana = document.getElementById(`${prefix}_sana`)?.value;
      const soat = document.getElementById(`${prefix}_soat`)?.value;
      if (sana && soat) {
        InfarktYangiPage._data[field] = `${sana}T${soat}`;
      } else if (sana && !soat) {
        InfarktYangiPage._data[field] = sana; // soatsiz — validator xato beradi
      } else {
        InfarktYangiPage._data[field] = '';
      }
    }

    const tugilgan = document.getElementById('tugilgan_sana');
    if (tugilgan) {
      InfarktYangiPage._data.tugilgan_sana = tugilgan.value;
      InfarktYangiPage._data.tugilgan_yil = tugilgan.value;
    }

    const jinsEl = document.querySelector('input[name="jins"]:checked');
    if (jinsEl) InfarktYangiPage._data.jins = jinsEl.value;

    const ekgEl = document.querySelector('input[name="ekg_natija"]:checked');
    if (ekgEl) InfarktYangiPage._data.ekg_natija = [ekgEl.value];

    if (document.querySelector(`input[name="xavf_omillari"]`)) {
      const xavfEls = document.querySelectorAll(`input[name="xavf_omillari"]:checked`);
      InfarktYangiPage._data.xavf_omil = Array.from(xavfEls).map(e=>e.value);
    }
  },

  validateStep() {
    this.saveCurrentStep();
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('border-red-500'));
    document.querySelectorAll('.form-error-msg').forEach(el => { el.textContent=''; el.classList.add('hidden'); });

    let required = [];
    if (this._step === 0) {
      required = ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli'];
      if (this._data.muassasa === 'Boshqa') required.push('boshqa_muassasa');
      if (this._data.murojaat_yoli === 'Boshqa muassasadan') required.push('yuborgan_muassasa');
      if (this._data.murojaat_yoli === 'Tez tibbiy yordam bilan') required.push('tez_yordam_kelgan_vaqt');
    }
    if (this._step === 1) required = ['fio','tugilgan_sana','jins'];
    if (this._step === 2) required = ['aha_bali','simptom_vaqt','birlamchi_yoki_takroriy','infarkt_turi','killip','qon_bosimi','puls','ekg_vaqti','troponin','kkfmb','ekg_natija'];
    if (this._step === 3) {
      required = ['muolaja_turi','shifokor_fio','shifokor_tel'];
      if (this._data.muolaja_turi === "Boshqa muassasaga o'tkazildi") required.push('otkazilgan_muassasa', 'otkazish_sababi');
      if (this._data.muolaja_turi === 'Faqat KAG (diagnostik koronar angiografiya)') required.push('angio_natija');
    }

    const errs = Utils.validate(this._data, required);
    let valid = true;
    for (const [key, msg] of Object.entries(errs)) {
      valid = false;
      const el = document.getElementById(key);
      if (el) { el.classList.add('border-red-500'); el.focus(); }
      else if (key === 'jins') showToast('Jinsini tanlang', 'warning');
      else if (key === 'ekg_natija') showToast('EKG natijasini tanlang', 'warning');
      const errEl = document.getElementById('err-'+key);
      if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
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
    // Qabul vaqti — soat ham kiritilishi shart
    if (this._step === 0 && this._data.qabul_vaqt) {
      const hasTime = v => v && v.includes('T') && v.split('T')[1] && v.split('T')[1] !== '--:--';
      if (!hasTime(this._data.qabul_vaqt)) {
        valid = false;
        const el = document.getElementById('qabul_vaqt');
        if (el) { el.classList.add('border-red-500'); el.focus(); }
        showToast('⚠️ Qabul vaqti: sana bilan birga soatni ham kiriting!', 'error', 5000);
      }
    }
    // Qabul vaqti kelajakda bo'lmasligi kerak
    if (this._step === 0 && this._data.qabul_vaqt) {
      const qv = new Date(this._data.qabul_vaqt);
      if (qv > new Date()) {
        valid = false;
        const el = document.getElementById('qabul_vaqt');
        if (el) { el.classList.add('border-red-500'); el.focus(); }
        showToast('⚠️ Qabul vaqti kelajakda bo\'lishi mumkin emas!', 'error', 5000);
        const errEl = document.getElementById('err-qabul_vaqt');
        if (errEl) { errEl.textContent = 'Kelajak sana kiritilgan — iltimos to\'g\'irlang'; errEl.classList.remove('hidden'); }
      }
    }
    if (this._step === 2 && valid) {
      if (!this._data.xavf_omil || this._data.xavf_omil.length === 0) {
        valid = false;
        showToast('Xavf omillarini belgilang (kamida bittasini)', 'warning');
      }
    }
    if (this._step === 2 && valid && this._data.infarkt_turi === "O'KS ST elevatsiyasiz (NSTEMI)") {
      if (!this._data.grace_bali) {
        valid = false;
        showToast("⚠️ NSTEMI tashxisi uchun GRACE Score hisoblang!", 'warning');
      }
    }
    // Step 3: vaqt mezonlari validatsiyasi
    if (this._step === 3) {
      const now = new Date();
      const qv = (() => { try { return this._data.qabul_vaqt ? new Date(this._data.qabul_vaqt + (this._data.qabul_vaqt.includes('T') ? ':00+05:00' : '')) : null; } catch(e) { return null; } })();
      const muolaja = this._data.muolaja_turi || '';
      const isTLT = muolaja.toLowerCase().includes('tlt') || muolaja.toLowerCase().includes('trombolit');
      const isPCI = muolaja.toLowerCase().includes('pci') || muolaja.toLowerCase().includes('angioplast') || muolaja.toLowerCase().includes('stent') || muolaja.toLowerCase().includes('groin') || muolaja.toLowerCase().includes('kag');

      // TLT vaqti majburiy (TLT muolajasi tanlanganda)
      if (isTLT && !this._data.tlt_vaqt) {
        const sana = document.getElementById('tlt_sana')?.value;
        const soat = document.getElementById('tlt_soat')?.value;
        if (!sana) {
          valid = false;
          document.getElementById('tlt_sana')?.classList.add('border-red-500');
          document.getElementById('tlt_sana')?.focus();
          showToast('⚠️ TLT sanasini kiriting!', 'error', 5000);
        } else if (!soat) {
          valid = false;
          document.getElementById('tlt_soat')?.classList.add('border-red-500');
          document.getElementById('tlt_soat')?.focus();
          showToast('⚠️ TLT soatini kiriting!', 'error', 5000);
        } else {
          valid = false;
          showToast('⚠️ TLT vaqtini kiriting!', 'error', 5000);
        }
      } else if (this._data.tlt_vaqt) {
        const tv = new Date(this._data.tlt_vaqt + ':00+05:00');
        if (tv > now) {
          valid = false;
          const el = document.getElementById('tlt_vaqt');
          if (el) { el.classList.add('border-red-500'); el.focus(); }
          showToast('⚠️ TLT vaqti kelajakda bo\'lishi mumkin emas!', 'error', 5000);
        } else if (qv && tv < qv) {
          valid = false;
          const el = document.getElementById('tlt_vaqt');
          if (el) { el.classList.add('border-red-500'); el.focus(); }
          showToast('⚠️ TLT vaqti bemor qabul vaqtidan oldin bo\'lishi mumkin emas!', 'error', 5000);
        }
      }

      // PCI vaqti majburiy (PCI/KAG muolajasi tanlanganda)
      if (isPCI && !this._data.pci_vaqt) {
        const sana = document.getElementById('pci_sana')?.value;
        const soat = document.getElementById('pci_soat')?.value;
        if (!sana) {
          valid = false;
          document.getElementById('pci_sana')?.classList.add('border-red-500');
          document.getElementById('pci_sana')?.focus();
          showToast('⚠️ PCI/KAG sanasini kiriting!', 'error', 5000);
        } else if (!soat) {
          valid = false;
          document.getElementById('pci_soat')?.classList.add('border-red-500');
          document.getElementById('pci_soat')?.focus();
          showToast('⚠️ PCI/KAG soatini kiriting!', 'error', 5000);
        } else {
          valid = false;
          showToast('⚠️ PCI/Groin vaqtini kiriting!', 'error', 5000);
        }
      } else if (this._data.pci_vaqt) {
        const pv = new Date(this._data.pci_vaqt + ':00+05:00');
        if (pv > now) {
          valid = false;
          document.getElementById('pci_sana')?.classList.add('border-red-500');
          showToast('⚠️ PCI vaqti kelajakda bo\'lishi mumkin emas!', 'error', 5000);
        } else if (qv && pv < qv) {
          valid = false;
          document.getElementById('pci_sana')?.classList.add('border-red-500');
          showToast('⚠️ PCI vaqti bemor qabul vaqtidan oldin bo\'lishi mumkin emas!', 'error', 5000);
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
    if (!this.validateStep()) return;
    const btn = document.getElementById('save-btn');
    setLoading(btn, true);
    try {
      const payload = { ...this._data };
      if (payload.muassasa === 'Boshqa' && payload.boshqa_muassasa) {
        payload.muassasa = payload.boshqa_muassasa;
      }
      delete payload.boshqa_muassasa;
      if (payload.muolaja_turi === "Boshqa muassasaga o'tkazildi") {
        payload.status = 'otkazildi';
      }
      // datetime-local qiymatlari Toshkent vaqti (UTC+5) — bazaga UTC ISO sifatida yuboramiz
      for (const f of ['qabul_vaqt', 'tlt_vaqt', 'pci_vaqt', 'tez_yordam_kelgan_vaqt']) {
        if (payload[f]) payload[f] = new Date(payload[f] + ':00+05:00').toISOString();
      }

      // FIO ni normalize qil: KARIMOV JASUR → Karimov Jasur
      if (payload.fio) payload.fio = Utils.toTitleCase(payload.fio);
      if (payload.shifokor_fio) payload.shifokor_fio = Utils.toTitleCase(payload.shifokor_fio);

      // Duplikat tekshiruv — bir xil bemor (F.I.O + tug'ilgan yili + qabul sanasi) bazada bormi?
      const dup = await DB.checkDuplicate('infarkt_qabul', payload.fio, payload.tugilgan_yil, payload.qabul_vaqt);
      if (dup) {
        showToast(`❌ Bu bemor allaqachon ro'yxatda: ${dup.fio} · ${dup.muassasa} · K/T: ${dup.kt_no}`, 'error', 8000);
        setLoading(btn, false);
        return;
      }

      const saved = await DB.infarktQabul(payload);
      Telegram.notify(saved, 'infarkt').catch(() => {});
      const isOtk = payload.status === 'otkazildi';
      showToast(isOtk ? `✅ Bemor ${payload.otkazilgan_muassasa || 'boshqa muassasa'}ga o'tkazildi!` : '🎉 Bemor muvaffaqiyatli saqlandi!', 'success');
      setTimeout(() => Router.go('dashboard'), 1500);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  }
};
