// ==================== DASHBOARD PAGE ====================
const DashboardPage = {
  _charts: {},
  _realtimeSub: null,

  async render() {
    const user = await Auth.getUser();
    document.getElementById('app').innerHTML = Components.renderLayout(
      'dashboard', 'Dashboard', 'Real-time statistika va ko\'rsatkichlar',
      `<div id="dashboard-inner"><div class="flex items-center justify-center py-20">
        <div class="text-center"><div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p class="text-slate-400 text-sm">Ma'lumotlar yuklanmoqda...</p></div></div></div>`,
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
          <div class="card p-8 text-center">
            <div class="text-4xl mb-3">⚠️</div>
            <p class="text-slate-600 font-semibold">Ma'lumotlarni yuklashda xato</p>
            <p class="text-slate-400 text-sm mt-1">${err.message}</p>
            <button class="btn btn-primary mt-4" onclick="DashboardPage.loadData()">Qayta urinish</button>
          </div>`;
      }
    }
  },

  renderContent(stats, trend, recent, viloyat) {
    const inner = document.getElementById('dashboard-inner');
    if (!inner) return;
    inner.innerHTML = `
      <!-- Header Banner -->
      <div class="dashboard-header mb-6">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 class="text-xl font-black text-white">Xush kelibsiz! 👋</h2>
            <p class="text-blue-200 text-sm mt-1">Bugun — ${new Date().toLocaleDateString('uz-Cyrl-UZ',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</p>
          </div>
          <div class="flex gap-3">
            <button class="btn btn-lg" style="background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3)"
              onclick="Router.go('infarkt-yangi')">
              🫀 Yangi Infarkt
            </button>
            <button class="btn btn-lg" style="background:rgba(255,255,255,0.15);color:#fff;border:1px solid rgba(255,255,255,0.2)"
              onclick="Router.go('insult-yangi')">
              🧠 Yangi Insult
            </button>
          </div>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="stat-card">
          <div class="stat-icon" style="background:#eff6ff">🏥</div>
          <div>
            <div class="stat-value text-blue-700">${stats.jami}</div>
            <div class="stat-label">Jami aktiv bemorlar</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fef9c3">☀️</div>
          <div>
            <div class="stat-value text-yellow-700">${stats.infarktBugun + stats.insultBugun}</div>
            <div class="stat-label">Bugun qabul qilindi</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fee2e2">❤️</div>
          <div>
            <div class="stat-value text-red-600">${stats.infarktAktiv}</div>
            <div class="stat-label">Aktiv infarkt</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#ede9fe">🧠</div>
          <div>
            <div class="stat-value text-purple-700">${stats.insultAktiv}</div>
            <div class="stat-label">Aktiv insult</div>
          </div>
        </div>
      </div>

      <!-- Kritik -->
      ${(stats.kritikInfarkt + stats.kritikInsult) > 0 ? `
      <div class="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-2xl flex items-center gap-3">
        <span class="text-3xl">⚠️</span>
        <div>
          <p class="font-bold text-red-700">Kritik holatdagi bemorlar!</p>
          <p class="text-red-500 text-sm">Infarkt (Killip III-IV): <b>${stats.kritikInfarkt}</b> ta · Insult (NIHSS≥15): <b>${stats.kritikInsult}</b> ta</p>
        </div>
        <button class="btn btn-danger btn-sm ml-auto" onclick="Router.go('bemorlar')">Ko'rish →</button>
      </div>` : ''}

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <!-- Trend Chart -->
        <div class="card lg:col-span-2">
          <div class="card-header">
            <span class="card-title">📈 So'nggi 30 kun trend</span>
            <span class="text-xs text-slate-400">Kunlik qabul dinamikasi</span>
          </div>
          <div class="card-body">
            <canvas id="trend-chart" height="200"></canvas>
          </div>
        </div>

        <!-- Pie Chart -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">📊 Tur nisbati</span>
            <span class="text-xs text-slate-400">Aktiv bemorlar</span>
          </div>
          <div class="card-body flex flex-col items-center">
            <canvas id="pie-chart" height="180" width="180"></canvas>
            <div class="flex gap-4 mt-3">
              <div class="flex items-center gap-1 text-xs text-slate-600">
                <div class="w-3 h-3 rounded-full" style="background:#ef4444"></div> Infarkt (${stats.infarktAktiv})
              </div>
              <div class="flex items-center gap-1 text-xs text-slate-600">
                <div class="w-3 h-3 rounded-full" style="background:#8b5cf6"></div> Insult (${stats.insultAktiv})
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Viloyat Chart -->
      <div class="card mb-6">
        <div class="card-header">
          <span class="card-title">🗺️ Viloyatlar bo'yicha taqsimot</span>
          <span class="text-xs text-slate-400">Aktiv bemorlar soni</span>
        </div>
        <div class="card-body">
          <canvas id="viloyat-chart" height="120"></canvas>
        </div>
      </div>

      <!-- Recent Patients -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">🕐 So'nggi qabul qilinganlar</span>
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-xs text-slate-400">Real-time</span>
            <button class="btn btn-outline btn-sm" onclick="Router.go('bemorlar')">Barchasi →</button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Turi</th><th>K/T No</th><th>Bemor F.I.O</th>
                <th>Yosh · Jins</th><th>Viloyat</th><th>Qabul vaqti</th><th>Holat</th><th></th>
              </tr>
            </thead>
            <tbody id="recent-tbody">
              ${recent.length === 0
                ? `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">Hali bemor yo'q</div></div></td></tr>`
                : recent.map(p => Components.patientRow(p, p._type)).join('')
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Draw charts
    DashboardPage.drawTrendChart(trend);
    DashboardPage.drawPieChart(stats);
    DashboardPage.drawViloyatChart(viloyat);
  },

  drawTrendChart(trend) {
    const ctx = document.getElementById('trend-chart')?.getContext('2d');
    if (!ctx) return;
    if (DashboardPage._charts.trend) DashboardPage._charts.trend.destroy();
    DashboardPage._charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels: trend.labels,
        datasets: [
          {
            label: 'Infarkt', data: trend.infData,
            borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',
            tension: 0.4, fill: true, pointRadius: 3, borderWidth: 2
          },
          {
            label: 'Insult', data: trend.insData,
            borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.08)',
            tension: 0.4, fill: true, pointRadius: 3, borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { position: 'top', labels: { font: { size: 12 } } } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }
        }
      }
    });
  },

  drawPieChart(stats) {
    const ctx = document.getElementById('pie-chart')?.getContext('2d');
    if (!ctx) return;
    if (DashboardPage._charts.pie) DashboardPage._charts.pie.destroy();
    DashboardPage._charts.pie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Infarkt', 'Insult'],
        datasets: [{ data: [stats.infarktAktiv, stats.insultAktiv],
          backgroundColor: ['#ef4444', '#8b5cf6'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false } },
        cutout: '65%'
      }
    });
  },

  drawViloyatChart(viloyat) {
    const ctx = document.getElementById('viloyat-chart')?.getContext('2d');
    if (!ctx) return;
    if (DashboardPage._charts.viloyat) DashboardPage._charts.viloyat.destroy();
    DashboardPage._charts.viloyat = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: viloyat.map(v => v[0]),
        datasets: [{ label: 'Bemorlar', data: viloyat.map(v => v[1]),
          backgroundColor: 'rgba(37,99,235,0.7)', borderRadius: 6, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } } }
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
