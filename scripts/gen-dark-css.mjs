// Qorong'i mavzu (dark mode) uchun css/dark.css ni yaratadi.
//
// Sahifalar Tailwind rang klasslari (bg-white, text-slate-500, bg-red-50 …) va
// inline stillar bilan yozilgan — ularning hammasini qo'lda qayta yozish o'rniga
// ishlatilgan klasslarni js/ dan yig'ib, har biriga [data-theme="dark"] ostida
// qorong'i muqobil beramiz. Yangi klass qo'shilsa: `npm run build:dark`.
//
// Qoida:
//  - neytral (slate/gray/…): och fonlar → qorong'i sirtlar, to'q matn → och matn
//  - rangli (red/blue/…): och tint fonlar → shu rangning shaffof qatlami,
//    to'q matn (600–900) → och (300–400), och chegaralar → shaffof chegara
//  - to'yingan fonlar (bg-*-500…900) va text-white o'zgarmaydi — ular ikkala
//    mavzuda ham o'qiladi.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const colors = require('tailwindcss/colors');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');

const NEUTRAL = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];

// Neytral shkala qorong'i mavzuda (qiymat = token)
const N_BG = { 50: 'var(--bg-subtle)', 100: 'var(--bg-subtle-2)', 200: 'var(--border)', 300: 'var(--border-strong)' };
const N_TEXT = { 900: 'var(--text-dark)', 800: 'var(--text-dark)', 700: 'var(--text-body)', 600: 'var(--text-body)', 500: 'var(--text-gray)', 400: 'var(--text-light)', 300: 'var(--text-light)' };
const N_BORDER = { 50: 'var(--border-light)', 100: 'var(--border-light)', 200: 'var(--border)', 300: 'var(--border-strong)', 400: 'var(--border-strong)' };

const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

// 1) js/ dagi ishlatilgan rang klasslari
const used = new Set();
const RE = /\b(?:hover:)?(bg|text|border|divide)-(white|black|[a-z]+)(?:-(\d{2,3}))?(?:\/(\d{1,3}))?\b/g;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return walk(p);
  if (p.endsWith('.js')) for (const m of fs.readFileSync(p, 'utf8').matchAll(RE)) used.add(m[0]);
});
walk(path.join(root, 'js'));

// Tailwind klass nomidagi "/" va ":" CSS selektorda escape qilinadi
const sel = cls => '.' + cls.replace(/([:/.\[\]#])/g, '\\$1');

const rules = [];
for (const cls of [...used].sort()) {
  const hover = cls.startsWith('hover:');
  const m = cls.replace(/^hover:/, '').match(/^(bg|text|border|divide)-(white|black|[a-z]+)(?:-(\d{2,3}))?(?:\/(\d{1,3}))?$/);
  if (!m) continue;
  const [, kind, fam, stepS, alphaS] = m;
  const step = +stepS;
  const alpha = alphaS ? +alphaS / 100 : 1;
  let decl = null;

  if (fam === 'white') {
    if (kind === 'bg') decl = alpha < 1 ? `background-color:${rgba('#111a2b', alpha)}` : 'background-color:var(--bg-card)';
    else if (kind === 'border') decl = 'border-color:var(--border)';
    // text-white o'zgarmaydi
  } else if (NEUTRAL.includes(fam)) {
    if (kind === 'bg' && N_BG[step]) decl = `background-color:${N_BG[step]}` + (alpha < 1 ? '' : '');
    else if (kind === 'text' && N_TEXT[step]) decl = `color:${N_TEXT[step]}`;
    else if ((kind === 'border' || kind === 'divide') && N_BORDER[step]) decl = `border-color:${N_BORDER[step]}`;
  } else if (HUES.includes(fam) && colors[fam]) {
    const pal = colors[fam];
    if (kind === 'bg' && step <= 200) decl = `background-color:${rgba(pal[500], step === 50 ? 0.12 : step === 100 ? 0.18 : 0.26)}`;
    else if (kind === 'text' && step >= 600) decl = `color:${step >= 800 ? pal[200] : pal[300]}`;
    else if (kind === 'text' && step === 500) decl = `color:${pal[400]}`;
    else if ((kind === 'border' || kind === 'divide') && step <= 300) decl = `border-color:${rgba(pal[500], 0.35)}`;
  }
  if (!decl) continue;
  const s = `[data-theme="dark"] ${sel(cls)}${hover ? ':hover' : ''}`;
  rules.push(kind === 'divide' ? `${s} > :not([hidden]) ~ :not([hidden]){${decl}}` : `${s}{${decl}}`);
}

// 2) Inline stillardagi och fonlar va matnlar (attribute selector; !important —
//    inline style dan ustun bo'lishning yagona yo'li)
const inlineBg = {
  '#fff': 'var(--bg-card)', '#ffffff': 'var(--bg-card)', 'white': 'var(--bg-card)',
  '#f8fafc': 'var(--bg-subtle)', '#f9fafb': 'var(--bg-subtle)', '#fafafa': 'var(--bg-subtle)', '#f1f5f9': 'var(--bg-subtle-2)',
  '#fef2f2': rgba(colors.red[500], 0.12), '#fee2e2': rgba(colors.red[500], 0.18),
  '#fff7ed': rgba(colors.orange[500], 0.12), '#fffbeb': rgba(colors.amber[500], 0.12), '#fef3c7': rgba(colors.amber[500], 0.18),
  '#fefce8': rgba(colors.yellow[500], 0.12), '#f0fdf4': rgba(colors.green[500], 0.12), '#ecfdf5': rgba(colors.emerald[500], 0.12),
  '#eff6ff': rgba(colors.blue[500], 0.12), '#dbeafe': rgba(colors.blue[500], 0.18), '#f5f3ff': rgba(colors.violet[500], 0.12),
};
for (const [v, d] of Object.entries(inlineBg)) {
  for (const prop of ['background', 'background-color']) {
    rules.push(`[data-theme="dark"] [style*="${prop}:${v}" i],[data-theme="dark"] [style*="${prop}: ${v}" i]{background-color:${d} !important}`);
  }
}
const inlineText = {
  '#1e3a8a': colors.blue[200], '#1e40af': colors.blue[200], '#1d4ed8': colors.blue[300],
  '#991b1b': colors.red[200], '#b91c1c': colors.red[300], '#7f1d1d': colors.red[200],
  '#92400e': colors.amber[200], '#78350f': colors.amber[200], '#a16207': colors.yellow[300],
  '#166534': colors.green[300], '#065f46': colors.emerald[300], '#6d28d9': colors.violet[300], '#5b21b6': colors.violet[300],
  '#111827': 'var(--text-dark)', '#1f2937': 'var(--text-dark)', '#374151': 'var(--text-body)', '#6b7280': 'var(--text-gray)', '#78716c': 'var(--text-gray)',
};
for (const [v, d] of Object.entries(inlineText)) {
  rules.push(`[data-theme="dark"] [style*=";color:${v}" i],[data-theme="dark"] [style^="color:${v}" i],[data-theme="dark"] [style*="; color:${v}" i],[data-theme="dark"] [style*=" color:${v}" i]{color:${d} !important}`);
}

// 3) Bo'lim CSS fayllaridagi qattiq yozilgan ranglar (Muolaja va natija,
//    Murojaat yo'li). Har bir qoidadan och fon / to'q matn / och chegara
//    deklaratsiyalarini topib, shu selektor uchun qorong'i muqobil chiqaramiz.
const hex2rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h.slice(0, 6), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const lum = h => hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
const sat = h => { const [r, g, b] = hex2rgb(h); return Math.max(r, g, b) - Math.min(r, g, b); };
const darkBg = h => sat(h) < 30 ? (lum(h) > 0.9 ? 'var(--bg-card)' : 'var(--bg-subtle)') : (() => { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},0.12)`; })();
const lightText = h => { if (lum(h) < 0.06) return 'var(--text-dark)'; if (sat(h) < 40) return 'var(--text-body)'; const [r, g, b] = hex2rgb(h); const k = 0.65; return `rgb(${Math.round(r + (255 - r) * k)},${Math.round(g + (255 - g) * k)},${Math.round(b + (255 - b) * k)})`; };
for (const file of ['treatment-flow.css', 'dashboard-sources.css']) {
  const css = fs.readFileSync(path.join(root, 'css', file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim(); if (!selector || selector.startsWith('from') || selector.startsWith('to') || /^\d/.test(selector)) continue;
    const decls = [];
    for (const d of m[2].split(';')) {
      const [prop, ...rest] = d.split(':'); if (!prop || !rest.length) continue;
      const p = prop.trim().toLowerCase(), v = rest.join(':').trim();
      const hx = v.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i)?.[0];
      if (!hx) { if (/^(background|background-color)$/.test(p) && /^(#fff|white)\b/i.test(v)) decls.push('background-color:var(--bg-card)'); continue; }
      const L = lum(hx);
      if (/^(background|background-color)$/.test(p) && L > 0.7) decls.push(`background-color:${darkBg(hx)}`);
      else if (p === 'color' && L < 0.2) decls.push(`color:${lightText(hx)}`);
      else if (/^border(-(top|bottom|left|right))?(-color)?$/.test(p) && L > 0.7) decls.push(`${p.endsWith('-color') ? p : p + '-color'}:${sat(hx) < 30 ? 'var(--border)' : rgba(hx, 0.35)}`);
      else if (p === 'fill' && L < 0.2) decls.push(`fill:${lightText(hx)}`);
      else if (p === 'stroke' && L > 0.7) decls.push('stroke:var(--border)');
    }
    if (decls.length) rules.push(selector.split(',').map(s => `[data-theme="dark"] ${s.trim()}`).join(',') + `{${decls.join(';')}}`);
  }
}

// 4) JS dagi barcha qolgan hex ranglar (shartli ifodalar ichidagilar ham:
//    `color:${a ? '#475569' : '#64748b'}`). Attribute selektor sahifadagi tayyor
//    style qiymatini tekshiradi, shuning uchun manba qanday yozilgani muhim emas.
const allHex = new Set();
const walk2 = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
  const p = path.join(d, e.name);
  if (e.isDirectory()) return walk2(p);
  if (p.endsWith('.js') && !/locales|glossary/.test(p)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g)) allHex.add(m[0].toLowerCase());
});
walk2(path.join(root, 'js'));
const done = new Set([...Object.keys(inlineText), ...Object.keys(inlineBg)].map(s => s.toLowerCase()));
for (const hx of [...allHex].sort()) {
  if (done.has(hx)) continue;
  const L = lum(hx);
  if (L < 0.2) {
    const c = lightText(hx);
    rules.push([';color:', '; color:', ' color:'].map(p => `[data-theme="dark"] [style*="${p}${hx}" i]`).concat(`[data-theme="dark"] [style^="color:${hx}" i]`).join(',') + `{color:${c} !important}`);
  } else if (L > 0.75) {
    rules.push(['background:', 'background-color:', 'background: '].map(p => `[data-theme="dark"] [style*="${p}${hx}" i]`).join(',') + `{background-color:${darkBg(hx)} !important}`);
  }
}

const out = `/* AVTOMATIK YARATILGAN — qo'lda tahrirlamang. Manba: scripts/gen-dark-css.mjs
   (npm run build:dark). Qorong'i mavzu: <html data-theme="dark">. */
${rules.join('\n')}
`;
fs.writeFileSync(path.join(root, 'css', 'dark.css'), out);
console.log(`css/dark.css: ${rules.length} qoida (${used.size} ta klass ko'rildi)`);
