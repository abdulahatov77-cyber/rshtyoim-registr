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
            <p class="text-slate-500 font-medium">Ma'lumotlar yuklanmoqda...</p>
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
        DB.getViloyatStats()
      ]);
      DashboardPage.renderContent(stats, trend, recent, viloyat);
    } catch (err) {
      const inner = document.getElementById('dashboard-inner');
      if (inner) {
        inner.innerHTML = `
          <div class="card p-12 text-center max-w-lg mx-auto mt-10 shadow-2xl border-red-100">
            <div class="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-inner">⚠️</div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">Yuklashda xatolik</h3>
            <p class="text-slate-500 text-sm mb-6">${err.message}</p>
            <button class="btn btn-primary" onclick="DashboardPage.loadData()">Qayta urinish</button>
          </div>`;
      }
    }
  },

  renderContent(stats, trend, recent, viloyat) {
    const inner = document.getElementById('dashboard-inner');
    if (!inner) return;
    
    inner.innerHTML = `
      <style>
        .stat-card-new {
          background: #ffffff;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px -2px rgba(0,0,0,0.03);
          border: 1px solid rgba(226,232,240,0.8);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        .stat-card-new:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px -5px rgba(0,0,0,0.08);
        }
        .stat-icon-new {
          width: 52px; height: 52px;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px;
        }
        .chart-card {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 4px 20px -2px rgba(0,0,0,0.03);
          border: 1px solid rgba(226,232,240,0.8);
          padding: 24px;
        }
      </style>

      <!-- Welcome Banner -->
      <div class="mb-8 relative overflow-hidden rounded-[28px]" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); box-shadow: 0 20px 40px -15px rgba(30, 58, 138, 0.5);">
        <div class="absolute inset-0 opacity-20" style="background-image: radial-gradient(#60a5fa 1px, transparent 1px); background-size: 20px 20px;"></div>
        <div class="absolute -right-20 -top-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20"></div>
        <div class="absolute -left-20 -bottom-20 w-48 h-48 bg-cyan-400 rounded-full blur-3xl opacity-20"></div>
        
        <div class="relative p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 class="text-3xl font-black text-white tracking-tight mb-2">Xush kelibsiz! 👋</h2>
            <p class="text-blue-200 font-medium opacity-90">Bugun — ${new Date().toLocaleDateString('uz-Cyrl-UZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div class="flex flex-wrap gap-3">
            <button class="btn hover:-translate-y-1 transition-transform duration-300" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-radius: 14px; padding: 12px 20px;" onclick="Router.go('infarkt-yangi')">
              <span class="text-xl mr-2">🫀</span> Yangi Infarkt
            </button>
            <button class="btn hover:-translate-y-1 transition-transform duration-300" style="background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); box-shadow: 0 8px 16px rgba(0,0,0,0.1); border-radius: 14px; padding: 12px 20px;" onclick="Router.go('insult-yangi')">
              <span class="text-xl mr-2">🧠</span> Yangi Insult
            </button>
          </div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="stat-card-new border-l-4 border-l-blue-500">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Jami Aktiv</p>
              <h3 class="text-4xl font-black text-slate-800 tracking-tight">${stats.jami}</h3>
            </div>
            <div class="stat-icon-new bg-blue-50 text-blue-600 shadow-inner">🏥</div>
          </div>
        </div>
        
        <div class="stat-card-new border-l-4 border-l-yellow-400">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Bugun qabul</p>
              <h3 class="text-4xl font-black text-slate-800 tracking-tight">${stats.infarktBugun + stats.insultBugun}</h3>
            </div>
            <div class="stat-icon-new bg-yellow-50 text-yellow-600 shadow-inner">☀️</div>
          </div>
        </div>
        
        <div class="stat-card-new border-l-4 border-l-red-500">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Aktiv Infarkt</p>
              <h3 class="text-4xl font-black text-slate-800 tracking-tight">${stats.infarktAktiv}</h3>
            </div>
            <div class="stat-icon-new bg-red-50 text-red-500 shadow-inner">❤️</div>
          </div>
        </div>
        
        <div class="stat-card-new border-l-4 border-l-purple-500">
          <div class="flex justify-between items-start">
            <div>
              <p class="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Aktiv Insult</p>
              <h3 class="text-4xl font-black text-slate-800 tracking-tight">${stats.insultAktiv}</h3>
            </div>
            <div class="stat-icon-new bg-purple-50 text-purple-600 shadow-inner">🧠</div>
          </div>
        </div>
      </div>

      <!-- Kritik Alert -->
      ${(stats.kritikInfarkt + stats.kritikInsult) > 0 ? `
      <div class="mb-8 p-5 bg-gradient-to-r from-red-50 to-white border border-red-100 rounded-[20px] shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden group">
        <div class="absolute right-0 top-0 w-48 h-48 bg-red-500 rounded-full blur-3xl opacity-5 group-hover:opacity-10 transition-opacity"></div>
        <div class="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-2xl flex-shrink-0 animate-pulse shadow-inner relative z-10">⚠️</div>
        <div class="flex-1 relative z-10">
          <h4 class="font-bold text-red-700 text-lg">Diqqat: Kritik holatdagi bemorlar mavjud!</h4>
          <p class="text-red-600/80 text-sm mt-1">Sizda <span class="font-bold bg-red-100 px-2 py-0.5 rounded">${stats.kritikInfarkt} ta infarkt</span> (Killip III-IV) va <span class="font-bold bg-red-100 px-2 py-0.5 rounded">${stats.kritikInsult} ta insult</span> (NIHSS≥15) og'ir bemorlar qolmoqda.</p>
        </div>
        <button class="btn bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 whitespace-nowrap relative z-10 rounded-xl" onclick="Router.go('bemorlar')">Ko'rish →</button>
      </div>` : ''}

      <!-- Charts Row -->
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        
        <!-- Trend Chart -->
        <div class="chart-card xl:col-span-2">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-lg font-bold text-slate-800">📈 So'nggi 30 kun dinamikasi</h3>
              <p class="text-xs text-slate-400 mt-1">Kunlik qabul qilingan bemorlar soni</p>
            </div>
          </div>
          <div style="height: 250px; position: relative;">
            <canvas id="trend-chart"></canvas>
          </div>
        </div>

        <!-- Pie Chart -->
        <div class="chart-card flex flex-col">
          <div class="mb-4 text-center">
            <h3 class="text-lg font-bold text-slate-800">📊 Kasallik turlari</h3>
            <p class="text-xs text-slate-400 mt-1">Aktiv bemorlar nisbati</p>
          </div>
          <div class="flex-1 flex flex-col items-center justify-center relative">
            <div style="height: 200px; width: 200px; position: relative;">
              <canvas id="pie-chart"></canvas>
            </div>
            <div class="flex gap-6 mt-6 bg-slate-50 px-6 py-3 rounded-full border border-slate-100">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div class="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div> Infarkt
              </div>
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <div class="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></div> Insult
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom Row -->
      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        
        <!-- Viloyat Chart -->
        <div class="chart-card">
          <div class="mb-6">
            <h3 class="text-lg font-bold text-slate-800">🗺️ Hududlar bo'yicha</h3>
            <p class="text-xs text-slate-400 mt-1">Bemorlarning hududiy taqsimoti (Top 10)</p>
          </div>
          <div style="height: 250px; position: relative;">
            <canvas id="viloyat-chart"></canvas>
          </div>
        </div>

        <!-- Recent Patients -->
        <div class="chart-card flex flex-col">
          <div class="flex justify-between items-center mb-6">
            <div>
              <h3 class="text-lg font-bold text-slate-800">🕒 Oxirgi qabullar</h3>
              <div class="flex items-center gap-2 mt-1">
                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span class="text-xs text-slate-400">Jonli efirda yangilanmoqda</span>
              </div>
            </div>
            <button class="btn btn-outline btn-sm rounded-xl" onclick="Router.go('bemorlar')">Barchasi</button>
          </div>
          
          <div class="overflow-y-auto flex-1 custom-scrollbar" style="max-height: 250px; margin: 0 -10px; padding: 0 10px;">
            <div class="flex flex-col gap-3">
              ${recent.length === 0
                ? `<div class="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">Hozircha bemorlar kiritilmagan</div>`
                : recent.map(p => `
                  <div class="group flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-sm hover:shadow-md" onclick="Router.go('bemor-karta',{kt_no:'${p.kt_no}',type:'${p._type}'})">
                    <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner ${p._type==='infarkt' ? 'bg-red-50 text-red-500' : 'bg-purple-50 text-purple-600'}">
                        ${p._type==='infarkt' ? '🫀' : '🧠'}
                      </div>
                      <div>
                        <div class="flex items-center gap-2">
                          <h4 class="font-bold text-slate-800 text-sm sm:text-base">${p.fio || 'Ism kiritilmagan'}</h4>
                          <span class="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">${p.kt_no}</span>
                        </div>
                        <div class="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <span>${p.viloyat || '—'}</span>
                          <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                          <span>${Utils.formatDateTime(p.qabul_vaqt)}</span>
                        </div>
                      </div>
                    </div>
                    <div class="text-slate-300 group-hover:text-blue-500 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        </div>
      </div>
    `;

    // Draw charts using RequestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      DashboardPage.drawTrendChart(trend);
      DashboardPage.drawPieChart(stats);
      DashboardPage.drawViloyatChart(viloyat);
    });
  },

  drawTrendChart(trend) {
    const ctx = document.getElementById('trend-chart')?.getContext('2d');
    if (!ctx) return;
    if (DashboardPage._charts.trend) DashboardPage._charts.trend.destroy();
    
    // Create gradients
    let gradInf = ctx.createLinearGradient(0, 0, 0, 300);
    gradInf.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    gradInf.addColorStop(1, 'rgba(239, 68, 68, 0.0)');
    
    let gradIns = ctx.createLinearGradient(0, 0, 0, 300);
    gradIns.addColorStop(0, 'rgba(168, 85, 247, 0.25)');
    gradIns.addColorStop(1, 'rgba(168, 85, 247, 0.0)');

    DashboardPage._charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.labels,
        datasets: [
          {
            label: 'Infarkt', data: trend.infData,
            borderColor: '#ef4444', backgroundColor: gradInf,
            tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6, borderWidth: 3
          },
          {
            label: 'Insult', data: trend.insData,
            borderColor: '#a855f7', backgroundColor: gradIns,
            tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 6, borderWidth: 3
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { size: 13, family: 'Inter' },
            bodyFont: { size: 13, family: 'Inter' },
            padding: 12, cornerRadius: 8,
            usePointStyle: true, boxWidth: 8
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#94a3b8', maxTicksLimit: 7 } },
          y: { border: { display: false }, grid: { color: '#f1f5f9' }, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11, family: 'Inter' }, color: '#94a3b8' } }
        }
      }
    });
  },

  drawPieChart(stats) {
    const ctx = document.getElementById('pie-chart')?.getContext('2d');
    if (!ctx) return;
    if (DashboardPage._charts.pie) DashboardPage._charts.pie.destroy();
    
    if (stats.infarktAktiv === 0 && stats.insultAktiv === 0) {
      // Empty state
      DashboardPage._charts.pie = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: ['Ma\'lumot yo\'q'], datasets: [{ data: [1], backgroundColor: ['#f1f5f9'], borderWidth: 0 }] },
        options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { display: false }, tooltip: { enabled: false } } }
      });
      return;
    }

    DashboardPage._charts.pie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Infarkt', 'Insult'],
        datasets: [{ 
          data: [stats.infarktAktiv, stats.insultAktiv],
          backgroundColor: ['#ef4444', '#a855f7'], 
          borderWidth: 4, borderColor: '#ffffff', hoverOffset: 8 
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            bodyFont: { size: 14, family: 'Inter', weight: 'bold' },
            padding: 12, cornerRadius: 8, displayColors: false
          }
        },
        cutout: '70%',
        animation: { animateScale: true, animateRotate: true }
      }
    });
  },

  drawViloyatChart(viloyat) {
    const ctx = document.getElementById('viloyat-chart')?.getContext('2d');
    if (!ctx) return;
    if (DashboardPage._charts.viloyat) DashboardPage._charts.viloyat.destroy();
    
    // Default empty chart
    if (!viloyat || viloyat.length === 0) {
      viloyat = [['Ma\'lumot yo\'q', 0]];
    }

    DashboardPage._charts.viloyat = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: viloyat.map(v => v[0].replace(' viloyati', '')),
        datasets: [{ 
          label: 'Aktiv bemorlar', 
          data: viloyat.map(v => v[1]),
          backgroundColor: '#3b82f6', 
          hoverBackgroundColor: '#2563eb',
          borderRadius: 6, 
          borderSkipped: false,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { size: 13, family: 'Inter' },
            bodyFont: { size: 13, family: 'Inter' },
            padding: 10, cornerRadius: 8
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#64748b', maxRotation: 45, minRotation: 45 } },
          y: { border: { display: false }, grid: { color: '#f8fafc' }, beginAtZero: true, ticks: { stepSize: 1, font: { size: 11, family: 'Inter' }, color: '#94a3b8' } }
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
