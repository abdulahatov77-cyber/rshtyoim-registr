// ==================== INSULT YANGI BEMOR SAHIFASI ====================
const InsultYangiPage = {
  _step: 0,
  _data: {},
  STEPS: ['Muassasa', 'Klinik holat', 'Xavf omillari', 'Muolaja'],

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    InsultYangiPage._profile = profile;
    InsultYangiPage._step = 0;
    InsultYangiPage._data = {
      kt_no: Utils.generateKtNo(),
      qabul_vaqt: Utils.formatDateInput(new Date()),
      viloyat: profile?.role === 'admin' ? '' : (profile?.viloyat || '')
    };
    document.getElementById('app').innerHTML = Components.renderLayout(
      'insult-yangi', 'Yangi Insult Bemori', 'Insult bemori qabul qilish formasi',
      `<div id="insult-form-wrap"></div>`, user
    );
    Components.startClock();
    InsultYangiPage.renderStep();
  },

  renderStep() {
    const step = InsultYangiPage._step;
    const wrap = document.getElementById('insult-form-wrap');
    
    const sectionIcons = ['building-2', 'activity', 'alert-triangle', 'pill'];
    const sectionTitles = [
      'Muassasa va bemor ma\'lumotlari',
      'Klinik holat',
      'Xavf omillari',
      'Muolaja va tekshiruvlar'
    ];

    wrap.innerHTML = `
      <div class="max-w-4xl mx-auto animate-fadein">
        <!-- Progress -->
        ${Components.renderSteps(InsultYangiPage.STEPS, step)}

        <div class="card border-t-4 border-t-[#8B5CF6] shadow-lg">
          <div class="card-header bg-gray-50 border-b border-gray-100 flex items-center justify-between !mb-0 p-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-purple-100 text-[#8B5CF6] rounded-xl flex items-center justify-center">
                ${icon(sectionIcons[step], 24)}
              </div>
              <div>
                <h3 class="card-title !mb-0 text-gray-900">${sectionTitles[step]}</h3>
                <div class="text-xs text-gray-500 font-medium mt-1">Qadam ${step+1} / ${InsultYangiPage.STEPS.length}</div>
              </div>
            </div>
          </div>
          
          <div class="card-body p-6" id="step-body">
            ${InsultYangiPage['renderStep' + step]()}
          </div>
          
          <div class="p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-between items-center">
            <button class="btn btn-secondary flex items-center gap-2" onclick="InsultYangiPage.prevStep()" ${step===0?'disabled':''}>
              ${icon('arrow-left', 16)} Orqaga
            </button>
            <div class="flex gap-3">
              <button class="btn btn-secondary hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors" onclick="Router.go('dashboard')">Bekor qilish</button>
              ${step < InsultYangiPage.STEPS.length-1
                ? `<button class="btn btn-insult flex items-center gap-2 px-6" onclick="InsultYangiPage.nextStep()">Keyingi ${icon('arrow-right', 16)}</button>`
                : `<button class="btn btn-success flex items-center gap-2 px-6 shadow-md" id="save-insult-btn" onclick="InsultYangiPage.save()">${icon('save', 16)} Saqlash</button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
    initIcons();
  },

  field(id, label, inputHtml, required = false, hint = '') {
    return InfarktYangiPage.field(id, label, inputHtml, required, hint);
  },

  selectOptions(arr, selected) {
    return InfarktYangiPage.selectOptions(arr, selected);
  },

  checkboxGroup(name, arr, selectedArr = []) {
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
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
    parent.className = \`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all \${isSel ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium shadow-sm' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-600'}\`;
    const box = parent.querySelector('div');
    box.className = \`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors \${isSel ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-300 bg-white'}\`;
    box.innerHTML = isSel ? icon('check', 14) : '';
  },

  renderStep0() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('i-viloyat','Viloyat',`<select id="i-viloyat" class="form-select" ${InsultYangiPage._profile?.role !== 'admin' ? 'disabled' : ''}><option value="">Tanlang...</option>
          ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.viloyat===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}
        ${this.field('i-muassasa','Muassasa to\'liq nomi',`<input id="i-muassasa" class="form-input" value="${d.muassasa||''}" placeholder="Muassasa nomini kiriting"/>`,true)}
        
        <div class="col-span-1 sm:col-span-2 my-2 border-t border-dashed border-gray-200"></div>

        ${this.field('i-kt_no','Kasallik tarixi №',`<input id="i-kt_no" class="form-input font-mono bg-gray-50" value="${d.kt_no||''}"/>`,true,'Avtomatik yaratiladi')}
        ${this.field('i-qabul_vaqt','Qabul qilgan sana va vaqt',`<input id="i-qabul_vaqt" type="datetime-local" class="form-input" value="${d.qabul_vaqt||''}"/>`,true)}
        
        <div class="col-span-1 sm:col-span-2 my-2 border-t border-dashed border-gray-200"></div>

        ${this.field('i-murojaat_yoli','Murojaat yo\'li',`<select id="i-murojaat_yoli" class="form-select">
          ${this.selectOptions(APP_CONFIG.MUROJAAT_YOLLARI, d.murojaat_yoli||'')}</select>`,true)}
        ${this.field('i-yuborgan_muassasa','Yuborgan muassasa nomi',`<input id="i-yuborgan_muassasa" class="form-input" value="${d.yuborgan_muassasa||''}" placeholder="Boshqa muassasadan bo'lsa kiriting"/>`)}
        
        <div class="col-span-1 sm:col-span-2 my-2 border-t border-dashed border-gray-200"></div>

        ${this.field('i-fio','Bemor F.I.O',`<input id="i-fio" class="form-input" value="${d.fio||''}" placeholder="Familiya Ism Otasining ismi"/>`,true)}
        ${this.field('i-tugilgan_yil','Tug\'ilgan yili',`<input id="i-tugilgan_yil" class="form-input" value="${d.tugilgan_yil||''}" placeholder="Masalan: 1975" type="number" maxlength="4"/>`,true)}
        
        ${this.field('i-jins','Jinsi',`
          <div class="flex gap-4 mt-1">
            <label class="flex-1 flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${d.jins==='Erkak'?'border-blue-500 bg-blue-50 text-blue-700':'border-gray-200 hover:bg-gray-50'}">
              <input type="radio" name="i-jins" value="Erkak" class="w-4 h-4 text-blue-600" ${d.jins==='Erkak'?'checked':''} onchange="InsultYangiPage.saveCurrentStep()"> 
              <span class="font-medium">Erkak</span>
            </label>
            <label class="flex-1 flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${d.jins==='Ayol'?'border-pink-500 bg-pink-50 text-pink-700':'border-gray-200 hover:bg-gray-50'}">
              <input type="radio" name="i-jins" value="Ayol" class="w-4 h-4 text-pink-600" ${d.jins==='Ayol'?'checked':''} onchange="InsultYangiPage.saveCurrentStep()"> 
              <span class="font-medium">Ayol</span>
            </label>
          </div>
        `,true)}
        ${this.field('i-simptom_vaqt','Simptomlar qachon boshlangan?',`<select id="i-simptom_vaqt" class="form-select">
          ${this.selectOptions(APP_CONFIG.SIMPTOM_VAQTLAR, d.simptom_vaqt||'')}</select>`,true)}
      </div>
    `;
  },

  renderStep1() {
    const d = InsultYangiPage._data;
    const isOgire = d.nihss_qabul >= 15;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('nihss_qabul','NIHSS bali (qabul paytida)',`<input id="nihss_qabul" type="number" class="form-input font-mono" value="${d.nihss_qabul??''}" min="0" max="42" placeholder="0–42" oninput="InsultYangiPage.saveCurrentStep(); document.getElementById('step-body').innerHTML=InsultYangiPage.renderStep1();"/>`,true,'0 dan 42 gacha')}
        ${this.field('gcs_qabul','Glazgo shkalasi (GCS)',`<input id="gcs_qabul" type="number" class="form-input font-mono" value="${d.gcs_qabul??''}" min="3" max="15" placeholder="3–15"/>`,true,'3 dan 15 gacha')}
        
        <div class="col-span-1 sm:col-span-2 my-2 border-t border-dashed border-gray-200"></div>

        ${this.field('i-qon_bosimi','Qon bosimi (qabul paytida)',`<input id="i-qon_bosimi" class="form-input font-mono" value="${d.qon_bosimi||''}" placeholder="Masalan: 160/100"/>`,true)}
        ${this.field('insult_turi','Insult turi',`<select id="insult_turi" class="form-select border-purple-300 focus:border-purple-500">
          ${this.selectOptions(APP_CONFIG.INSULT_TURLARI, d.insult_turi||'')}</select>`,true)}
      </div>
      
      <!-- NIHSS indicator -->
      <div class="mt-4 p-4 rounded-xl flex items-center gap-4 ${isOgire ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}">
        <div class="w-12 h-12 rounded-full flex items-center justify-center text-white ${isOgire ? 'bg-red-500' : 'bg-green-500'}">
          ${icon(isOgire ? 'alert-triangle' : 'check-circle', 24)}
        </div>
        <div>
          <div class="font-bold">NIHSS bali: ${d.nihss_qabul!=null && d.nihss_qabul!=='' ? d.nihss_qabul : 'Kiritilmagan'}</div>
          <div class="text-sm opacity-90">${d.nihss_qabul==null||d.nihss_qabul==='' ? 'Iltimos, balni kiriting' : isOgire ? 'Og\'ir holat (≥ 15)' : 'Normal yoki o\'rtacha'}</div>
        </div>
      </div>
    `;
  },

  renderStep2() {
    const d = InsultYangiPage._data;
    return `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 text-amber-800">
        ${icon('info', 24)}
        <div>Bemor anamnezida mavjud bo'lgan barcha xavf omillarini belgilang. Bir nechta tanlash mumkin.</div>
      </div>
      ${this.checkboxGroup('i-xavf_omillari', APP_CONFIG.INSULT_XAVF_OMILLARI, d.xavf_omillari||[])}
    `;
  },

  renderStep3() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border-b border-dashed border-gray-200 pb-4 mb-4">
        ${this.field('mskt','Bosh miya MSKT qilinganmi?',`<select id="mskt" class="form-select">
          ${this.selectOptions(['Ha','Yo\'q'], d.mskt||'')}</select>`)}
        ${this.field('i-tlt_vaqt','TLT (Trombolizis) qilingan vaqt',`<input id="i-tlt_vaqt" type="datetime-local" class="form-input" value="${d.tlt_vaqt||''}"/>`)}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('i-status','Bemorni joriy holati',`<select id="i-status" class="form-select font-bold">
          ${this.selectOptions(['active','chiqarildi','vafot','otkazildi'], d.status||'active')}</select>`,true)}
        ${this.field('i-qoshimcha','Qo\'shimcha izoh',`<textarea id="i-qoshimcha" class="form-textarea" placeholder="Boshqa muhim ma'lumotlar...">${d.qoshimcha||''}</textarea>`)}
      </div>
    `;
  },

  saveCurrentStep() {
    const wrap = document.getElementById('step-body');
    if (!wrap) return;

    ['i-viloyat','i-muassasa','i-kt_no','i-qabul_vaqt','i-murojaat_yoli','i-yuborgan_muassasa','i-fio','i-tugilgan_yil','i-simptom_vaqt','nihss_qabul','gcs_qabul','i-qon_bosimi','insult_turi','mskt','i-tlt_vaqt','i-status','i-qoshimcha']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        let key = id.replace('i-', '');
        let val = el.value;
        if (id === 'nihss_qabul' || id === 'gcs_qabul') val = val === '' ? null : Number(val);
        InsultYangiPage._data[key] = val;
      }
    });

    const jinsEl = document.querySelector('input[name="i-jins"]:checked');
    if (jinsEl) InsultYangiPage._data.jins = jinsEl.value;

    const riskEls = document.querySelectorAll('input[name="i-xavf_omillari"]:checked');
    if (riskEls.length > 0) {
      InsultYangiPage._data.xavf_omillari = Array.from(riskEls).map(e=>e.value);
    } else {
      InsultYangiPage._data.xavf_omillari = [];
    }
  },

  validateStep() {
    this.saveCurrentStep();
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('border-red-500'));
    document.querySelectorAll('.form-error-msg').forEach(el => { el.textContent=''; el.classList.add('hidden'); });

    let required = [];
    let d = this._data;
    let errs = {};

    if (this._step === 0) {
      required = ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli','fio','tugilgan_yil','jins','simptom_vaqt'];
      errs = Utils.validate(d, required);
    }
    if (this._step === 1) {
      required = ['qon_bosimi','insult_turi'];
      errs = Utils.validate(d, required);
      if (d.nihss_qabul === null || d.nihss_qabul === '') errs.nihss_qabul = "Majburiy maydon";
      else if (d.nihss_qabul < 0 || d.nihss_qabul > 42) errs.nihss_qabul = "0-42 oralig'ida bo'lishi kerak";
      if (d.gcs_qabul === null || d.gcs_qabul === '') errs.gcs_qabul = "Majburiy maydon";
      else if (d.gcs_qabul < 3 || d.gcs_qabul > 15) errs.gcs_qabul = "3-15 oralig'ida bo'lishi kerak";
    }
    if (this._step === 3) required = ['status'];
    if (this._step === 3) Object.assign(errs, Utils.validate(d, required));

    let valid = true;
    for (const [key, msg] of Object.entries(errs)) {
      valid = false;
      const elId = ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli','yuborgan_muassasa','fio','tugilgan_yil','simptom_vaqt','qon_bosimi','tlt_vaqt','status','qoshimcha','jins','xavf_omillari'].includes(key) ? 'i-'+key : key;
      const el = document.getElementById(elId);
      if (el) {
        el.classList.add('border-red-500');
        el.focus();
      } else if (key === 'jins') {
        showToast('Jinsini tanlang', 'warning');
      }
      const errEl = document.getElementById('err-'+elId);
      if (errEl) {
        errEl.textContent = msg;
        errEl.classList.remove('hidden');
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
    const btn = document.getElementById('save-insult-btn');
    setLoading(btn, true);
    try {
      await DB.addInsult(this._data);
      showToast('🎉 Bemor muvaffaqiyatli saqlandi!', 'success');
      setTimeout(() => Router.go('dashboard'), 1500);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  }
};
