/* ============================================================
   pd-mask.js — Bemorlar shaxsiy ma'lumotlarini ekranda yashirish
   INFARKT & INSULT reyestri (vanilla JS)

   Foydalanish:
     PD.fio(bemor.fio)     ->  "Xo***** O. Ch."   (yopiq holatda)
     PD.ktno(bemor.kt_no)  ->  "JARQ-5821-****"   (agar MASK_KTNO=true)
     PD.mountToggle('#pdToggleBox', () => BemorlarPage.render())

   Xususiyatlari:
     - Standart holat: YOPIQ (sessionStorage bo'sh = yopiq)
     - Ochilganda 2 daqiqadan keyin avtomatik qayta yopiladi
     - Sahifa yopilsa / brauzer tabi yopilsa — yana yopiq holatga qaytadi
     - Har ochilish DB.logPdReveal() orqali audit jurnaliga yoziladi (ixtiyoriy)
   ============================================================ */

const PD = {
  KEY: 'pd_visible',
  AUTO_HIDE_MS: 2 * 60 * 1000,   // 2 daqiqa
  MASK_KTNO: false,              // true qilsangiz K/T NO ham yopiladi
  _timer: null,
  _onChange: null,

  /* ---------- holat ---------- */
  get visible() {
    return sessionStorage.getItem(this.KEY) === '1';
  },

  set visible(v) {
    if (v) sessionStorage.setItem(this.KEY, '1');
    else sessionStorage.removeItem(this.KEY);
  },

  /* ---------- maskalash ---------- */
  fio(s) {
    if (this.visible) return s || '';
    if (!s) return '';
    const parts = String(s).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '';
    const fam = parts[0];
    const head = fam.slice(0, 2);
    const stars = '*'.repeat(Math.max(3, Math.min(fam.length - 2, 7)));
    const rest = parts.slice(1)
      .map(p => p.charAt(0).toUpperCase() + '.')
      .join(' ');
    return (head + stars + (rest ? ' ' + rest : '')).trim();
  },

  ktno(s) {
    if (this.visible || !this.MASK_KTNO) return s || '';
    if (!s) return '';
    const t = String(s);
    return t.length <= 4 ? '****' : t.slice(0, t.length - 4) + '****';
  },

  /* ---------- ochish / yopish ---------- */
  toggle() {
    this.visible ? this.hide() : this.show();
  },

  show() {
    this.visible = true;
    this._log();
    this._resetTimer();
    this._refresh();
  },

  hide() {
    this.visible = false;
    clearTimeout(this._timer);
    this._refresh();
  },

  _resetTimer() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.hide(), this.AUTO_HIDE_MS);
  },

  _log() {
    try {
      if (window.DB && typeof window.DB.logPdReveal === 'function') {
        window.DB.logPdReveal();
      }
    } catch (e) { /* audit jurnali ixtiyoriy — xato bermaydi */ }
  },

  _refresh() {
    this._paintBtn();
    if (typeof this._onChange === 'function') this._onChange();
  },

  /* ---------- tugma ---------- */
  mountToggle(selector, onChange) {
    const box = typeof selector === 'string'
      ? document.querySelector(selector)
      : selector;
    if (!box) return;

    this._onChange = onChange;
    this._injectCSS();

    const btn = document.createElement('button');
    btn.id = 'pdToggleBtn';
    btn.className = 'pd-toggle';
    btn.type = 'button';
    btn.addEventListener('click', () => this.toggle());
    box.appendChild(btn);

    // Yangilangandan keyin ochiq qolgan bo'lsa — taymerni tiklaymiz
    if (this.visible) this._resetTimer();
    this._paintBtn();
  },

  _paintBtn() {
    const btn = document.getElementById('pdToggleBtn');
    if (!btn) return;
    const open = this.visible;
    btn.innerHTML = (open ? this._eyeOff() : this._eye()) +
      '<span>' + (open ? 'Yashirish' : "F.I.O. ni ko'rsatish") + '</span>';
    btn.classList.toggle('pd-open', open);
    btn.title = open
      ? '2 daqiqadan keyin avtomatik yopiladi'
      : 'Shaxsiy ma\'lumotlar himoyalangan';
  },

  _eye() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  },

  _eyeOff() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
  },

  _injectCSS() {
    if (document.getElementById('pdMaskCSS')) return;
    const st = document.createElement('style');
    st.id = 'pdMaskCSS';
    st.textContent = `
      .pd-toggle{display:inline-flex;align-items:center;gap:6px;
        padding:7px 12px;border:1px solid #d7dbe3;border-radius:8px;
        background:#fff;color:#4b5563;font-size:13px;font-weight:500;
        cursor:pointer;transition:all .15s;white-space:nowrap}
      .pd-toggle:hover{background:#f7f8fa;border-color:#c3c9d4}
      .pd-toggle.pd-open{background:#fff7ed;border-color:#fdba74;color:#c2410c}
    `;
    document.head.appendChild(st);
  }
};

window.PD = PD;
