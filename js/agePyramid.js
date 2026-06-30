// ==================== AGE-SEX PYRAMID ====================
const AgePyramid = {
  W: 700, H: 370,
  ROW_H: 52,
  BAR_H: 30,
  CENTER_W: 68,
  LABEL_AREA: 56,  // label uchun rezerv (har ikki tomonda)
  COLOR_MALE: '#3B82F6',    // yorqin ko'k
  COLOR_FEMALE: '#EF4444',  // yorqin qizil
  COLOR_DEATH: 'rgba(0,0,0,0.38)',

  render(containerId, pyramidData, title, dotColor, totalCount, registr) {
    const el = document.getElementById(containerId);
    if (!el || !pyramidData) return;

    const { groups, data } = pyramidData;
    const W = this.W, H = this.H;
    const ROW_H = this.ROW_H, BAR_H = this.BAR_H, CENTER_W = this.CENTER_W;
    const LABEL_AREA = this.LABEL_AREA;
    const cx = W / 2;
    const TOP_PAD = 62;

    // Bar uchun mavjud kenglik (label area ni chegirib)
    const barAreaW = (W - CENTER_W) / 2 - LABEL_AREA;

    // Max qiymat (scale uchun)
    let maxVal = 1;
    groups.forEach(g => {
      const d = data[g];
      if (d.mTotal > maxVal) maxVal = d.mTotal;
      if (d.fTotal > maxVal) maxVal = d.fTotal;
    });

    // Jami
    let totalM = 0, totalF = 0, totalDeath = 0;
    groups.forEach(g => {
      totalM += data[g].mTotal; totalF += data[g].fTotal;
      totalDeath += data[g].mDeath + data[g].fDeath;
    });
    const totalAll = totalM + totalF;
    const mPct   = totalAll > 0 ? ((totalM / totalAll) * 100).toFixed(1) : '0';
    const fPct   = totalAll > 0 ? ((totalF / totalAll) * 100).toFixed(1) : '0';
    const dPct   = totalAll > 0 ? ((totalDeath / totalAll) * 100).toFixed(1) : '0';

    const scale = v => Math.round((v / maxVal) * barAreaW);

    // Markazdan bar boshlanish nuqtasi
    const mStart = cx - CENTER_W / 2;  // erkak bar o'ng chekkasi (markazga yaqin)
    const fStart = cx + CENTER_W / 2;  // ayol bar chap chekkasi (markazga yaqin)

    const rows = groups.map((group, i) => {
      const d = data[group];
      const y   = TOP_PAD + i * ROW_H;
      const barY = y + (ROW_H - BAR_H) / 2;

      const mW = scale(d.mTotal);
      const fW = scale(d.fTotal);
      const mDW = d.mTotal > 0 ? Math.round((d.mDeath / d.mTotal) * mW) : 0;
      const fDW = d.fTotal > 0 ? Math.round((d.fDeath / d.fTotal) * fW) : 0;

      // Erkak: o'ng chetidan (mStart) chapga cho'ziladi
      const mBarX = mStart - mW;
      // Ayol: chap chetidan (fStart) o'ngga cho'ziladi
      const fBarX = fStart;

      // Vafot qatlami: erkak — bar'ning tashqi (chap) chetidan, ayol — o'ng chetidan
      const mDeathX = mBarX;
      const fDeathX = fBarX + fW - fDW;

      const mDP = d.mTotal > 0 ? ((d.mDeath / d.mTotal) * 100).toFixed(1) : null;
      const fDP = d.fTotal > 0 ? ((d.fDeath / d.fTotal) * 100).toFixed(1) : null;

      // Label X — bar tashqarisida, LABEL_AREA ichida
      const mLabelX = mBarX - 5;  // chapda, text-anchor="end"
      const fLabelX = fBarX + fW + 5; // o'ngda, text-anchor="start"

      const midY = barY + BAR_H / 2;

      const mClickable = d.mTotal > 0 && registr;
      const fClickable = d.fTotal > 0 && registr;
      const mClick = mClickable ? `onclick="AgePyramid.onBarClick('${registr}','male','${group}','${title}')"` : '';
      const fClick = fClickable ? `onclick="AgePyramid.onBarClick('${registr}','female','${group}','${title}')"` : '';

      return `
        <g style="cursor:default">
          <!-- Erkak -->
          <g class="pyramid-bar-m" style="opacity:1;transition:opacity .15s;${mClickable?'cursor:pointer':''}" ${mClick}>
            <title>Erkak ${group}: ${d.mTotal} ta · vafot ${d.mDeath} (${mDP||0}%)${mClickable?' — bosing, ro\'yxatni ko\'rish':''}</title>
            <rect x="${mBarX}" y="${barY}" width="${mW}" height="${BAR_H}" rx="4" fill="${this.COLOR_MALE}"/>
            ${mDW > 0 ? `<rect x="${mDeathX}" y="${barY}" width="${mDW}" height="${BAR_H}" rx="4" fill="${this.COLOR_DEATH}"/>` : ''}
          </g>
          <!-- Erkak label -->
          ${d.mTotal > 0 ? `
            <g style="${mClickable?'cursor:pointer':''}" ${mClick}>
              <text x="${mLabelX}" y="${midY - 3}" text-anchor="end" font-size="11" font-weight="700" fill="${mClickable?'#1d4ed8':'#1e293b'}" ${mClickable?'text-decoration="underline"':''}>${d.mTotal}</text>
              ${mDP ? `<text x="${mLabelX}" y="${midY + 10}" text-anchor="end" font-size="9" fill="#b91c1c">vafot ${mDP}%</text>` : ''}
            </g>
          ` : ''}
          <!-- Ayol -->
          <g class="pyramid-bar-f" style="opacity:1;transition:opacity .15s;${fClickable?'cursor:pointer':''}" ${fClick}>
            <title>Ayol ${group}: ${d.fTotal} ta · vafot ${d.fDeath} (${fDP||0}%)${fClickable?' — bosing, ro\'yxatni ko\'rish':''}</title>
            <rect x="${fBarX}" y="${barY}" width="${fW}" height="${BAR_H}" rx="4" fill="${this.COLOR_FEMALE}"/>
            ${fDW > 0 ? `<rect x="${fDeathX}" y="${barY}" width="${fDW}" height="${BAR_H}" rx="4" fill="${this.COLOR_DEATH}"/>` : ''}
          </g>
          <!-- Ayol label -->
          ${d.fTotal > 0 ? `
            <g style="${fClickable?'cursor:pointer':''}" ${fClick}>
              <text x="${fLabelX}" y="${midY - 3}" text-anchor="start" font-size="11" font-weight="700" fill="${fClickable?'#b91c1c':'#1e293b'}" ${fClickable?'text-decoration="underline"':''}>${d.fTotal}</text>
              ${fDP ? `<text x="${fLabelX}" y="${midY + 10}" text-anchor="start" font-size="9" fill="#b91c1c">vafot ${fDP}%</text>` : ''}
            </g>
          ` : ''}
          <!-- Yosh label (markaz) -->
          <rect x="${cx - CENTER_W/2}" y="${barY}" width="${CENTER_W}" height="${BAR_H}" rx="4" fill="#f1f5f9"/>
          <text x="${cx}" y="${midY + 1}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="#475569">${group}</text>
        </g>
      `;
    }).join('');

    const totalH = TOP_PAD + groups.length * ROW_H;
    const legY = totalH + 22;
    const svgH = legY + 20;

    const colHeaders = `
      <text x="${mStart - barAreaW/2}" y="${TOP_PAD - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#3B82F6" letter-spacing="0.08em">ERKAK</text>
      <text x="${cx}" y="${TOP_PAD - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#64748b" letter-spacing="0.08em">YOSH</text>
      <text x="${fStart + barAreaW/2}" y="${TOP_PAD - 12}" text-anchor="middle" font-size="11" font-weight="700" fill="#EF4444" letter-spacing="0.08em">AYOL</text>
      <line x1="${cx - CENTER_W/2}" y1="${TOP_PAD - 18}" x2="${cx - CENTER_W/2}" y2="${totalH}" stroke="#e2e8f0" stroke-width="0.5"/>
      <line x1="${cx + CENTER_W/2}" y1="${TOP_PAD - 18}" x2="${cx + CENTER_W/2}" y2="${totalH}" stroke="#e2e8f0" stroke-width="0.5"/>
    `;

    const header = `
      <text x="${W/2}" y="16" text-anchor="middle" font-size="13" font-weight="800" fill="#0f172a">
        <tspan fill="${dotColor}">●</tspan><tspan> ${title} — ${(totalCount || totalAll).toLocaleString()} ta bemor</tspan>
      </text>
      <text x="${W/2}" y="34" text-anchor="middle" font-size="10.5" fill="#64748b">
        Erkak: ${totalM} ta (${mPct}%) · Ayol: ${totalF} ta (${fPct}%) · Umumiy vafot: ${dPct}%
      </text>
    `;

    const legend = `
      <rect x="${W/2 - 115}" y="${legY - 9}" width="11" height="11" rx="2" fill="${this.COLOR_MALE}"/>
      <text x="${W/2 - 100}" y="${legY}" font-size="10" fill="#475569">Erkak</text>
      <rect x="${W/2 - 50}" y="${legY - 9}" width="11" height="11" rx="2" fill="${this.COLOR_FEMALE}"/>
      <text x="${W/2 - 35}" y="${legY}" font-size="10" fill="#475569">Ayol</text>
      <rect x="${W/2 + 20}" y="${legY - 9}" width="11" height="11" rx="2" fill="rgba(0,0,0,0.3)"/>
      <text x="${W/2 + 35}" y="${legY}" font-size="10" fill="#475569">to'q qism — vafot etgan</text>
    `;

    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${svgH}" width="100%" xmlns="http://www.w3.org/2000/svg"
           style="font-family:Inter,system-ui,sans-serif;display:block">
        ${header}
        ${colHeaders}
        ${rows}
        ${legend}
      </svg>
    `;

    el.querySelectorAll('.pyramid-bar-m, .pyramid-bar-f').forEach(g => {
      g.addEventListener('mouseenter', () => { g.style.opacity = '0.72'; });
      g.addEventListener('mouseleave', () => { g.style.opacity = '1'; });
    });
  },

  _ageRangeFor(group) {
    if (group === '≤29')  return [0, 29];
    if (group === '30-44') return [30, 44];
    if (group === '45-59') return [45, 59];
    if (group === '60-74') return [60, 74];
    return [75, 130]; // 75+
  },

  async onBarClick(registr, jinsKey, group, title) {
    const [ageFrom, ageTo] = AgePyramid._ageRangeFor(group);
    const jinsLabel = jinsKey === 'male' ? 'Erkak' : 'Ayol';
    showModal({
      title: `${title} — ${jinsLabel}, ${group} yosh`,
      body: `<div class="flex items-center justify-center py-10">
        <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>`
    });
    try {
      const profile = await Profile.getCurrent();
      const viloyat  = DashboardPage._viewViloyat  !== undefined ? DashboardPage._viewViloyat  : (profile?.role === 'super_admin' ? '' : profile?.viloyat);
      const muassasa = DashboardPage._viewMuassasa !== undefined ? DashboardPage._viewMuassasa : '';
      const filters = { allCols: false, from: '2000-01-01T00:00:00Z' };
      if (viloyat)  filters.viloyat  = viloyat;
      if (muassasa) filters.muassasa = muassasa;

      const { data } = registr === 'infarkt'
        ? await DB.infarktList(filters)
        : await DB.insultList(filters);

      const jinsMatch = (j) => {
        const v = (j || '').toLowerCase();
        return jinsKey === 'male' ? ['erkak','e','m','male'].includes(v) : ['ayol','a','f','female'].includes(v);
      };
      const list = (data || []).filter(p => {
        if (!jinsMatch(p.jins)) return false;
        const age = Utils.calculateAge(p.tugilgan_sana || p.tugilgan_yil);
        return age !== null && age !== undefined && !isNaN(age) && age >= ageFrom && age <= ageTo;
      }).sort((a,b) => new Date(b.qabul_vaqt) - new Date(a.qabul_vaqt));

      const rows = list.map(p => `
        <tr class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onclick="closeModal();Router.go('bemor-karta',{kt_no:'${p.kt_no}',type:'${registr}'})">
          <td class="py-2 px-2 font-semibold text-gray-900">${esc(p.fio)}</td>
          <td class="py-2 px-2 text-gray-600">${esc(p.muassasa)}</td>
          <td class="py-2 px-2 text-gray-600">${Utils.formatDate(p.qabul_vaqt)}</td>
          <td class="py-2 px-2">
            <span class="px-2 py-0.5 rounded-full text-xs font-bold ${p.status==='vafot'?'bg-red-100 text-red-700':p.status==='active'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}">${p.status==='vafot'?'Vafot':p.status==='active'?'Faol':'Chiqarilgan'}</span>
          </td>
        </tr>`).join('');

      const body = list.length === 0
        ? `<p class="text-center text-gray-400 py-8">Bu guruhda bemor topilmadi</p>`
        : `<div class="overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table class="w-full text-sm">
              <thead><tr class="text-left text-gray-500 text-xs uppercase border-b border-gray-200">
                <th class="py-2 px-2">F.I.O</th><th class="py-2 px-2">Muassasa</th><th class="py-2 px-2">Qabul</th><th class="py-2 px-2">Holat</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <p class="text-xs text-gray-400 mt-3">${list.length} ta bemor</p>`;

      showModal({ title: `${title} — ${jinsLabel}, ${group} yosh (${list.length} ta)`, body });
    } catch (err) {
      showModal({ title: 'Xatolik', body: `<p class="text-red-600">${err.message}</p>` });
    }
  }
};
