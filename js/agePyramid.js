// ==================== AGE-SEX PYRAMID ====================
// SVG-based yosh-jins piramidasi komponenti
// dataInf / dataIns: { groups: [...], data: { '75+': { mTotal, fTotal, mDeath, fDeath }, ... } }

const AgePyramid = {
  // SVG o'lchamlari
  W: 680, H: 340,
  ROW_H: 50,
  BAR_H: 32,
  CENTER_W: 70,   // markaziy yosh ustuni kengligi
  LABEL_PAD: 6,   // raqam va bar orasidagi bo'shliq
  COLOR_MALE: '#185FA5',
  COLOR_FEMALE: '#D4537E',
  COLOR_DEATH: 'rgba(0,0,0,0.45)',

  render(containerId, pyramidData, title, dotColor, totalLabel) {
    const el = document.getElementById(containerId);
    if (!el || !pyramidData) return;

    const { groups, data } = pyramidData;
    const W = this.W, H = this.H;
    const ROW_H = this.ROW_H, BAR_H = this.BAR_H, CENTER_W = this.CENTER_W;
    const cx = W / 2;

    // Header uchun joy
    const TOP_PAD = 64;
    const barAreaW = (W - CENTER_W) / 2; // har bir tomon uchun max kenglik

    // Max qiymatni topamiz (scale uchun)
    let maxVal = 1;
    groups.forEach(g => {
      const d = data[g];
      if (d.mTotal > maxVal) maxVal = d.mTotal;
      if (d.fTotal > maxVal) maxVal = d.fTotal;
    });

    // Jami hisoblar
    let totalM = 0, totalF = 0, totalDeath = 0, totalAll = 0;
    groups.forEach(g => {
      const d = data[g];
      totalM += d.mTotal; totalF += d.fTotal;
      totalDeath += d.mDeath + d.fDeath;
    });
    totalAll = totalM + totalF;
    const mPct = totalAll > 0 ? ((totalM / totalAll) * 100).toFixed(1) : '0';
    const fPct = totalAll > 0 ? ((totalF / totalAll) * 100).toFixed(1) : '0';
    const deathPct = totalAll > 0 ? ((totalDeath / totalAll) * 100).toFixed(1) : '0';

    // Scale funksiyasi: qiymat → pixel kenglik
    const scale = (v) => Math.round((v / maxVal) * (barAreaW - 16));

    // Qatorlar SVG
    const rows = groups.map((group, i) => {
      const d = data[group];
      const y = TOP_PAD + i * ROW_H;
      const barY = y + (ROW_H - BAR_H) / 2;

      const mW = scale(d.mTotal);
      const fW = scale(d.fTotal);
      const mDW = d.mTotal > 0 ? Math.round((d.mDeath / d.mTotal) * mW) : 0;
      const fDW = d.fTotal > 0 ? Math.round((d.fDeath / d.fTotal) * fW) : 0;

      // Erkak: markazdan chapga
      const mBarX = cx - CENTER_W / 2 - mW;
      // Ayol: markazdan o'ngga
      const fBarX = cx + CENTER_W / 2;

      // Erkak vafot: bar'ning chap chetidan (tashqi uchidan) boshlanib ichkariga
      const mDeathX = mBarX;
      // Ayol vafot: bar'ning o'ng chetidan boshlanib ichkariga
      const fDeathX = fBarX + fW - fDW;

      const mDeathPct = d.mTotal > 0 ? ((d.mDeath / d.mTotal) * 100).toFixed(1) : null;
      const fDeathPct = d.fTotal > 0 ? ((d.fDeath / d.fTotal) * 100).toFixed(1) : null;

      const tooltip_m = `Erkak ${group}: ${d.mTotal} ta · vafot ${d.mDeath} (${mDeathPct || 0}%)`;
      const tooltip_f = `Ayol ${group}: ${d.fTotal} ta · vafot ${d.fDeath} (${fDeathPct || 0}%)`;

      return `
        <!-- Qator: ${group} -->
        <g class="pyramid-row" style="cursor:default">
          <!-- Erkak bar -->
          <g class="pyramid-bar-m" style="opacity:1;transition:opacity .15s">
            <title>${tooltip_m}</title>
            <rect x="${mBarX}" y="${barY}" width="${mW}" height="${BAR_H}" rx="3" fill="${this.COLOR_MALE}"/>
            ${mDW > 0 ? `<rect x="${mDeathX}" y="${barY}" width="${mDW}" height="${BAR_H}" rx="3" fill="${this.COLOR_DEATH}"/>` : ''}
            <!-- Son (bar tashqarisida chapda) -->
            ${d.mTotal > 0 ? `<text x="${mBarX - this.LABEL_PAD}" y="${barY + BAR_H / 2 - 4}" text-anchor="end" font-size="11" font-weight="700" fill="#334155">${d.mTotal}</text>` : ''}
            ${mDeathPct ? `<text x="${mBarX - this.LABEL_PAD}" y="${barY + BAR_H / 2 + 9}" text-anchor="end" font-size="9" fill="#991b1b">vafot ${mDeathPct}%</text>` : ''}
          </g>
          <!-- Ayol bar -->
          <g class="pyramid-bar-f" style="opacity:1;transition:opacity .15s">
            <title>${tooltip_f}</title>
            <rect x="${fBarX}" y="${barY}" width="${fW}" height="${BAR_H}" rx="3" fill="${this.COLOR_FEMALE}"/>
            ${fDW > 0 ? `<rect x="${fDeathX}" y="${barY}" width="${fDW}" height="${BAR_H}" rx="3" fill="${this.COLOR_DEATH}"/>` : ''}
            <!-- Son (bar tashqarisida o'ngda) -->
            ${d.fTotal > 0 ? `<text x="${fBarX + fW + this.LABEL_PAD}" y="${barY + BAR_H / 2 - 4}" text-anchor="start" font-size="11" font-weight="700" fill="#334155">${d.fTotal}</text>` : ''}
            ${fDeathPct ? `<text x="${fBarX + fW + this.LABEL_PAD}" y="${barY + BAR_H / 2 + 9}" text-anchor="start" font-size="9" fill="#991b1b">vafot ${fDeathPct}%</text>` : ''}
          </g>
          <!-- Markaziy yosh labeli -->
          <rect x="${cx - CENTER_W / 2}" y="${barY}" width="${CENTER_W}" height="${BAR_H}" rx="4" fill="#f8fafc"/>
          <text x="${cx}" y="${barY + BAR_H / 2 + 1}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="700" fill="#475569">${group}</text>
        </g>
      `;
    }).join('');

    // Ustun sarlavhalari
    const colHeaders = `
      <text x="${cx - CENTER_W / 2 - 8}" y="${TOP_PAD - 14}" text-anchor="end" font-size="11" font-weight="700" fill="#64748b" letter-spacing="0.1em">ERKAK</text>
      <text x="${cx}" y="${TOP_PAD - 14}" text-anchor="middle" font-size="11" font-weight="700" fill="#64748b" letter-spacing="0.1em">YOSH</text>
      <text x="${cx + CENTER_W / 2 + 8}" y="${TOP_PAD - 14}" text-anchor="start" font-size="11" font-weight="700" fill="#64748b" letter-spacing="0.1em">AYOL</text>
      <!-- Ajratuvchi chiziqlar -->
      <line x1="${cx - CENTER_W / 2}" y1="${TOP_PAD - 20}" x2="${cx - CENTER_W / 2}" y2="${H - 8}" stroke="#e2e8f0" stroke-width="0.5"/>
      <line x1="${cx + CENTER_W / 2}" y1="${TOP_PAD - 20}" x2="${cx + CENTER_W / 2}" y2="${H - 8}" stroke="#e2e8f0" stroke-width="0.5"/>
    `;

    // Header: sarlavha + sub-sarlavha
    const header = `
      <text x="${cx}" y="18" text-anchor="middle" font-size="13" font-weight="800" fill="#1e293b">
        <tspan fill="${dotColor}">●</tspan> ${title} — ${totalAll.toLocaleString()} ta bemor
      </text>
      <text x="${cx}" y="36" text-anchor="middle" font-size="11" fill="#64748b">
        Erkak: ${totalM} ta (${mPct}%)  ·  Ayol: ${totalF} ta (${fPct}%)  ·  Umumiy vafot: ${deathPct}%
      </text>
    `;

    // Legenda
    const legY = H - 18;
    const legend = `
      <rect x="${cx - 100}" y="${legY - 10}" width="12" height="12" rx="2" fill="${this.COLOR_MALE}"/>
      <text x="${cx - 84}" y="${legY}" font-size="10" fill="#475569">Erkak</text>
      <rect x="${cx - 30}" y="${legY - 10}" width="12" height="12" rx="2" fill="${this.COLOR_FEMALE}"/>
      <text x="${cx - 14}" y="${legY}" font-size="10" fill="#475569">Ayol</text>
      <rect x="${cx + 42}" y="${legY - 10}" width="12" height="12" rx="2" fill="${this.COLOR_DEATH}"/>
      <text x="${cx + 58}" y="${legY}" font-size="10" fill="#475569">to'q qism — vafot etgan</text>
    `;

    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg" style="font-family:Inter,system-ui,sans-serif;overflow:visible">
        ${header}
        ${colHeaders}
        ${rows}
        ${legend}
      </svg>
    `;

    // Hover effect
    el.querySelectorAll('.pyramid-bar-m, .pyramid-bar-f').forEach(g => {
      g.addEventListener('mouseenter', () => { g.style.opacity = '0.72'; });
      g.addEventListener('mouseleave', () => { g.style.opacity = '1'; });
    });
  }
};
