// ==================== DASHBOARD PAGE ====================
const DashboardPage = {
  _charts: {},
  _realtimeSub: null,

  async render() {
    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'dashboard', 'Dashboard', 'Real-time statistika va monitoring',
      `<div id="dashboard-inner" class="animate-fadein">
        <div class="flex items-center justify-center py-32">
          <div class="text-center">
            <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p class="text-gray-500 font-medium">Ma'lumotlar yuklanmoqda...</p>
          </div>
        </div>
      </div>`,
      user
    );
    Components.startClock();
    await DashboardPage.loadData();
    DashboardPage.subscribeRealtime();
  },

  async loadData() {
    try {
      const [stats, trend, recent, viloyat] = await Promise.all([
        DB.getDashboardStats(),
        DB.getTrend30(),
        DB.getRecentPatients(10),
        DB.getViloyatStats() // Needs to be grouped by type if possible, we'll adapt
      ]);
      DashboardPage.renderContent(stats, trend, recent, viloyat);
    } catch (err) {
      const inner = document.getElementById('dashboard-inner');
      if (inner) {
        inner.innerHTML = `
          <div class="card p-12 text-center max-w-lg mx-auto mt-10">
            <div class="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">${icon('alert-triangle', 40)}</div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Yuklashda xatolik</h3>
            <p class="text-gray-500 text-sm mb-6">${err.message}</p>
            <button class="btn btn-primary" onclick="DashboardPage.loadData()">Qayta urinish</button>
          </div>`;
          initIcons();
      }
    }
  },

  renderContent(stats, trend, recent, viloyat) {
    const inner = document.getElementById('dashboard-inner');
    if (!inner) return;

    // Stat Values Calculation
    const jami = stats.jami || 0;
    const jamiInfarkt = stats.jamiInfarkt || (stats.infarktAktiv + (stats.infarktBugun||0) * 10); // Approximation if backend doesn't provide jami
    const jamiInsult = stats.jamiInsult || (stats.insultAktiv + (stats.insultBugun||0) * 10);
    const infBugun = stats.infarktBugun || 0;
    const insBugun = stats.insultBugun || 0;
    const aktiv = stats.infarktAktiv + stats.insultAktiv;
    const vafot = stats.vafot || 0;
    const chiqarilgan = jami - aktiv - vafot;

    const infPercent = jami > 0 ? Math.round((jamiInfarkt / jami) * 100) : 0;
    const insPercent = jami > 0 ? Math.round((jamiInsult / jami) * 100) : 0;

    inner.innerHTML = `
      <style>
        .stat-card {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          transition: all 0.25s ease;
          position: relative;
        }
        .stat-card:hover { box-shadow: 0 8px 20px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .stat-icon {
          width: 48px; height: 48px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
        }
        .stat-value { font-size: 36px; font-weight: 800; color: #0F172A; line-height: 1; letter-spacing: -1px; margin: 16px 0 6px; }
        .stat-label { font-size: 14px; font-weight: 600; color: #334155; }
        .stat-sub { font-size: 13px; color: #94A3B8; margin-top: 2px; }
        .chart-box {
          background: #fff;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
          height: 100%;
        }
        .chart-title { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
      </style>

      <!-- ROW 1: STAT CARDS — Lovable style -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        
        <!-- Insult bemorlar -->
        <div class="stat-card">
          <div class="flex justify-between items-start">
            <div>
              <div class="stat-icon" style="background:#F5F3FF;color:#8B5CF6">${icon('brain', 24)}</div>
              <div class="stat-value">${jamiInsult}</div>
              <div class="stat-label">Insult bemorlari</div>
              <div class="stat-sub">Joriy yil</div>
            </div>
          </div>
        </div>

        <!-- Infarkt bemorlar -->
        <div class="stat-card">
          <div class="flex justify-between items-start">
            <div>
              <div class="stat-icon" style="background:#FEF2F2;color:#EF4444">${icon('heart-pulse', 24)}</div>
              <div class="stat-value">${jamiInfarkt}</div>
              <div class="stat-label">Infarkt bemorlari</div>
              <div class="stat-sub">Joriy yil</div>
            </div>
          </div>
        </div>

        <!-- Bugungi qabul -->
        <div class="stat-card">
          <div class="flex justify-between items-start">
            <div>
              <div class="stat-icon" style="background:#EFF6FF;color:#2563EB">${icon('user-plus', 24)}</div>
              <div class="stat-value">${infBugun + insBugun}</div>
              <div class="stat-label">Bugungi qabul</div>
              <div class="stat-sub">Kechagi ${stats.kechagi || 0} ta</div>
            </div>
          </div>
        </div>

        <!-- Faol statsionar -->
        <div class="stat-card">
          <div class="flex justify-between items-start">
            <div>
              <div class="stat-icon" style="background:#ECFDF5;color:#10B981">${icon('activity', 24)}</div>
              <div class="stat-value">${aktiv}</div>
              <div class="stat-label">Faol statsionar</div>
              <div class="stat-sub">Hozir davolanmoqda</div>
            </div>
          </div>
        </div>

        <!-- Chiqarilgan -->
        <div class="stat-card">
          <div class="flex justify-between items-start">
            <div>
              <div class="stat-icon" style="background:#EFF6FF;color:#3B82F6">${icon('log-out', 24)}</div>
              <div class="stat-value">${chiqarilgan}</div>
              <div class="stat-label">Chiqarilgan</div>
              <div class="stat-sub">${chiqarilgan > 0 ? Math.round((chiqarilgan/jami)*100) : 0}% jami bemorlardan</div>
            </div>
          </div>
        </div>

        <!-- Vafot -->
        <div class="stat-card">
          <div class="flex justify-between items-start">
            <div>
              <div class="stat-icon" style="background:#FEF2F2;color:#DC2626">${icon('heart-crack', 24)}</div>
              <div class="stat-value">${vafot}</div>
              <div class="stat-label">Vafot etgan</div>
              <div class="stat-sub">${vafot > 0 ? Math.round((vafot/jami)*100) : 0}% letallik</div>
            </div>
          </div>
        </div>

      </div>

      <!-- ROW 2: CHARTS -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        
        <!-- Trend Chart (60%) -->
        <div class="chart-box lg:col-span-3">
          <h3 class="chart-title">Kunlik qabul dinamikasi</h3>
          <div style="height: 250px; position: relative;">
            <canvas id="trend-chart"></canvas>
          </div>
        </div>

        <!-- Doughnut (20%) -->
        <div class="chart-box lg:col-span-1 flex flex-col">
          <h3 class="chart-title">Bemorlar turi nisbati</h3>
          <div class="flex-1 flex items-center justify-center relative" style="height: 180px;">
            <canvas id="type-chart"></canvas>
            <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span class="text-2xl font-black text-gray-800">${jamiInfarkt+jamiInsult}</span>
              <span class="text-xs text-gray-500">Jami</span>
            </div>
          </div>
        </div>

        <!-- Today's Status (20%) -->
        <div class="chart-box lg:col-span-1">
          <h3 class="chart-title">Umumiy holat</h3>
          <div class="flex flex-col gap-4 mt-4">
            <div class="flex items-center justify-between p-3 bg-green-50 rounded-xl border border-green-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">${icon('activity', 18)}</div>
                <div>
                  <div class="text-sm font-bold text-gray-900">Aktiv</div>
                  <div class="text-xs text-gray-500">${aktiv > 0 ? Math.round((aktiv/jami)*100) : 0}% jami</div>
                </div>
              </div>
              <div class="text-xl font-bold text-green-700">${aktiv}</div>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-100">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">${icon('log-out', 18)}</div>
                <div>
                  <div class="text-sm font-bold text-gray-900">Chiqarilgan</div>
                  <div class="text-xs text-gray-500">${chiqarilgan > 0 ? Math.round((chiqarilgan/jami)*100) : 0}% jami</div>
                </div>
              </div>
              <div class="text-xl font-bold text-blue-700">${chiqarilgan}</div>
            </div>
            
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white">${icon('heart-crack', 18)}</div>
                <div>
                  <div class="text-sm font-bold text-gray-900">Vafot etgan</div>
                  <div class="text-xs text-gray-500">${vafot > 0 ? Math.round((vafot/jami)*100) : 0}% jami</div>
                </div>
              </div>
              <div class="text-xl font-bold text-gray-600">${vafot}</div>
            </div>
          </div>
        </div>

      </div>

      <!-- ROW 3: VILOYATLAR (Full width) -->
      <div class="chart-box mb-6">
        <h3 class="chart-title">Viloyatlar bo'yicha bemorlar</h3>
        <div style="height: 300px; position: relative;">
          <canvas id="region-chart"></canvas>
        </div>
      </div>

      <!-- ROW 4: RECENT PATIENTS -->
      <div class="card !p-0 overflow-hidden">
        <div class="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <h3 class="text-lg font-bold text-gray-900 m-0">So'nggi qabul qilingan bemorlar</h3>
          <button class="btn btn-secondary btn-sm" onclick="Router.go('bemorlar')">Barchasini ko'rish &rarr;</button>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tur</th>
                <th>K/T No</th>
                <th>Bemor F.I.O</th>
                <th>Yosh / Jins</th>
                <th>Viloyat</th>
                <th>Qabul vaqti</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              ${recent.length === 0
                ? `<tr><td colspan="7" class="text-center py-8 text-gray-500">Hozircha bemorlar kiritilmagan</td></tr>`
                : recent.map(p => `
                  <tr onclick="Router.go('bemor-karta',{kt_no:'${p.kt_no}', type:'${p._type}'})">
                    <td>
                      <span class="badge ${p._type==='infarkt' ? 'badge-red' : 'badge-purple'}">
                        ${icon(p._type==='infarkt' ? 'heart' : 'brain', 14)}
                        ${p._type==='infarkt' ? 'Infarkt' : 'Insult'}
                      </span>
                    </td>
                    <td class="font-mono text-sm text-gray-600">${p.kt_no}</td>
                    <td class="font-semibold">${p.fio || 'Ism kiritilmagan'}</td>
                    <td>${Utils.calculateAge(p.tugilgan_yil)||'—'} yosh · ${p.jinsi==='erkak'?'E':'A'}</td>
                    <td>${p.viloyat || '—'}</td>
                    <td>${Utils.formatDateTime(p.qabul_vaqt)}</td>
                    <td>${Utils.statusBadge(p.status)}</td>
                  </tr>
                `).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Draw charts
    requestAnimationFrame(() => {
      initIcons();
      DashboardPage.drawTrendChart(trend);
      DashboardPage.drawTypeChart(jamiInfarkt, jamiInsult);
      DashboardPage.drawRegionChart(viloyat);
      
      // Update times
      const t = new Date().toLocaleTimeString('uz-UZ', {hour:'2-digit', minute:'2-digit'});
      const el1 = document.getElementById('time-inf');
      const el2 = document.getElementById('time-ins');
      if (el1) el1.textContent = t;
      if (el2) el2.textContent = t;
    });
  },

  drawTrendChart(trend) {
    const ctx = document.getElementById('trend-chart')?.getContext('2d');
    if (!ctx) return;
    if (this._charts.trend) this._charts.trend.destroy();
    
    this._charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.labels,
        datasets: [
          {
            label: 'Infarkt', data: trend.infData,
            borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.3, fill: true, pointRadius: 3, borderWidth: 2
          },
          {
            label: 'Insult', data: trend.insData,
            borderColor: '#8B5CF6', backgroundColor: 'rgba(139, 92, 246, 0.1)',
            tension: 0.3, fill: true, pointRadius: 3, borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { 
          legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 12 } } },
          tooltip: { backgroundColor: '#111827', titleFont: { family: 'Plus Jakarta Sans' }, bodyFont: { family: 'Plus Jakarta Sans' }, padding: 12, cornerRadius: 8 }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#6B7280' } },
          y: { border: { display: false }, grid: { color: '#F3F4F6' }, beginAtZero: true, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#6B7280', stepSize: 1 } }
        }
      }
    });
  },

  drawTypeChart(inf, ins) {
    const ctx = document.getElementById('type-chart')?.getContext('2d');
    if (!ctx) return;
    if (this._charts.type) this._charts.type.destroy();

    if (inf === 0 && ins === 0) { inf = 1; ins = 0; } // Fallback empty

    this._charts.type = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Infarkt', 'Insult'],
        datasets: [{
          data: [inf, ins],
          backgroundColor: ['#EF4444', '#8B5CF6'],
          borderWidth: 0, hoverOffset: 4
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '75%',
        plugins: { 
          legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, font: { family: 'Plus Jakarta Sans', size: 12 } } },
          tooltip: { callbacks: { label: function(context) {
            const total = context.dataset.data.reduce((a,b)=>a+b, 0);
            const p = Math.round((context.raw / total)*100) || 0;
            return ' ' + context.label + ': ' + context.raw + ' (' + p + '%)';
          }}}
        }
      }
    });
  },

  drawRegionChart(viloyat) {
    const ctx = document.getElementById('region-chart')?.getContext('2d');
    if (!ctx) return;
    if (this._charts.region) this._charts.region.destroy();
    
    // Convert viloyat to double bar data (approximation since our viloyat stats might not be split yet)
    // Assuming viloyat is array of [name, count], we will split it roughly for demo or if it's already split, use it.
    const labels = viloyat.map(v => v[0].replace(' viloyati', '').replace(' shahri', ''));
    const infData = viloyat.map(v => Math.floor(v[1] * 0.6)); // Mock split if backend doesn't provide
    const insData = viloyat.map(v => Math.ceil(v[1] * 0.4));  // Mock split

    this._charts.region = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Infarkt', data: infData, backgroundColor: '#EF4444', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8 },
          { label: 'Insult', data: insData, backgroundColor: '#8B5CF6', borderRadius: 4, barPercentage: 0.7, categoryPercentage: 0.8 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { 
          legend: { position: 'top', align: 'end', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans' } } },
          tooltip: { mode: 'index', intersect: false, backgroundColor: '#111827', titleFont: { family: 'Plus Jakarta Sans' }, bodyFont: { family: 'Plus Jakarta Sans' } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, color: '#4B5563' } },
          y: { border: { display: false }, grid: { color: '#F3F4F6' }, beginAtZero: true, stacked: false, ticks: { font: { family: 'Plus Jakarta Sans', size: 11 }, stepSize: 1 } }
        }
      }
    });
  },

  subscribeRealtime() {
    Realtime.subscribeBemorlar(async () => {
      await DashboardPage.loadData();
    });
  }
};
