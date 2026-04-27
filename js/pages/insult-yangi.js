// ==================== INSULT YANGI BEMOR SAHIFASI ====================
const InsultYangiPage = {
  _step: 0,
  _data: {},
  STEPS: ['Muassasa', 'Bemor', 'Klinik', 'Muolaja', 'Shifokor'],

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
      'insult-yangi', 'Yangi Insult Bemori', 'Bemor qabul qilish formasi',
      `<div id="insult-form-wrap"></div>`, user
    );
    Components.startClock();
    InsultYangiPage.renderStep();
  },

  renderStep() {
    const step = InsultYangiPage._step;
    const wrap = document.getElementById('insult-form-wrap');
    const sectionIcons = ['building-2', 'user', 'brain', 'pill', 'stethoscope'];
    const sectionTitles = [
      '1-BO\'LIM: Muassasa ma\'lumotlari',
      '2-BO\'LIM: Bemor ma\'lumotlari',
      '3-BO\'LIM: Klinik ma\'lumotlar',
      '4-BO\'LIM: Diagnostika va Muolaja',
      '5-BO\'LIM: Shifokor ma\'lumotlari'
    ];

    wrap.innerHTML = `
      <div class="max-w-4xl mx-auto animate-fadein">
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
                : `<button class="btn btn-success flex items-center gap-2 px-6 shadow-md" id="save-btn" onclick="InsultYangiPage.save()">${icon('save', 16)} Saqlash</button>`
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
        ${this.field('viloyat','Viloyat / Shahar',`<select id="viloyat" class="form-select" onchange="InsultYangiPage.onViloyatChange(this.value)" ${InsultYangiPage._profile?.role !== 'admin' ? 'disabled' : ''}><option value="">Tanlang...</option>
          ${APP_CONFIG.VILOYATLAR.map(v=>`<option value="${v}" ${d.viloyat===v?'selected':''}>${v}</option>`).join('')}</select>`,true)}
        ${this.field('muassasa','Muassasa',`<select id="muassasa" class="form-select"><option value="">Tanlang...</option>${(APP_CONFIG.MUASSASALAR[d.viloyat]||[]).map(m=>`<option value="${m}" ${d.muassasa===m?'selected':''}>${m}</option>`).join('')}</select>`,true)}
        ${this.field('kt_no','Kasallik tarixi №',`<input id="kt_no" class="form-input font-mono bg-gray-50" value="${d.kt_no||''}"/>`,true,'Avtomatik yaratiladi')}
        ${this.field('qabul_vaqt','Bemorni qabul qilgan sana va vaqt',`<input id="qabul_vaqt" type="datetime-local" class="form-input" value="${d.qabul_vaqt||''}"/>`,true)}
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
      </div>
    `;
  },

  onMurojaatChange(val) {
    InsultYangiPage._data.murojaat_yoli = val;
    const div = document.getElementById('yuborgan-div');
    if (div) div.style.display = val === 'Boshqa muassasadan' ? 'block' : 'none';
  },

  onViloyatChange(val) {
    InsultYangiPage._data.viloyat = val;
    InsultYangiPage._data.muassasa = '';
    const sel = document.getElementById('muassasa');
    if (!sel) return;
    const list = APP_CONFIG.MUASSASALAR[val] || [];
    sel.innerHTML = `<option value="">Tanlang...</option>` +
      list.map(m => `<option value="${m}">${m}</option>`).join('');
  },

  // ============ 2-BO'LIM: Bemor ============
  renderStep1() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('fio','Bemor F.I.O',`<input id="fio" class="form-input" value="${d.fio||''}" placeholder="Familiya Ism Otasining ismi"/>`,true)}
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
      </div>
    `;
  },

  // ============ 3-BO'LIM: Klinik ============
  renderStep2() {
    const d = InsultYangiPage._data;
    return `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
        ${this.field('simptom_vaqt','Simptomlar qachon boshlangan?',`<select id="simptom_vaqt" class="form-select">
          ${this.selectOptions(APP_CONFIG.SIMPTOM_VAQTLAR_INSULT, d.simptom_vaqt||'')}</select>`,true)}
        ${this.field('nihss_qabul','NIHSS qabul paytida (0–42 ball)',`<input id="nihss_qabul" type="number" min="0" max="42" class="form-input" value="${d.nihss_qabul||''}" placeholder="0 dan 42 gacha"/>`,true)}
        ${this.field('gcs_bali','Glazgo shkalasi (GCS), (3-15 ball)',`<input id="gcs_bali" type="number" min="3" max="15" class="form-input" value="${d.gcs_bali||''}" placeholder="3 dan 15 gacha"/>`,true)}
        ${this.field('insult_turi','Insult turi',`<select id="insult_turi" class="form-select border-purple-300 focus:border-purple-500">
          ${this.selectOptions(APP_CONFIG.INSULT_TURLARI, d.insult_turi||'')}</select>`,true)}
        ${this.field('qon_bosimi','Qon bosimi (qabul paytida)',`<input id="qon_bosimi" class="form-input font-mono" value="${d.qon_bosimi||''}" placeholder="140/90"/>`,true)}
      </div>
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('xavf_omillari','Xavf omillari',
          this.checkboxGroup('xavf_omillari', APP_CONFIG.XAVF_OMILLAR_INSULT, d.xavf_omillari||[]), true)}
      </div>
      <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
        ${this.field('aha_bali','AHA (American Heart Association) savolnomasi bali',`<input id="aha_bali" type="number" class="form-input" value="${d.aha_bali||''}" placeholder="Ballarni kiriting"/>`,true)}
      </div>
    `;
  },

  // ============ 4-BO'LIM: Diagnostika va Muolaja ============
  renderStep3() {
    const d = InsultYangiPage._data;
    const muolaja = d.muolaja_turi || '';
    const showOtkazilgan = muolaja === "Boshqa muassasaga o'tkazildi — angiografiya va endovaskulyar muolaja uchun";

    return `
      <div class="grid grid-cols-1 gap-x-6">

        ${this.field('mskt','MSKT o\'tkazilganmi?',`<select id="mskt" class="form-select">
          ${this.selectOptions(['Ha – o\'tkazildi', 'Yo\'q – boshqa sabab'], d.mskt||'')}</select>`,true)}

        ${this.field('muolaja_turi','Muolaja turi',`
          <div class="grid grid-cols-1 gap-2 mt-2">
            ${APP_CONFIG.INSULT_MUOLAJALARI.map(item => {
              const isSel = muolaja === item;
              return `
                <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSel ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium shadow-sm' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-600'}">
                  <input type="radio" name="muolaja_turi" value="${item}" class="w-4 h-4 text-purple-600" ${isSel?'checked':''} onchange="InsultYangiPage.onMuolajaChange('${item}')">
                  <span class="text-sm">${item}</span>
                </label>
              `;
            }).join('')}
          </div>
        `,true)}

        <div id="otkazilgan-div" style="display:${showOtkazilgan?'block':'none'}">
          ${this.field('otkazilgan_muassasa','Boshqa muassasa nomi',`<input id="otkazilgan_muassasa" class="form-input" value="${d.otkazilgan_muassasa||''}" placeholder="Muassasa nomini kiriting"/>`)}
        </div>

        <div class="mt-2">
          ${this.field('status','Bemorni joriy holati',`<select id="status" class="form-select font-bold">
            ${this.selectOptions(['active','chiqarildi','vafot','otkazildi'], d.status||'active')}</select>`,true)}
        </div>
        <div class="mt-4 border-t border-dashed border-gray-200 pt-4">
          <div class="form-group">
            <label class="form-label required">Dinamikada bajarilgan muolaja turi</label>
            <div class="grid grid-cols-1 gap-2 mt-2">
              ${APP_CONFIG.DINAMIKA_MUOLAJALAR_INSULT.map(item => {
                const isSel = (d.dinamika_muolaja_turi || '') === item;
                return `
                  <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${isSel ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium shadow-sm' : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50 text-gray-600'}">
                    <input type="radio" name="dinamika_muolaja_turi" value="${item}" class="w-4 h-4 text-purple-600" ${isSel?'checked':''} onchange="InsultYangiPage.saveCurrentStep()">
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
    InsultYangiPage._data.muolaja_turi = val;
    const otkazDiv = document.getElementById('otkazilgan-div');
    if (otkazDiv) otkazDiv.style.display = val === "Boshqa muassasaga o'tkazildi — angiografiya va endovaskulyar muolaja uchun" ? 'block' : 'none';
  },

  // ============ 5-BO'LIM: Shifokor ============
  renderStep4() {
    const d = InsultYangiPage._data;
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
     'fio','simptom_vaqt','gcs_bali','insult_turi','qon_bosimi','aha_bali','nihss_qabul',
     'mskt','otkazilgan_muassasa','dinamika_izoh','status','qoshimcha','shifokor_fio']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) InsultYangiPage._data[id] = el.value;
    });

    const tugilgan = document.getElementById('tugilgan_sana');
    if (tugilgan) InsultYangiPage._data.tugilgan_yil = tugilgan.value;

    const jinsEl = document.querySelector('input[name="jins"]:checked');
    if (jinsEl) InsultYangiPage._data.jins = jinsEl.value;

    const muolajaEl = document.querySelector('input[name="muolaja_turi"]:checked');
    if (muolajaEl) InsultYangiPage._data.muolaja_turi = muolajaEl.value;

    const dinamikaEl = document.querySelector('input[name="dinamika_muolaja_turi"]:checked');
    if (dinamikaEl) InsultYangiPage._data.dinamika_muolaja_turi = dinamikaEl.value;

    ['xavf_omillari','asoratlar'].forEach(name => {
      const els = document.querySelectorAll(`input[name="${name}"]:checked`);
      const key = name === 'xavf_omillari' ? 'xavf_omil' : name;
      InsultYangiPage._data[key] = Array.from(els).map(e=>e.value);
    });
  },

  validateStep() {
    this.saveCurrentStep();
    document.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => el.classList.remove('border-red-500'));
    document.querySelectorAll('.form-error-msg').forEach(el => { el.textContent=''; el.classList.add('hidden'); });

    let required = [];
    if (this._step === 0) required = ['viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli'];
    if (this._step === 1) required = ['fio','tugilgan_sana','jins'];
    if (this._step === 2) required = ['simptom_vaqt','gcs_bali','insult_turi','qon_bosimi','aha_bali','nihss_qabul'];
    if (this._step === 3) required = ['mskt','muolaja_turi','status'];
    if (this._step === 4) required = ['shifokor_fio'];

    const errs = Utils.validate(this._data, required);
    let valid = true;
    for (const [key, msg] of Object.entries(errs)) {
      valid = false;
      const el = document.getElementById(key);
      if (el) { el.classList.add('border-red-500'); el.focus(); }
      else if (key === 'jins') showToast('Jinsini tanlang', 'warning');
      else if (key === 'muolaja_turi') showToast('Muolaja turini tanlang', 'warning');
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
      await DB.insultQabul(this._data);
      showToast('🎉 Bemor muvaffaqiyatli saqlandi!', 'success');
      setTimeout(() => Router.go('dashboard'), 1500);
    } catch(err) {
      showToast(err.message, 'error');
      setLoading(btn, false);
    }
  }
};
