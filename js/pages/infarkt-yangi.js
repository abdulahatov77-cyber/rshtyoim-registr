// ==================== INFARKT YANGI BEMOR SAHIFASI ====================
const InfarktYangiPage = {
  _step: 0,
  _data: {},
  STEPS: ['Muassasa', 'Klinik holat', 'Xavf omillari', 'Diagnoz', 'Qo\'shimcha'],

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    InfarktYangiPage._profile = profile;
    InfarktYangiPage._step = 0;
    InfarktYangiPage._data = {
      kt_no: Utils.generateKtNo(),
      qabul_vaqt: Utils.formatDateInput(new Date()),
      viloyat: profile?.role === 'admin' ? '' : (profile?.viloyat || '')
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
    
    const sectionIcons = ['building-2', 'activity', 'alert-triangle', 'pill', 'file-text'];
    const sectionTitles = [
      'Muassasa va bemor ma\'lumotlari',
      'Klinik holat',
      'Xavf omillari',
      'Diagnoz va davolash',
      'Qo\'shimcha ma\'lumotlar'
    ];

    wrap.innerHTML = `
      <div class="max-w-4xl mx-auto animate-fadein">
        <!-- Progress -->
        ${Components.renderSteps(InfarktYangiPage.STEPS, step)}

        <div class="card border-t-4 border-t-[#EF4444] shadow-lg">
          <div class="card-header bg-gray-50 border-b border-gray-100 flex items-center justify-between !mb-0 p-5">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-red-100 text-[#EF4444] rounded-xl flex items-center justify-center">
                ${icon(sectionIcons[step], 24)}
              </div>
              <div>
                <h3 class="card-title !mb-0 text-gray-900">${sectionTitles[step]}</h3>
                <div class="text-xs text-gray-500 font-medium mt-1">Qadam ${step+1} / ${InfarktYangiPage.STEPS.length}</div>
              </div>
            </div>
          </div>
          
          <div class="card-body p-6" id="step-body">
            ${InfarktYangiPage['renderStep' + step]()}
          </div>
          
          <div class="p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl flex justify-between items-center">
            <button class="btn btn-secondary flex items-center gap-2" onclick="InfarktYangiPage.prevStep()" ${step===0?'disabled':''}>
              ${icon('arrow-left', 16)} Orqaga
            </button>
            <div class="flex gap-3">
              <button class="btn btn-secondary hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors" onclick="Router.go('dashboard')">Bekor qilish</button>
              ${step < InfarktYangiPage.STEPS.length-1
                ? `<button class="btn btn-infarkt flex items-center gap-2 px-6" onclick="InfarktYangiPage.nextStep()">Keyingi ${icon('arrow-right', 16)}</button>`
                : `<button class="btn btn-success flex items-center gap-2 px-6 shadow-md" id="save-btn" onclick="InfarktYangiPage.save()">${icon('save', 16)} Saqlash</button>`
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

  toggleCheckbox(el) {
    const parent = el.closest('label');
    const isSel = el.checked;
    parent.className = \`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all \${isSel ? 'border-red-500 bg-red-50 text-red-700 font-medium shadow-sm' : 'border-gray-200 hover:border-red-300 hover:bg-gray-50 text-gray-600'}\`;
    const box = parent.querySelector('div');
    box.className = \`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors \${isSel ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white'}\`;
    box.innerHTML = isSel ? icon('check', 14) : '';
  },

  renderStep0() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('viloyat','Viloyat',`<select id="viloyat" class="form-select" ${InfarktYangiPage._profile?.role !== 'admin' ? 'disabled' : ''}><option value="">Tanlang...</option>
          ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.viloyat===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}
        ${this.field('muassasa','Muassasa to\'liq nomi',`<input id="muassasa" class="form-input" value="${d.muassasa||''}" placeholder="Muassasa nomini kiriting"/>`,true)}
        
        <div class="col-span-1 sm:col-span-2 my-2 border-t border-dashed border-gray-200"></div>

        ${this.field('kt_no','Kasallik tarixi №',`<input id="kt_no" class="form-input font-mono bg-gray-50" value="${d.kt_no||''}" placeholder="KT-YYYYMMDD-0000"/>`,true,'Avtomatik yaratiladi, o\'zgartirishingiz mumkin')}
        ${this.field('qabul_vaqt','Qabul qilgan sana va vaqt',`<input id="qabul_vaqt" type="datetime-local" class="form-input" value="${d.qabul_vaqt||''}"/>`,true)}
        
        <div class="col-span-1 sm:col-span-2 my-2 border-t border-dashed border-gray-200"></div>

        ${this.field('murojaat_yoli','Murojaat yo\'li',`<select id="murojaat_yoli" class="form-select">
          ${this.selectOptions(APP_CONFIG.MUROJAAT_YOLLARI, d.murojaat_yoli||'')}</select>`,true)}
        ${this.field('yuborgan_muassasa','Yuborgan muassasa nomi',`<input id="yuborgan_muassasa" class="form-input" value="${d.yuborgan_muassasa||''}" placeholder="Boshqa muassasadan bo'lsa kiriting"/>`)}
        
        <div class="col-span-1 sm:col-span-2 my-2 border-t border-dashed border-gray-200"></div>

        ${this.field('fio','Bemor F.I.O',`<input id="fio" class="form-input" value="${d.fio||''}" placeholder="Familiya Ism Otasining ismi"/>`,true)}
        ${this.field('tugilgan_yil','Tug\'ilgan yili',`<input id="tugilgan_yil" class="form-input" value="${d.tugilgan_yil||''}" placeholder="Masalan: 1975" type="number" maxlength="4"/>`,true)}
        
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
    `;
  },

  renderStep1() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('simptom_vaqt','Simptomlar qachon boshlangan?',`<select id="simptom_vaqt" class="form-select">
          ${this.selectOptions(APP_CONFIG.SIMPTOM_VAQTLAR, d.simptom_vaqt||'')}</select>`,true)}
        ${this.field('asosiy_simptom','Asosiy simptom',`<input id="asosiy_simptom" class="form-input" value="${d.asosiy_simptom||''}" placeholder="Masalan: Ko'krak og'rig'i, nafas qisilishi..."/>`)}
        ${this.field('qon_bosimi','Qon bosimi (qabul paytida)',`<input id="qon_bosimi" class="form-input font-mono" value="${d.qon_bosimi||''}" placeholder="140/90"/>`,true)}
      </div>
      
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('ekg_natija','EKG natijasi (bir nechta tanlash mumkin)',
          this.checkboxGroup('ekg_natija', APP_CONFIG.EKG_NATIJALARI, d.ekg_natija||[]))}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-6 border-t border-dashed border-gray-200 pt-4">
        ${this.field('troponin','Troponin natijasi',`<select id="troponin" class="form-select">
          ${this.selectOptions(['Yuqori','Normal','O\'lchilmagan'], d.troponin||'')}</select>`)}
        ${this.field('kkfmb','KFK-MB natijasi',`<select id="kkfmb" class="form-select">
          ${this.selectOptions(['Yuqori','Normal','O\'lchilmagan'], d.kkfmb||'')}</select>`)}
      </div>
    `;
  },

  renderStep2() {
    const d = InfarktYangiPage._data;
    return `
      <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 text-amber-800">
        ${icon('info', 24)}
        <div>Bemor anamnezida mavjud bo'lgan barcha xavf omillarini belgilang. Bir nechta tanlash mumkin.</div>
      </div>
      ${this.checkboxGroup('xavf_omillari', APP_CONFIG.XAVF_OMILLARI, d.xavf_omillari||[])}
    `;
  },

  renderStep3() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('infarkt_turi','Infarkt turi',`<select id="infarkt_turi" class="form-select border-red-300 focus:border-red-500">
          ${this.selectOptions(APP_CONFIG.INFARKT_TURLARI, d.infarkt_turi||'')}</select>`,true)}
        ${this.field('killip','Killip klassifikatsiyasi',`<select id="killip" class="form-select">
          ${this.selectOptions(APP_CONFIG.KILLIP, d.killip||'')}</select>`,true)}
      </div>
      
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('muolaja_turi','Bajarilgan muolaja turi',`<select id="muolaja_turi" class="form-select border-blue-300 focus:border-blue-500">
          ${this.selectOptions(APP_CONFIG.INFARKT_MUOLAJALARI, d.muolaja_turi||'')}</select>`,true)}
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 mt-4">
        ${this.field('tlt_vaqt','TLT qilingan bo\'lsa (vaqti)',`<input id="tlt_vaqt" type="datetime-local" class="form-input" value="${d.tlt_vaqt||''}"/>`)}
        ${this.field('pci_vaqt','PCI (Stentlash) qilingan bo\'lsa (vaqti)',`<input id="pci_vaqt" type="datetime-local" class="form-input" value="${d.pci_vaqt||''}"/>`)}
      </div>
    `;
  },

  renderStep4() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('asoratlar','Kuzatilgan asoratlar',`<input id="asoratlar" class="form-input" value="${d.asoratlar||''}" placeholder="Kardiogen shok, aritmiya..."/>`)}
        ${this.field('status','Bemorni joriy holati',`<select id="status" class="form-select font-bold">
          ${this.selectOptions(['active','chiqarildi','vafot','otkazildi'], d.status||'active')}</select>`,true)}
      </div>
      <div class="mt-4">
        ${this.field('qoshimcha','Qo\'shimcha izoh yoki eslatma',`<textarea id="qoshimcha" class="form-textarea" placeholder="Boshqa muhim ma'lumotlar...">${d.qoshimcha||''}</textarea>`)}
      </div>
    `;
  },

  saveCurrentStep() {
    const wrap = document.getElementById('step-body');
    if (!wrap) return;
    
    ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli','yuborgan_muassasa','fio','tugilgan_yil','simptom_vaqt','asosiy_simptom','qon_bosimi','troponin','kkfmb','infarkt_turi','killip','muolaja_turi','tlt_vaqt','pci_vaqt','asoratlar','status','qoshimcha']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) InfarktYangiPage._data[id] = el.value;
    });

    const jinsEl = document.querySelector('input[name="jins"]:checked');
    if (jinsEl) InfarktYangiPage._data.jins = jinsEl.value;

    ['ekg_natija', 'xavf_omillari'].forEach(name => {
      const els = document.querySelectorAll(\`input[name="\${name}"]:checked\`);
      if (els.length > 0) InfarktYangiPage._data[name] = Array.from(els).map(e=>e.value);
    });
  },

  validateStep() {
    this.saveCurrentStep();
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('border-red-500'));
    document.querySelectorAll('.form-error-msg').forEach(el => { el.textContent=''; el.classList.add('hidden'); });

    let required = [];
    if (this._step === 0) required = ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli','fio','tugilgan_yil','jins'];
    if (this._step === 1) required = ['simptom_vaqt','qon_bosimi'];
    if (this._step === 3) required = ['infarkt_turi','killip','muolaja_turi'];
    if (this._step === 4) required = ['status'];

    const errs = Utils.validate(this._data, required);
    let valid = true;
    for (const [key, msg] of Object.entries(errs)) {
      valid = false;
      const el = document.getElementById(key);
      if (el) {
        el.classList.add('border-red-500');
        el.focus();
      } else if (key === 'jins') {
        showToast('Jinsini tanlang', 'warning');
      }
      const errEl = document.getElementById('err-'+key);
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
    const btn = document.getElementById('save-btn');
    setLoading(btn, true);
    try {
      await DB.addInfarkt(this._data);
      showToast('🎉 Bemor muvaffaqiyatli saqlandi!', 'success');
      setTimeout(() => Router.go('dashboard'), 1500);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  }
};
