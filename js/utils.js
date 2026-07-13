// ==================== UTILITIES ====================

// HTML maxsus belgilarini xavfsiz ko'rinishga o'tkazish (XSS oldini olish)
function esc(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Date/time formatting
const Utils = {
  formatDate(dt, opts = {}) {
    if (!dt) return '—';
    const d = new Date(dt);
    if (isNaN(d)) return '—';
    const defaults = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Tashkent' };
    return d.toLocaleDateString('uz-Cyrl-UZ', { ...defaults, ...opts });
  },

  formatDateTime(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    if (isNaN(d)) return '—';
    return d.toLocaleString('uz-Cyrl-UZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Asia/Tashkent'
    });
  },

  formatDateInput(dt) {
    if (!dt) return '';
    const d = new Date(dt);
    if (isNaN(d)) return '';
    // UTC+5 da datetime-local input uchun
    const uzt = new Date(d.getTime() + 5 * 3600000);
    const pad = n => String(n).padStart(2, '0');
    return `${uzt.getUTCFullYear()}-${pad(uzt.getUTCMonth()+1)}-${pad(uzt.getUTCDate())}T${pad(uzt.getUTCHours())}:${pad(uzt.getUTCMinutes())}`;
  },

  calculateAge(val) {
    if (!val) return null;
    const s = val.toString();
    if (s.includes('-')) {
      const b = new Date(s);
      if (isNaN(b)) return null;
      const now = new Date();
      let age = now.getFullYear() - b.getFullYear();
      const m = now.getMonth() - b.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
      return age;
    }
    const yr = parseInt(s.slice(0, 4));
    if (isNaN(yr)) return null;
    return new Date().getFullYear() - yr;
  },

  // MSKT/KT o'tkazilganmi? — katta-kichik harf va bo'shliqqa sezgir emas
  // "Ha — o'tkazildi", "Ha – o'tkazildi", " ha ...", "HA ..." — hammasi true
  msktDone(v) {
    return typeof v === 'string' && v.trim().toLowerCase().startsWith('ha');
  },

  relativeTime(dt) {
    if (!dt) return '—';
    const d = new Date(dt);
    const now = new Date();
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Hozirgina';
    if (mins < 60) return `${mins} daq. avval`;
    if (hrs < 24) return `${hrs} soat avval`;
    if (days < 7) return `${days} kun avval`;
    return Utils.formatDate(dt);
  },

  // Validate required fields
  validate(data, required) {
    const errors = {};
    required.forEach(field => {
      const val = data[field];
      if (val === undefined || val === null || val === '' ||
        (Array.isArray(val) && val.length === 0)) {
        errors[field] = 'Majburiy maydon';
      }
    });
    return errors;
  },

  // Kirill → Lotin transliteratsiya (O'zbek alifbosi)
  cyrToLat(s) {
    if (!s) return s;
    const map = {
      'Қ':'Q','қ':'q','Ҳ':'H','ҳ':'h','Ғ':"G'",'ғ':"g'",'Ў':"O'",'ў':"o'",
      'Ш':'Sh','ш':'sh','Ч':'Ch','ч':'ch','Ю':'Yu','ю':'yu','Я':'Ya','я':'ya',
      'Ё':'Yo','ё':'yo','Ъ':"'",'ъ':"'",'Ь':"'",'ь':"'",
      'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g',
      'Д':'D','д':'d','Е':'E','е':'e','Ж':'J','ж':'j','З':'Z','з':'z',
      'И':'I','и':'i','Й':'Y','й':'y','К':'K','к':'k','Л':'L','л':'l',
      'М':'M','м':'m','Н':'N','н':'n','О':'O','о':'o','П':'P','п':'p',
      'Р':'R','р':'r','С':'S','с':'s','Т':'T','т':'t','У':'U','у':'u',
      'Ф':'F','ф':'f','Х':'X','х':'x','Ц':'S','ц':'s','Э':'E','э':'e',
      'Ӯ':'U','ӯ':'u',
      // Qozoq/boshqa kirill harflari
      'Ы':'I','ы':'i','І':'I','і':'i','Ң':'N','ң':'n','Ә':'A','ә':'a',
      'Ү':'U','ү':'u','Ұ':'U','ұ':'u','Ӛ':'O','ӛ':'o',
    };
    let res = '';
    const chars = Array.from(s);
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      res += (map[c] !== undefined) ? map[c] : c;
    }
    return res;
  },

  // Har qanday FIO so’zini to’g’ri Title Case ga o’tkazish
  // Apostrof (‘, `) so’z o’rtasida — undan keyingi harf KICHIK: O’rinova, G’ulomov, o’g’li
  _titleWord(word) {
    if (!word) return word;
    word = word.replace(/`/g, "’");
    // Hammani kichik qilamiz, keyin faqat birinchi harfni katta
    const lower = word.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  },

  // F.I.O ni normallashtirish: Kirill → Lotin, ortiqcha bo'shliqlar, Title Case
  normalizeFio(fio) {
    if (!fio) return fio;
    const lat = Utils.cyrToLat(fio.trim());
    return lat.replace(/\s+/g, ' ')
      .split(' ').map(w => Utils._titleWord(w)).join(' ');
  },

  // Har qanday yozuvni Title Case ga o'tkazish (saqlashdan oldin ishlatiladi)
  toTitleCase(str) {
    if (!str) return str;
    const lat = Utils.cyrToLat(str.trim());
    return lat.replace(/\s+/g, ' ')
      .split(' ').map(w => Utils._titleWord(w)).join(' ');
  },

  // Generate KT No suggestion
  // Muassasa nomidan qisqa prefiks olish: "Pop politravma markazi" → "POP"
  muassasaPrefix(muassasa) {
    if (!muassasa) return 'KT';
    const m = muassasa.trim();
    // RSHTYOIM filiallari uchun: "RSHTYOIM Namangan filiali" → "RSH-NAM"
    const rshMatch = m.match(/RSHTYOIM\s+(\S+)/i);
    if (rshMatch) {
      const loc = rshMatch[1].replace(/filiali?/i,'').trim();
      return 'RSH-' + loc.slice(0,4).toUpperCase();
    }
    // Respublika markazi
    if (/respublika shoshilinch/i.test(m)) return 'RSHM';
    // "Pop politravma markazi" → "POP", "Sirdaryo politravma markazi" → "SIR"
    // Birinchi so'z (shahar/tuman nomi) — 3-4 harf. Kirill bo'lsa lotinga o'giramiz.
    const first = Utils.cyrToLat(m.split(/\s+/)[0] || '');
    const prefix = first.slice(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '');
    return prefix || 'KT'; // bo'sh bo'lsa (masalan noaniq belgilar) — KT
  },

  generateKtNo(muassasa) {
    const now = new Date(Date.now() + 5*3600000);
    const y = now.getUTCFullYear().toString().slice(2);
    const m = (now.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = now.getUTCDate().toString().padStart(2, '0');
    const rand = Math.floor(Math.random() * 900000) + 100000;
    const prefix = Utils.muassasaPrefix(muassasa);
    return `${prefix}-${y}${m}${d}-${rand}`;
  },

  // Status badge HTML
  statusBadge(status) {
    const map = {
      active: ['bg-green-50 text-green-700 border-green-100', 'check-circle', 'Aktiv'],
      chiqarildi: ['bg-blue-50 text-blue-700 border-blue-100', 'log-out', 'Chiqarildi'],
      vafot: ['bg-red-50 text-red-700 border-red-100', 'skull', 'Vafot'],
      otkazildi: ['bg-orange-50 text-orange-700 border-orange-100', 'share-2', 'O\'tkazildi']
    };
    const [cls, ic, label] = map[status] || ['bg-slate-50 text-slate-500 border-slate-100', 'help-circle', status];
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${cls} text-[10px] font-bold uppercase tracking-wider shadow-sm">
      <i data-lucide="${ic}" class="w-3 h-3"></i> ${label}
    </span>`;
  },

  // Type badge
  typeBadge(type) {
    if (type === 'infarkt') return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-[10px] font-bold uppercase tracking-wider">
      <i data-lucide="heart" class="w-3 h-3"></i> Infarkt
    </span>`;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-bold uppercase tracking-wider">
      <i data-lucide="brain" class="w-3 h-3"></i> Insult
    </span>`;
  },

  // Truncate text
  truncate(str, len = 30) {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
  },

  // Debounce
  debounce(fn, delay = 400) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  },

  // Export to CSV (Excel/Google Sheets friendly, UTF-8 BOM, RFC 4180)
  exportCSV(data, filename = 'bemorlar.csv') {
    // XLSX formatida eksport (encoding va ustun kengligi muammosi yo'q)
    const xlsxName = filename.replace(/\.csv$/i, '.xlsx');
    Utils.exportXLSX(data, xlsxName);
  },

  exportXLSX(data, filename = 'bemorlar.xlsx') {
    if (!data || !data.length) return;
    const clean = v => {
      if (v === null || v === undefined) return '';
      if (Array.isArray(v)) return v.join(', ');
      return String(v);
    };
    const headers = Object.keys(data[0]);
    const rows = [
      headers,
      ...data.map(r => headers.map(h => clean(r[h])))
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Har bir ustun kengligini mazmuniga qarab avtomatik sozlash
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...data.map(r => clean(r[h]).length)
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws['!cols'] = colWidths;

    // 1-qator (sarlavha) qalin va ko'k rang
    headers.forEach((_, i) => {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1D4ED8' } },
          alignment: { horizontal: 'center', vertical: 'center', wrapText: false }
        };
      }
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hisobot');
    XLSX.writeFile(wb, filename);
  },

  // Set element HTML safely
  setHTML(el, html) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.innerHTML = html;
  },

  // Query selector helpers
  qs(sel, ctx = document) { return ctx.querySelector(sel); },
  qsa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; },

  // Show/hide
  show(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.style.display = '';
  },
  hide(el) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (el) el.style.display = 'none';
  }
};

// ==================== SOUND ====================
const Sound = {
  _ctx: null,

  _getCtx() {
    if (!this._ctx) this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this._ctx;
  },

  _play(notes) {
    try {
      const ctx = this._getCtx();
      let t = ctx.currentTime;
      notes.forEach(([freq, dur, vol = 0.3]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t);
        osc.stop(t + dur);
        t += dur * 0.85;
      });
    } catch(e) { /* AudioContext not supported */ }
  },

  // Muvaffaqiyat: bemor saqlandi, login, xabar yuborildi
  success() {
    this._play([[523, 0.12], [659, 0.12], [784, 0.2, 0.25]]);
  },

  // Xato: saqlash xatosi, server xatosi
  error() {
    this._play([[440, 0.15, 0.3], [330, 0.25, 0.3]]);
  },

  // Ogohlantirish: majburiy maydon, validation
  warning() {
    this._play([[587, 0.1, 0.2], [587, 0.15, 0.2]]);
  },

  // Yangi xabar / bildirishnoma
  notify() {
    this._play([[880, 0.08, 0.2], [1047, 0.15, 0.2]]);
  }
};

// showToast, showModal, closeModal, setLoading — js/components.js da aniqlangan
