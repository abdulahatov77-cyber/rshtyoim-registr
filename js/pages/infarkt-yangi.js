// ==================== INFARKT YANGI BEMOR SAHIFASI ====================
const InfarktYangiPage = {
  _step: 0,
  _data: {},
  STEPS: ['Muassasa', 'Bemor', 'Klinik', 'Muolaja', 'Shifokor'],

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
    const sectionIcons = ['building-2', 'user', 'activity', 'pill', 'stethoscope'];
    const sectionTitles = [
      '1-BO\'LIM: Muassasa ma\'lumotlari',
      '2-BO\'LIM: Bemor ma\'lumotlari',
      '3-BO\'LIM: Klinik ma\'lumotlar',
      '4-BO\'LIM: Muolaja',
      '5-BO\'LIM: Shifokor ma\'lumotlari'
    ];

    wrap.innerHTML = `
      <div class="max-w-4xl mx-auto animate-fadein">
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
        ${this.field('viloyat','Viloyat / Shahar',`<select id="viloyat" class="form-select" onchange="InfarktYangiPage.onViloyatChange(this.value)" ${InfarktYangiPage._profile?.role !== 'admin' ? 'disabled' : ''}><option value="">Tanlang...</option>
          ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.viloyat===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}
        ${this.field('muassasa','Muassasa',`<select id="muassasa" class="form-select"><option value="">Tanlang...</option>${(APP_CONFIG.MUASSASALAR[d.viloyat]||[]).map(m=>`<option value="${m}" ${d.muassasa===m?'selected':''}>${m}</option>`).join('')}</select>`,true)}
        ${this.field('kt_no','Kasallik tarixi №',`<input id="kt_no" class="form-input font-mono bg-gray-50" value="${d.kt_no||''}"/>`,true,'Avtomatik yaratiladi')}
        ${this.field('qabul_vaqt','Bemor qabul qilingan sana va vaqt',`<input id="qabul_vaqt" type="datetime-local" class="form-input" value="${d.qabul_vaqt||''}"/>`,true)}
        <div class="col-span-1 sm:col-span-2">
          ${this.field('murojaat_yoli','Murojaat yo\'li',`<select id="murojaat_yoli" class="form-select" onchange="InfarktYangiPage.onMurojaatChange(this.value)">
            ${this.selectOptions(APP_CONFIG.MUROJAAT_YOLLARI, d.murojaat_yoli||'')}</select>`,true)}
        </div>
        <div class="col-span-1 sm:col-span-2" id="yuborgan-div" style="display:${d.murojaat_yoli==='Boshqa muassasadan'?'block':'none'}">
          ${this.field('yuborgan_muassasa','Yuborgan muassasa nomi',`<input id="yuborgan_muassasa" class="form-input" value="${d.yuborgan_muassasa||''}" placeholder="Muassasa nomini kiriting"/>`)}
        </div>
      </div>
    `;
  },

  onMurojaatChange(val) {
    InfarktYangiPage._data.murojaat_yoli = val;
    const div = document.getElementById('yuborgan-div');
    if (div) div.style.display = val === 'Boshqa muassasadan' ? 'block' : 'none';
  },

  onViloyatChange(val) {
    InfarktYangiPage._data.viloyat = val;
    InfarktYangiPage._data.muassasa = '';
    const sel = document.getElementById('muassasa');
    if (!sel) return;
    const list = APP_CONFIG.MUASSASALAR[val] || [];
    sel.innerHTML = `<option value="">Tanlang...</option>` +
      list.map(m => `<option value="${m}">${m}</option>`).join('');
  },

  // ============ 2-BO'LIM: Bemor ============
  renderStep1() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('fio','Bemor F.I.O',`<input id="fio" class="form-input" value="${d.fio||''}" placeholder="Familiya Ism Otasining ismi"/>`,true)}
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
        ${this.field('aha_bali','AHA (American Heart Association) savolnomasi bali',`<input id="aha_bali" type="number" class="form-input" value="${d.aha_bali||''}" placeholder="Ballarni kiriting"/>`)}
        ${this.field('simptom_vaqt','Simptomlar qachon boshlangan?',`<select id="simptom_vaqt" class="form-select">
          ${this.selectOptions(APP_CONFIG.SIMPTOM_VAQTLAR, d.simptom_vaqt||'')}</select>`,true)}
        ${this.field('birlamchi_yoki_takroriy','Birlamchi yoki takroriy?',`<select id="birlamchi_yoki_takroriy" class="form-select">
          ${this.selectOptions(APP_CONFIG.BIRLAMCHI_TAKROIRIY, d.birlamchi_yoki_takroriy||'')}</select>`,true)}
        ${this.field('infarkt_turi','Tashxis',`<select id="infarkt_turi" class="form-select border-red-300 focus:border-red-500">
          ${this.selectOptions(APP_CONFIG.INFARKT_TURLARI, d.infarkt_turi||'')}</select>`,true)}
        ${this.field('killip','Killip klassifikatsiyasi',`<select id="killip" class="form-select">
          ${this.selectOptions(APP_CONFIG.KILLIP_KLASSLAR, d.killip||'')}</select>`,true)}
        ${this.field('qon_bosimi','Qon bosimi (qabul paytida)',`<input id="qon_bosimi" class="form-input font-mono" value="${d.qon_bosimi||''}" placeholder="140/90"/>`,true)}
        ${this.field('puls','Puls (qabul paytida)',`<input id="puls" class="form-input" value="${d.puls||''}" placeholder="Masalan: 76"/>`,true)}
        ${this.field('ekg_vaqti','EKG o\'tkazilgan vaqt',`<input id="ekg_vaqti" type="time" class="form-input" value="${d.ekg_vaqti||''}"/>`,true)}
        ${this.field('troponin','Troponin natijasi',`<select id="troponin" class="form-select">
          ${this.selectOptions(['Normal','Yuqori','O\'lchanmagan'], d.troponin||'')}</select>`,true)}
        ${this.field('kkfmb','KFK-MB natijasi',`<select id="kkfmb" class="form-select">
          ${this.selectOptions(['Normal','Yuqori','O\'lchanmagan'], d.kkfmb||'')}</select>`,true)}
        ${this.field('ejeksiya_fraksiyasi','Exokardiografiya (EF - Ejeksiya fraksiyasi %)',`<input id="ejeksiya_fraksiyasi" type="number" class="form-input" value="${d.ejeksiya_fraksiyasi||''}" placeholder="Masalan: 55"/>`)}
      </div>
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('ekg_natija','EKG natijasi',
          this.checkboxGroup('ekg_natija', APP_CONFIG.EKG_NATIJALARI, d.ekg_natija||[]))}
      </div>
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('xavf_omillari','Xavf omillari (bir nechta tanlash mumkin)',
          this.checkboxGroup('xavf_omillari', APP_CONFIG.XAVF_OMILLAR_INFARKT, d.xavf_omillari||[]))}
      </div>
    `;
  },

  // ============ 4-BO'LIM: Muolaja ============
  renderStep3() {
    const d = InfarktYangiPage._data;
    const muolaja = d.muolaja_turi || '';
    const showAngio = muolaja === 'Faqat KAG (diagnostik koronar angiografiya)';
    const showOtkazilgan = muolaja === 'Boshqa muassasaga o\'tkazildi';

    return `
      <div class="grid grid-cols-1 gap-x-6">
        ${this.field('muolaja_turi','Bajarilgan muolaja turi',`<select id="muolaja_turi" class="form-select border-blue-300 focus:border-blue-500" onchange="InfarktYangiPage.onMuolajaChange(this.value)">
          ${this.selectOptions(APP_CONFIG.INFARKT_MUOLAJALARI, muolaja)}</select>`,true)}
        
        <div id="angio-div" style="display:${showAngio?'block':'none'}">
          ${this.field('angio_natija','Diagnostik koronar angiografiya natijasi',`<select id="angio_natija" class="form-select">
            ${this.selectOptions(APP_CONFIG.ANGIO_NATIJALARI, d.angio_natija||'')}</select>`)}
        </div>

        <div id="otkazilgan-div" style="display:${showOtkazilgan?'block':'none'}">
          ${this.field('otkazilgan_muassasa','O\'tkazilgan muassasa nomi',`<input id="otkazilgan_muassasa" class="form-input" value="${d.otkazilgan_muassasa||''}" placeholder="Muassasa nomini kiriting"/>`)}
        </div>

        <div class="mt-2 border-t border-dashed border-gray-200 pt-4">
          ${this.field('asoratlar','Kuzatilgan asoratlar', this.checkboxGroup('asoratlar', APP_CONFIG.ASORATLAR_INFARKT, d.asoratlar||[]))}
        </div>
        <div class="mt-4">
          ${this.field('status','Bemorni joriy holati',`<select id="status" class="form-select font-bold">
            ${this.selectOptions(['active','chiqarildi','vafot','otkazildi'], d.status||'active')}</select>`,true)}
        </div>
        <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
          <div class="form-group">
            <label class="form-label">Dinamikada bajarilgan muolaja turi</label>
            <div class="grid grid-cols-1 gap-2 mt-2">
              ${APP_CONFIG.DINAMIKA_MUOLAJALAR.map(item => {
                const isSel = (d.dinamika_muolaja_turi || '') === item;
                return `
                  <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSel ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-600'}">
                    <input type="radio" name="dinamika_muolaja_turi" value="${item}" class="w-4 h-4 text-blue-600" ${isSel?'checked':''} onchange="InfarktYangiPage.saveCurrentStep()">
                    <span class="text-sm">${item}</span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        </div>
        <div class="mt-4">
          ${this.field('dinamika_izoh','Izoh — Dinamikada muolaja o\'zgarishi sababi',`<textarea id="dinamika_izoh" class="form-textarea" rows="3" placeholder="Dinamikada muolaja o'zgarishi sababi...">${d.dinamika_izoh||''}</textarea>`)}
        </div>
        <div class="mt-2">
          ${this.field('qoshimcha','Qo\'shimcha izoh yoki eslatma',`<textarea id="qoshimcha" class="form-textarea" placeholder="Boshqa muhim ma'lumotlar...">${d.qoshimcha||''}</textarea>`)}
        </div>
      </div>
    `;
  },

  onMuolajaChange(val) {
    InfarktYangiPage._data.muolaja_turi = val;
    const angioDiv = document.getElementById('angio-div');
    const otkazDiv = document.getElementById('otkazilgan-div');
    if (angioDiv) angioDiv.style.display = val === 'Faqat KAG (diagnostik koronar angiografiya)' ? 'block' : 'none';
    if (otkazDiv) otkazDiv.style.display = val === "Boshqa muassasaga o'tkazildi" ? 'block' : 'none';
  },

  // ============ 5-BO'LIM: Shifokor ============
  renderStep4() {
    const d = InfarktYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('shifokor_fio','Ushbu formani to\'ldiruvchi shifokor F.I.O',`<input id="shifokor_fio" class="form-input" value="${d.shifokor_fio||''}" placeholder="Familiya Ism Otasining ismi"/>`,true)}
      </div>
      <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
        ${icon('check-circle', 24, 'text-green-500 flex-shrink-0 mt-0.5')}
        <div>
          <div class="font-semibold text-green-800">Saqlashga tayyor</div>
          <div class="text-sm text-green-700 mt-1">Barcha ma'lumotlarni tekshirib chiqing va "Saqlash" tugmasini bosing.</div>
        </div>
      </div>
    `;
  },

  saveCurrentStep() {
    const wrap = document.getElementById('step-body');
    if (!wrap) return;

    ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli','yuborgan_muassasa',
     'fio','tugilgan_sana','aha_bali','simptom_vaqt','birlamchi_yoki_takroriy',
     'infarkt_turi','killip','qon_bosimi','puls','ekg_vaqti','troponin','kkfmb',
     'ejeksiya_fraksiyasi','muolaja_turi','angio_natija','otkazilgan_muassasa',
     'dinamika_izoh','status','qoshimcha','shifokor_fio']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) InfarktYangiPage._data[id] = el.value;
    });

    const jinsEl = document.querySelector('input[name="jins"]:checked');
    if (jinsEl) InfarktYangiPage._data.jins = jinsEl.value;

    const dinamikaEl = document.querySelector('input[name="dinamika_muolaja_turi"]:checked');
    if (dinamikaEl) InfarktYangiPage._data.dinamika_muolaja_turi = dinamikaEl.value;

    ['ekg_natija', 'xavf_omillari', 'asoratlar'].forEach(name => {
      const els = document.querySelectorAll(`input[name="${name}"]:checked`);
      InfarktYangiPage._data[name] = Array.from(els).map(e=>e.value);
    });
  },

  validateStep() {
    this.saveCurrentStep();
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('border-red-500'));
    document.querySelectorAll('.form-error-msg').forEach(el => { el.textContent=''; el.classList.add('hidden'); });

    let required = [];
    if (this._step === 0) required = ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli'];
    if (this._step === 1) required = ['fio','tugilgan_sana','jins'];
    if (this._step === 2) required = ['simptom_vaqt','birlamchi_yoki_takroriy','infarkt_turi','killip','qon_bosimi','puls','ekg_vaqti','troponin','kkfmb'];
    if (this._step === 3) required = ['muolaja_turi','status'];
    if (this._step === 4) required = ['shifokor_fio'];

    const errs = Utils.validate(this._data, required);
    let valid = true;
    for (const [key, msg] of Object.entries(errs)) {
      valid = false;
      const el = document.getElementById(key);
      if (el) { el.classList.add('border-red-500'); el.focus(); }
      else if (key === 'jins') showToast('Jinsini tanlang', 'warning');
      const errEl = document.getElementById('err-'+key);
      if (errEl) { errEl.textContent = msg; errEl.classList.remove('hidden'); }
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
      await DB.infarktQabul(this._data);
      showToast('🎉 Bemor muvaffaqiyatli saqlandi!', 'success');
      setTimeout(() => Router.go('dashboard'), 1500);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  }
};
