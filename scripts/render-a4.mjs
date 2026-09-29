// Har bir hudud xaritasini A4 (300 dpi) JPG ga chiqaradi: xaritalar/a4/<hudud>.jpg
// Ishga tushirish: node scripts/render-a4.mjs [kutubxonalar_papkasi]
// Kutubxonalar papkasida leaflet.min.js, leaflet.min.css, proj4.js, proj4leaflet.min.js bo'lsa,
// CDN o'rniga shular ishlatiladi (tarmoq cheklangan muhit uchun). Aks holda CDN'dan yuklanadi.
import { readdirSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'xaritalar');
const out = path.join(dir, 'a4');
const libs = process.argv[2];
mkdirSync(out, { recursive: true });

const A4 = { w: 794, h: 1123 };          // 96 dpi CSS piksel
const SCALE = 2480 / 794;                // -> 300 dpi

const browser = await chromium.launch();
for (const file of readdirSync(dir).filter(f => f.endsWith('-xarita.html'))) {
  const slug = file.replace('-xarita.html', '');
  const page = await browser.newPage({ viewport: { width: A4.w, height: A4.h }, deviceScaleFactor: SCALE });
  if (libs) await page.route('https://cdnjs.cloudflare.com/**', r => {
    const f = path.join(libs, r.request().url().split('/').pop());
    return existsSync(f) ? r.fulfill({ path: f }) : r.abort();
  });
  await page.route('**/*yandex*/**', r => r.abort());   // fon plitkalari bosmada ishlatilmaydi
  await page.goto('file://' + path.join(dir, file));
  await page.waitForFunction(() => window.L && document.querySelectorAll('#list li').length >= 0);

  await page.evaluate(() => {
    const title = document.querySelector('h1').textContent;
    const items = [...DATA].sort((x, y) => (y.angiograf - x.angiograf) || x.name.localeCompare(y.name));
    document.body.innerHTML = '';
    document.body.style.background = '#fff';
    const st = document.createElement('style');
    st.textContent = `
      body{margin:0;font:12px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1d2433}
      .pg{width:100vw;height:100vh;display:flex;flex-direction:column;padding:28px 30px 22px;box-sizing:border-box}
      .hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1d2433;padding-bottom:8px}
      .hd h1{font-size:22px;margin:0}.hd .s{color:#6b7385;font-size:11px;text-align:right}
      #pm{flex:1;margin:10px 0;background:#f3f5f8;border:1px solid #d5dae3}
      .lg{display:flex;gap:16px;font-size:11px;margin-bottom:8px;align-items:center}
      .d{display:inline-block;width:11px;height:11px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #0004;vertical-align:-2px;margin-right:4px}
      ol{margin:0;padding:0 0 0 0;columns:2;column-gap:24px;font-size:10.5px;list-style:none}
      ol li{break-inside:avoid;margin-bottom:3px;display:flex;gap:6px}
      .no{flex:none;width:17px;height:17px;border-radius:50%;color:#fff;font-weight:700;font-size:10px;display:flex;align-items:center;justify-content:center}
      .t{color:#6b7385}
      .num{background:none;border:0}
      .num div{width:20px;height:20px;border-radius:50%;color:#fff;font:700 11px/20px system-ui;text-align:center;border:2px solid #fff;box-shadow:0 0 0 1px #0005}
      .leaflet-tooltip.lbl{background:transparent;border:0;box-shadow:none;padding:0;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 2px #fff;white-space:nowrap}
      .leaflet-tooltip.lbl::before{display:none}
      .lbl.tuman{font-size:10px;color:#34405a;font-weight:600}.lbl.v{font-size:11px;color:#6b7385;font-style:italic}
      .lbl.d{font-size:12px;color:#8a6d3b;font-weight:700;letter-spacing:2px}
      .leaflet-tooltip-pane{z-index:590}.leaflet-control-container{display:none}`;
    document.head.appendChild(st);
    const col = m => m.angiograf && m.mskt ? '#7048e8' : m.angiograf ? '#d6336c' : '#1c7ed6';
    const tag = m => [m.angiograf && 'angiograf', m.mskt && 'MSKT', m.trombektomiya && 'trombektomiya'].filter(Boolean).join(', ');
    document.body.innerHTML = `<div class="pg">
      <div class="hd"><h1>${title}</h1><div class="s">Angiograf va MSKT mavjud muassasalar<br>${new Date().toISOString().slice(0,10)} · ${items.length} muassasa</div></div>
      <div id="pm"></div>
      <div class="lg"><span><span class="d" style="background:#d6336c"></span>Angiograf</span>
        <span><span class="d" style="background:#1c7ed6"></span>MSKT</span>
        <span><span class="d" style="background:#7048e8"></span>Angiograf + MSKT</span>
        <span style="margin-left:auto;color:#6b7385">— — tuman chegarasi · ━ viloyat chegarasi</span></div>
      <ol>${items.map((m, i) => `<li><span class="no" style="background:${col(m)}">${i + 1}</span>
        <span><b>${m.name}</b><br><span class="t">${m.tuman} · ${tag(m)}</span></span></li>`).join('')}</ol></div>`;
    const map = L.map('pm', { zoomControl: false, attributionControl: false, zoomSnap: 0.1, fadeAnimation: false, zoomAnimation: false });
    L.geoJSON(OTHERS, { style: { color: '#9aa3b2', weight: 1, fillColor: '#e4e8ee', fillOpacity: 1 } }).addTo(map);
    L.geoJSON(TUMAN, { style: { color: '#5c6b85', weight: 0.8, dashArray: '4 3', fillColor: '#fff', fillOpacity: 1 },
      onEachFeature: (f, l) => l.bindTooltip(f.properties.n, { permanent: true, direction: 'center', className: 'lbl tuman' }) }).addTo(map);
    const reg = L.geoJSON(REGION, { style: { color: '#1d2433', weight: 2.2, fillOpacity: 0 } }).addTo(map);
    map.fitBounds(reg.getBounds(), { padding: [18, 18] });
    LABELS.forEach(x => L.tooltip({ permanent: true, direction: 'center', className: 'lbl ' + x.c })
      .setLatLng(x.p).setContent(x.t).addTo(map));
    items.forEach((m, i) => L.marker([m.lat, m.lng], { icon: L.divIcon({ className: 'num', iconSize: [24, 24],
      html: `<div style="background:${col(m)}">${i + 1}</div>` }) }).addTo(map));
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, `${slug}.jpg`), type: 'jpeg', quality: 95 });
  await page.close();
  console.log('OK', slug);
}
await browser.close();
