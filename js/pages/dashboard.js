// ==================== DASHBOARD PAGE ====================
const DashboardPage = {
  _charts: {},
  _realtimeSub: null,
  _viewViloyat: undefined,
  _chartMode: 'abs', // 'abs' | '100k'
  _regionData: [],
  _regionProfile: null,

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    DashboardPage._profile = profile;
    
    document.getElementById('app').innerHTML = Components.renderLayout(
      'dashboard', 'Bosh sahifa', 'Real-time statistika va monitoring',
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
      const profile = await Profile.getCurrent();
      const ov = DashboardPage._viewViloyat;
      const [stats, trend, trend12, recent, viloyat, demo, riskFactors, longStay, genderMort] = await Promise.all([
        DB.getDashboardStats(ov),
        DB.getTrend30(ov),
        DB.getTrend12Month(ov),
        DB.getRecentPatients(10, ov),
        DB.getViloyatStats(ov),
        DB.getDemographics(ov),
        DB.getRiskFactors(ov),
        DB.getLongStayPatients(ov),
        DB.getGenderMortality(ov)
      ]);
      DashboardPage._recentPatients = recent;
      DashboardPage.renderContent(stats, trend, trend12, recent, viloyat, profile, demo, riskFactors, longStay, genderMort);
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

  renderContent(stats, trend, trend12, recent, viloyat, profile, demo, riskFactors, longStay = [], genderMort = null) {
    const inner = document.getElementById('dashboard-inner');
    if (!inner) return;

    const isFiltered = profile?.role !== 'super_admin' && !!profile?.viloyat;
    const distTitle = isFiltered ? `${profile?.viloyat} muassasalari bo'yicha` : "Viloyatlar bo'yicha grafik";

    // Gender Calculation
    const infM = demo.infarkt.male, infF = demo.infarkt.female, infT = (infM + infF) || 1;
    const insM = demo.insult.male, insF = demo.insult.female, insT = (insM + insF) || 1;
    
    const infMP = Math.round((infM/infT)*100), infFP = 100 - infMP;
    const insMP = Math.round((insM/insT)*100), insFP = 100 - insMP;

    // Stat Values Calculation
    const jami = stats.jami || 0;
    const jamiInfarkt = stats.jamiInfarkt || 0;
    const jamiInsult = stats.jamiInsult || 0;

    const aktivInfarkt = stats.infarktAktiv || 0;
    const aktivInsult = stats.insultAktiv || 0;

    const vafotInfarkt = stats.vafotInfarkt || 0;
    const vafotInsult = stats.vafotInsult || 0;

    const chiqarilganInfarkt = stats.chiqarilganInfarkt || 0;
    const chiqarilganInsult = stats.chiqarilganInsult || 0;
    const otkazilganInfarkt = stats.otkazilganInfarkt || 0;
    const otkazilganInsult = stats.otkazilganInsult || 0;

    const bugunInfarkt = stats.infarktBugun || 0;
    const bugunInsult = stats.insultBugun || 0;
    const bugunJami = bugunInfarkt + bugunInsult;

    // Jami 18+ aholi (respublika yoki tanlangan viloyat)
    const aholiMap = APP_CONFIG.AHOLI_18PLUS || {};
    const viewVil = DashboardPage._viewViloyat;
    const jamiAholi = viewVil
      ? (aholiMap[viewVil] || 0)
      : Object.values(aholiMap).reduce((a, b) => a + b, 0);
    const per100k = jamiAholi > 0 ? +((jami / jamiAholi) * 100000).toFixed(1) : null;

    // O'tgan hafta vs bu hafta trend (oxirgi 30 kundan)
    const spark7 = trend ? trend.infData.slice(-7).map((v,i) => v + (trend.insData[trend.insData.length-7+i]||0)) : [];
    const thisWeek = spark7.reduce((a,b) => a+b, 0);
    const prevWeek = trend ? (trend.infData.slice(-14,-7).map((v,i) => v + (trend.insData[trend.insData.length-14+i]||0))).reduce((a,b)=>a+b,0) : 0;
    const weekDiff = prevWeek > 0 ? Math.round(((thisWeek - prevWeek) / prevWeek) * 100) : null;
    const weekTrend = weekDiff !== null ? (weekDiff > 0 ? `↑${weekDiff}%` : weekDiff < 0 ? `↓${Math.abs(weekDiff)}%` : '→0%') : null;
    const weekTrendColor = weekDiff > 0 ? 'text-red-300' : weekDiff < 0 ? 'text-emerald-300' : 'text-slate-400';

    // Sparkline SVG (7 kun)
    const renderSparkline = (data, color) => {
      if (!data || data.length < 2) return '';
      const max = Math.max(...data, 1);
      const w = 80, h = 28, pts = data.map((v,i) => `${Math.round(i*(w/(data.length-1)))},${Math.round(h - (v/max)*h)}`).join(' ');
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none"><polyline points="${pts}" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="${pts.split(' ').pop().split(',')[0]}" cy="${pts.split(' ').pop().split(',')[1]}" r="3" fill="${color}"/></svg>`;
    };

    const isSuperAdmin = profile?.role === 'super_admin';
    const viewViloyat = DashboardPage._viewViloyat;
    const viloyatlarList = APP_CONFIG.VILOYATLAR || [];

    inner.innerHTML = `
      ${isSuperAdmin ? `
      <!-- VILOYAT FILTER (faqat super_admin) -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6 flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-2 mr-2">
          <div class="w-7 h-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">${icon('map-pin', 14)}</div>
          <span class="text-xs font-bold text-slate-600 uppercase tracking-wider">Ko'rish rejimi:</span>
        </div>
        <button onclick="DashboardPage.setViewViloyat(undefined)"
          class="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${!viewViloyat ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}">
          Barcha viloyatlar
        </button>
        ${viloyatlarList.map(v => {
          const safeV = v.replace(/'/g, "\\'");
          const isActive = viewViloyat === v;
          const cls = isActive ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100';
          const label = v.replace(' viloyati','').replace(' Respublikasi','');
          return `<button onclick="DashboardPage.setViewViloyat('${safeV}')" class="px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${cls}">${label}</button>`;
        }).join('')}
      </div>
      ` : ''}

      <!-- ROW 1: KPI CARDS (TOP 6) -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-10" style="align-items:stretch">
        <!-- 1. Jami Qabul Qilingan Bemorlar -->
        <div class="bg-slate-700 p-7 rounded-[32px] border border-slate-600 shadow-2xl hover:shadow-slate-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute -right-10 -top-10 w-32 h-32 bg-slate-500/10 rounded-full blur-3xl group-hover:bg-slate-500/20 transition-all"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-slate-500/20 text-slate-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('database', 26)}</div>
            <span class="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">JAMI BAZA</span>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">Jami Qabul Qilingan</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${jami.toLocaleString()}</h3>
          ${weekTrend ? `<div class="mt-1 relative z-10"><span class="text-xs font-bold ${weekTrendColor}">${weekTrend} o'tgan hafta</span></div>` : '<div class="mt-1"></div>'}
          ${per100k !== null ? `
          <div class="mt-3 relative z-10 bg-indigo-500/15 rounded-xl px-3 py-2 border border-indigo-400/20">
            <div class="text-[10px] text-indigo-300/70 font-semibold uppercase tracking-wide mb-0.5">Kasallik darajasi</div>
            <div class="text-lg font-black text-indigo-200">${per100k} <span class="text-sm font-semibold text-indigo-300/70">/ 100 000</span></div>
            <div class="text-[10px] text-slate-500 mt-0.5">18+ aholi: ${(jamiAholi/1000000).toFixed(2)} mln</div>
          </div>` : ''}
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-slate-600/50 rounded-xl border border-slate-500/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-400 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">Infarkt</span></div>
              <span class="text-base font-black text-white">${jamiInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-slate-600/50 rounded-xl border border-slate-500/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-400 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">Insult</span></div>
              <span class="text-base font-black text-white">${jamiInsult}</span>
            </div>
          </div>
        </div>

        <!-- 2. Bugungi Yangi Bemorlar -->
        <div class="bg-blue-600 p-7 rounded-[32px] shadow-2xl shadow-blue-900/30 hover:shadow-blue-500/40 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute -right-16 -bottom-16 w-56 h-56 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-white/20 text-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500">${icon('activity', 26)}</div>
            <span class="text-[11px] font-black text-blue-100 uppercase tracking-[0.2em]">BUGUN</span>
          </div>
          <p class="text-blue-100/80 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">Yangi Qabullar</p>
          <h3 class="text-6xl font-black text-white tracking-tighter relative z-10">${bugunJami}</h3>
          <div class="mt-2 relative z-10 flex items-center gap-2">
            ${renderSparkline(spark7, 'rgba(255,255,255,0.8)')}
            <span class="text-[10px] text-blue-200 font-semibold">7 kun</span>
          </div>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-white/10 rounded-xl border border-white/10">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-white rounded-full"></span><span class="text-[12px] font-bold text-white">Infarkt</span></div>
              <span class="text-base font-black text-white">${bugunInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-white/10 rounded-xl border border-white/10">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-white/50 rounded-full"></span><span class="text-[12px] font-bold text-blue-100">Insult</span></div>
              <span class="text-base font-black text-white">${bugunInsult}</span>
            </div>
          </div>
        </div>

        <!-- 3. Jami Chiqarilgan Bemorlar -->
        <div class="bg-emerald-900 p-7 rounded-[32px] border border-emerald-800 shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute -left-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('log-out', 26)}</div>
            <span class="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">CHIQARILGAN</span>
          </div>
          <p class="text-emerald-500/60 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">Uyga javob berilgan</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(chiqarilganInfarkt + chiqarilganInsult).toLocaleString()}</h3>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-emerald-800/50 rounded-xl border border-emerald-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-400 rounded-full"></span><span class="text-[12px] font-bold text-emerald-100">Infarkt</span></div>
              <span class="text-base font-black text-white">${chiqarilganInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-emerald-800/50 rounded-xl border border-emerald-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-400 rounded-full"></span><span class="text-[12px] font-bold text-emerald-100">Insult</span></div>
              <span class="text-base font-black text-white">${chiqarilganInsult}</span>
            </div>
          </div>
        </div>

        <!-- 4. Statsionarda Davolanayotganlar -->
        <div class="bg-sky-800 p-7 rounded-[32px] border border-sky-700 shadow-2xl hover:shadow-sky-500/30 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute right-0 bottom-0 w-40 h-40 bg-sky-400/10 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-sky-500/20 text-sky-300 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('bed-double', 26)}</div>
            <span class="text-[11px] font-black text-sky-300 uppercase tracking-[0.2em]">AKTIV</span>
          </div>
          <p class="text-sky-300/70 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">Hozir Statsionarda</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(aktivInfarkt + aktivInsult).toLocaleString()}</h3>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-sky-700/50 rounded-xl border border-sky-600/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-400 rounded-full"></span><span class="text-[12px] font-bold text-sky-100">Infarkt</span></div>
              <span class="text-base font-black text-white">${aktivInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-sky-700/50 rounded-xl border border-sky-600/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-300 rounded-full"></span><span class="text-[12px] font-bold text-sky-100">Insult</span></div>
              <span class="text-base font-black text-white">${aktivInsult}</span>
            </div>
          </div>
        </div>

        <!-- 5. Jami Vafot Etganlar -->
        <div class="bg-slate-900 p-7 rounded-[32px] border border-slate-800 shadow-2xl hover:shadow-rose-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col" onclick="DashboardPage.showVafotDetail()">
          <div class="absolute -right-10 -top-10 w-32 h-32 bg-rose-600/5 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('user-x', 26)}</div>
            <div class="px-3 py-1 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <span class="text-sm font-black text-rose-500">${jami > 0 ? ((vafotInfarkt + vafotInsult) / jami * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">Vafot etganlar</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(vafotInfarkt + vafotInsult).toLocaleString()}</h3>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">Infarkt</span></div>
              <span class="text-base font-black text-white">${vafotInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">Insult</span></div>
              <span class="text-base font-black text-white">${vafotInsult}</span>
            </div>
          </div>
        </div>

        <!-- 6. O'tkazilgan Bemorlar -->
        <div class="bg-slate-900 p-7 rounded-[32px] border border-slate-800 shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden flex flex-col">
          <div class="absolute -left-10 -bottom-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-4 relative z-10">
            <div class="w-12 h-12 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('arrow-right-circle', 26)}</div>
            <div class="px-3 py-1 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <span class="text-sm font-black text-amber-500">${jami > 0 ? ((otkazilganInfarkt + otkazilganInsult) / jami * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-1 relative z-10">Boshqa muassasaga</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(otkazilganInfarkt + otkazilganInsult).toLocaleString()}</h3>
          <div class="mt-auto pt-3 flex flex-col gap-2 relative z-10">
            <div class="flex items-center justify-between h-9 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">Infarkt</span></div>
              <span class="text-base font-black text-white">${otkazilganInfarkt}</span>
            </div>
            <div class="flex items-center justify-between h-9 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full"></span><span class="text-[12px] font-bold text-slate-300">Insult</span></div>
              <span class="text-base font-black text-white">${otkazilganInsult}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ROW 2: DYNAMICS CHART (FULL WIDTH) -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Kunlik qabul dinamikasi</h3>
          <div class="flex gap-4">
            <div class="flex items-center gap-1.5"><span class="w-3 h-1 bg-red-500 rounded-full"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">Infarkt</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-1 bg-blue-500 rounded-full"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">Insult</span></div>
          </div>
        </div>
        <div class="h-80"><canvas id="dynamicsChart"></canvas></div>
      </div>

      <!-- ROW 2b: MONTHLY TREND CHART -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <div class="flex items-center justify-between mb-8">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Oylik qabul dinamikasi (so'nggi 12 oy)</h3>
          <div class="flex gap-4">
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-500"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">Infarkt</span></div>
            <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-blue-500"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">Insult</span></div>
          </div>
        </div>
        <div class="h-72"><canvas id="monthlyChart"></canvas></div>
      </div>

      <!-- ROW 3: REGIONAL DISTRIBUTION CHART -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
           <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">${distTitle}</h3>
           <div class="flex items-center gap-3">
             <div class="flex rounded-xl overflow-hidden border border-slate-200 text-xs font-bold">
               <button id="toggleAbs" onclick="DashboardPage.setChartMode('abs')" class="px-3 py-1.5 bg-blue-600 text-white transition-all">Mutlaq son</button>
               <button id="toggle100k" onclick="DashboardPage.setChartMode('100k')" class="px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-50 transition-all">/ 100 000</button>
             </div>
             <div class="flex gap-3">
               <div class="flex items-center gap-1.5"><span class="w-3 h-3 bg-[#dc2626]"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">Infarkt</span></div>
               <div class="flex items-center gap-1.5"><span class="w-3 h-3 bg-[#2563eb]"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">Insult</span></div>
             </div>
           </div>
        </div>
        <div class="w-full" style="height:480px"><canvas id="regionChart"></canvas></div>
      </div>

      <!-- ROW 4: DEMOGRAPHICS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <!-- Gender -->
        <!-- Gender -->
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <h3 class="text-base font-bold text-slate-800 mb-2 text-center tracking-wide uppercase">Jins bo'yicha taqsimot</h3>
          <div class="flex flex-col gap-6 w-full h-full justify-center mt-2">
            <!-- Infarkt -->
            <div class="relative flex flex-col items-center">
              <div class="flex items-center justify-between gap-2 w-full px-2">
                <div class="flex flex-col items-center">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="#38bdf8"><path d="M12 2C10.9 2 10 2.9 10 4s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-1.5 5h3C14.9 7 16 8.1 16 9.5V15h-1.5v6h-5v-6H8V9.5C8 8.1 9.1 7 10.5 7z"/></svg>
                   <span class="text-3xl font-black text-[#2e3150] mt-1">${infMP}%</span>
                   <span class="text-sm font-bold text-slate-500 mt-1">${infM} ta</span>
                </div>
                <div class="relative flex flex-col items-center justify-center">
                   <div class="w-28 h-28 rounded-full shadow-sm" style="background: conic-gradient(#f472b6 0% ${infFP}%, #38bdf8 ${infFP}% 100%);"></div>
                   <span class="absolute bg-white px-2 py-0.5 rounded-full text-xs font-bold text-red-500 shadow-sm -bottom-2">INFARKT</span>
                </div>
                <div class="flex flex-col items-center">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="#f472b6"><path d="M12 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm2.94 5c-.32 0-.6.18-.74.46L13 10.74V22h-2v-11.26l-1.2-3.28A.8.8 0 0 0 9.06 7H9c-.55 0-1 .45-1 1v6h2v8h4v-8h2V8c0-.55-.45-1-1-1h-.06z"/></svg>
                   <span class="text-3xl font-black text-[#2e3150] mt-1">${infFP}%</span>
                   <span class="text-sm font-bold text-slate-500 mt-1">${infF} ta</span>
                </div>
              </div>
              ${genderMort ? (() => {
                const gm = genderMort.infarkt;
                const mDeathP = gm.male > 0 ? ((gm.maleDeath / gm.male) * 100).toFixed(1) : '0.0';
                const fDeathP = gm.female > 0 ? ((gm.femaleDeath / gm.female) * 100).toFixed(1) : '0.0';
                const fHigher = parseFloat(fDeathP) > parseFloat(mDeathP);
                return `<div class="mt-3 w-full flex items-center justify-center gap-3 text-xs">
                  <span class="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold">Erkak vafot: ${mDeathP}%</span>
                  <span class="flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${fHigher ? 'bg-red-50 text-red-600' : 'bg-pink-50 text-pink-700'}">
                    ${fHigher ? '⚠️ ' : ''}Ayol vafot: ${fDeathP}%
                  </span>
                </div>`;
              })() : ''}
            </div>

            <!-- Insult -->
            <div class="relative flex flex-col items-center">
              <div class="flex items-center justify-between gap-2 w-full px-2">
                <div class="flex flex-col items-center">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="#38bdf8"><path d="M12 2C10.9 2 10 2.9 10 4s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-1.5 5h3C14.9 7 16 8.1 16 9.5V15h-1.5v6h-5v-6H8V9.5C8 8.1 9.1 7 10.5 7z"/></svg>
                   <span class="text-3xl font-black text-[#2e3150] mt-1">${insMP}%</span>
                   <span class="text-sm font-bold text-slate-500 mt-1">${insM} ta</span>
                </div>
                <div class="relative flex flex-col items-center justify-center">
                   <div class="w-28 h-28 rounded-full shadow-sm" style="background: conic-gradient(#f472b6 0% ${insFP}%, #38bdf8 ${insFP}% 100%);"></div>
                   <span class="absolute bg-white px-2 py-0.5 rounded-full text-xs font-bold text-blue-500 shadow-sm -bottom-2">INSULT</span>
                </div>
                <div class="flex flex-col items-center">
                   <svg width="40" height="40" viewBox="0 0 24 24" fill="#f472b6"><path d="M12 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm2.94 5c-.32 0-.6.18-.74.46L13 10.74V22h-2v-11.26l-1.2-3.28A.8.8 0 0 0 9.06 7H9c-.55 0-1 .45-1 1v6h2v8h4v-8h2V8c0-.55-.45-1-1-1h-.06z"/></svg>
                   <span class="text-3xl font-black text-[#2e3150] mt-1">${insFP}%</span>
                   <span class="text-sm font-bold text-slate-500 mt-1">${insF} ta</span>
                </div>
              </div>
              ${genderMort ? (() => {
                const gm = genderMort.insult;
                const mDeathP = gm.male > 0 ? ((gm.maleDeath / gm.male) * 100).toFixed(1) : '0.0';
                const fDeathP = gm.female > 0 ? ((gm.femaleDeath / gm.female) * 100).toFixed(1) : '0.0';
                const fHigher = parseFloat(fDeathP) > parseFloat(mDeathP);
                return `<div class="mt-3 w-full flex items-center justify-center gap-3 text-xs">
                  <span class="flex items-center gap-1 px-2 py-1 rounded-lg bg-sky-50 text-sky-700 font-bold">Erkak vafot: ${mDeathP}%</span>
                  <span class="flex items-center gap-1 px-2 py-1 rounded-lg font-bold ${fHigher ? 'bg-red-50 text-red-600' : 'bg-pink-50 text-pink-700'}">
                    ${fHigher ? '⚠️ ' : ''}Ayol vafot: ${fDeathP}%
                  </span>
                </div>`;
              })() : ''}
            </div>
          </div>
        </div>
        <!-- Age Groups -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
          <div class="px-6 pt-5 pb-3 border-b border-slate-100" style="background:linear-gradient(135deg,#eff6ff 0%,#fef2f2 100%)">
            <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wider text-center">Yosh guruhlari bo'yicha taqsimot</h3>
            <div class="flex justify-center gap-6 mt-3">
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-sm" style="background:#3b82f6"></span>
                <span class="text-xs font-semibold text-slate-600">Insult — <b>${Object.values(demo?.insult?.ages||{}).reduce((a,b)=>a+b,0)} ta</b></span>
              </div>
              <div class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-sm" style="background:#ef4444"></span>
                <span class="text-xs font-semibold text-slate-600">Infarkt — <b>${Object.values(demo?.infarkt?.ages||{}).reduce((a,b)=>a+b,0)} ta</b></span>
              </div>
            </div>
          </div>
          <div class="p-4 pb-6" style="min-height:300px;position:relative"><canvas id="ageChart"></canvas></div>
        </div>
      </div>

      <!-- ROW: RISK FACTORS DONUT CHARTS -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            ${icon('heart', 16, 'text-red-500')} Infarkt — xavf omillari
          </h3>
          <div style="position:relative;height:380px">
            <canvas id="riskInfarktChart"></canvas>
          </div>
        </div>
        <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
            ${icon('brain', 16, 'text-blue-500')} Insult — xavf omillari
          </h3>
          <div style="position:relative;height:380px">
            <canvas id="riskInsultChart"></canvas>
          </div>
        </div>
      </div>

      <!-- ROW 4: DETAILED CLINICAL INDICATORS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Infarkt Detail -->
        <div class="bg-white rounded-2xl border-t-4 border-t-red-500 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">${icon('heart-pulse', 20, 'text-red-500')} Infarkt turlari va muolajalar</h3>
            <span class="text-[10px] font-bold text-slate-400">DAVOLANISH / O'LIM</span>
          </div>
          <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${this.renderDetailCard('STEMI', stats.stemi ?? 0, stats.stemiDavol ?? 0, stats.stemiVafot ?? 0)}
            ${this.renderDetailCard('NSTEMI', stats.nstemi ?? 0, stats.nstemiDavol ?? 0, stats.nstemiVafot ?? 0)}
            ${this.renderDetailCard("O'tkir miokard infarkti (AMI)", stats.miokard ?? 0, stats.miokardDavol ?? 0, stats.miokardVafot ?? 0)}
            ${this.renderDetailCard('Koronarangiografiya', stats.koronar ?? 0, stats.koronarDavol ?? 0, stats.koronarVafot ?? 0)}
            ${this.renderDetailCard('Trombolizis (TLT)', stats.trombolizis ?? 0, stats.trombolizisDavol ?? 0, stats.trombolizisVafot ?? 0)}
            ${this.renderDetailCard('Medikamentoz davo', stats.medikamentoz ?? 0, stats.medikamentozDavol ?? 0, stats.medikamentozVafot ?? 0)}
          </div>
        </div>

        <!-- Stroke Detail -->
        <div class="bg-white rounded-2xl border-t-4 border-t-blue-500 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">${icon('brain-circuit', 20, 'text-blue-500')} Insult turlari va muolajalar</h3>
            <span class="text-[10px] font-bold text-slate-400">DAVOLANISH / O'LIM</span>
          </div>
          <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${this.renderDetailCard('Ishemik insult', stats.ishemik ?? 0, stats.ishemikDavol ?? 0, stats.ishemikVafot ?? 0)}
            ${this.renderDetailCard('Gemorragik insult', stats.gemorragik ?? 0, stats.gemorragikDavol ?? 0, stats.gemorragikVafot ?? 0)}
            ${this.renderDetailCard('Tranzitor ishemik ataka (TIA)', stats.tia ?? 0, stats.tiaDavol ?? 0, stats.tiaVafot ?? 0)}
            ${this.renderDetailCard('MSKT bosh miya', stats.mskt ?? 0, stats.msktDavol ?? 0, stats.msktVafot ?? 0)}
            ${this.renderDetailCard('Trombektomiya', stats.trombektomiya ?? 0, stats.trombektomiyaDavol ?? 0, stats.trombektomiyaVafot ?? 0)}
            ${this.renderDetailCard('Medikamentoz davo', stats.insultMedikamentoz ?? 0, stats.insultMedikamentozDavol ?? 0, stats.insultMedikamentozVafot ?? 0)}
          </div>
        </div>
      </div>



      <!-- ROW 6: 15+ KUN DAVOLANAYOTGANLAR -->
      <div class="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden mb-8">
        <div class="p-6 border-b border-orange-50 flex items-center justify-between bg-orange-50/50">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">${icon('clock', 18)}</div>
            <div>
              <h3 class="font-bold text-slate-800">15 kun va undan ko'p davolanayotganlar</h3>
              <p class="text-[11px] text-slate-400 font-medium">Statsionarda 15+ kun qolgan aktiv bemorlar — muassasa bo'yicha</p>
            </div>
          </div>
          <span class="px-3 py-1.5 bg-orange-100 text-orange-700 text-xs font-black rounded-xl border border-orange-200">${longStay.reduce((s,g)=>s+g.bemorlar.length,0)} ta bemor</span>
        </div>
        ${longStay.length === 0 ? `
          <div class="p-10 text-center text-slate-400 font-medium">15 kun va undan ko'p davolanayotgan bemorlar yo'q</div>
        ` : `
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50/50">
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Muassasa</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Bemorlar soni</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Eng uzoq (kun)</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Infarkt / Insult</th>
                <th class="p-4 border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody class="text-sm divide-y divide-slate-50">
              ${longStay.map((g, idx) => {
                const inf = g.bemorlar.filter(b=>b._type==='infarkt').length;
                const ins = g.bemorlar.filter(b=>b._type==='insult').length;
                const maxDays = Math.max(...g.bemorlar.map(b=>b.kunlar));
                return `
                <tr class="hover:bg-orange-50/30 transition-colors">
                  <td class="p-4">
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 bg-orange-100 text-orange-500 rounded-lg flex items-center justify-center">${icon('building-2', 14)}</div>
                      <span class="font-bold text-slate-700">${esc(g.muassasa)}</span>
                    </div>
                  </td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-xs font-black">${g.bemorlar.length} ta</span>
                  </td>
                  <td class="p-4">
                    <span class="px-2.5 py-1 bg-red-50 text-red-700 border border-red-100 rounded-lg text-xs font-black">${maxDays} kun</span>
                  </td>
                  <td class="p-4">
                    <div class="flex gap-2">
                      ${inf > 0 ? `<span class="px-2 py-0.5 bg-red-50 text-red-600 border border-red-100 rounded text-[10px] font-bold">${inf} infarkt</span>` : ''}
                      ${ins > 0 ? `<span class="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold">${ins} insult</span>` : ''}
                    </div>
                  </td>
                  <td class="p-4 text-right">
                    <button class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 transition-all" onclick="DashboardPage.showLongStayDetail(${idx})">
                      Ko'rish
                    </button>
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        `}
      </div>

      <!-- ROW 7: PATIENT LIST TABLE -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 class="font-bold text-slate-800">So'nggi qabul qilingan bemorlar</h3>
          <div class="flex gap-2">
            <button class="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-600 flex items-center gap-1.5 hover:bg-slate-100 transition-all" onclick="Router.go('bemorlar')">
              ${icon('clipboard-list', 14)} Barchasi
            </button>
            <button class="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-[11px] font-bold text-green-700 flex items-center gap-1.5 hover:bg-green-100 transition-all" onclick="DashboardPage.exportExcel()">
              ${icon('file-down', 14)} Excel
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-slate-50/50">
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">K/T No</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Bemor F.I.Sh</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Tashxis</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Qabul vaqti</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Holat</th>
                <th class="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">DQ</th>
                <th class="p-4 text-right border-b border-slate-100"></th>
              </tr>
            </thead>
            <tbody class="text-sm">
              ${recent.map(p => {
                const rawDiag = p._type==='infarkt' ? (p.infarkt_turi || 'Miokard Infarkti') : (p.insult_turi || 'Ishemik Insult');
                const t = rawDiag.toUpperCase();
                let fDiag = t;
                if (t.includes('STEMI')) fDiag = "O'KS ST ELEVATSIYA BILAN (STEMI)";
                else if (t.includes('NSTEMI')) fDiag = "O'KS ST ELEVATSIYASIZ (NSTEMI)";
                else if (t.includes("MIOKARD INFARKTI") || t.includes("AMI")) fDiag = "O'TKIR MIOKARD INFARKTI (AMI)";
                else if (t.includes('TIA') || t.includes('TRANZITOR')) fDiag = "TIA (TRANZITOR ISHEMIK ATAKA)";
                else if (t.includes('GEMORRAGIK')) fDiag = "GEMORRAGIK INSULT";
                else if (t.includes('ISHEMIK')) fDiag = "ISHEMIK INSULT";

                return `
                <tr class="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer transition-colors" onclick="Router.go('bemor-karta',{kt_no:'${p.kt_no}', type:'${p._type}'})">
                  <td class="p-4 text-slate-500 font-mono text-[11px]">${p.kt_no}</td>
                  <td class="p-4">
                    <div class="font-bold text-slate-800">${p.fio || '—'}</div>
                    <div class="text-[10px] text-slate-400 font-medium uppercase mt-0.5">${Utils.calculateAge(p.tugilgan_yil)||'—'} yosh · ${p.jinsi==='Erkak'?'E':'A'}</div>
                  </td>
                  <td class="p-4">
                    <span class="px-2 py-0.5 ${p._type==='infarkt' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'} text-[10px] font-bold rounded border uppercase">
                      ${fDiag}
                    </span>
                  </td>
                  <td class="p-4">
                    <div class="text-slate-700 font-medium">${Utils.formatDate(p.qabul_vaqt)}</div>
                    <div class="text-[10px] text-slate-400 font-bold">${Utils.formatDateTime(p.qabul_vaqt).split(', ')[1] || ''}</div>
                  </td>
                  <td class="p-4">${Utils.statusBadge(p.status)}</td>
                  <td class="p-4">
                    <div class="flex items-center gap-2">
                       <div class="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-green-500 w-[90%]"></div></div>
                       <span class="text-[10px] font-bold text-slate-400">90%</span>
                    </div>
                  </td>
                  <td class="p-4 text-right text-slate-300">${icon('chevron-right', 20)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    DashboardPage._longStayData = longStay;

    // Initialize Charts
    requestAnimationFrame(() => {
      initIcons();
      setTimeout(() => {
        DashboardPage.drawNewCharts(trend, trend12, stats, viloyat, demo, profile, riskFactors);
      }, 300);
    });
  },

  setViewViloyat(viloyat) {
    DashboardPage._viewViloyat = viloyat;
    DashboardPage.loadData();
  },

  setChartMode(mode) {
    DashboardPage._chartMode = mode;
    const btnAbs  = document.getElementById('toggleAbs');
    const btn100k = document.getElementById('toggle100k');
    if (btnAbs)  { btnAbs.className  = mode === 'abs'  ? 'px-3 py-1.5 bg-blue-600 text-white transition-all text-xs font-bold' : 'px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-50 transition-all text-xs font-bold'; }
    if (btn100k) { btn100k.className = mode === '100k' ? 'px-3 py-1.5 bg-blue-600 text-white transition-all text-xs font-bold' : 'px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-50 transition-all text-xs font-bold'; }
    if (DashboardPage._buildRegionChart) DashboardPage._buildRegionChart(mode);
  },

  showLongStayDetail(idx) {
    const group = (DashboardPage._longStayData || [])[idx];
    if (!group) return;
    const rows = group.bemorlar.sort((a, b) => b.kunlar - a.kunlar).map(b => `
      <tr class="border-b border-slate-50 hover:bg-slate-50/50 cursor-pointer" onclick="closeModal(); Router.go('bemor-karta',{kt_no:'${b.kt_no}', type:'${b._type}'})">
        <td class="p-3 font-mono text-[11px] text-slate-500">${esc(b.kt_no)}</td>
        <td class="p-3 font-bold text-slate-700">${esc(b.fio || '—')}</td>
        <td class="p-3 text-slate-500 text-xs">${Utils.calculateAge(b.tugilgan_yil) || '—'} yosh</td>
        <td class="p-3">
          <span class="px-2 py-0.5 ${b._type==='infarkt'?'bg-red-50 text-red-600 border-red-100':'bg-blue-50 text-blue-600 border-blue-100'} text-[10px] font-bold rounded border uppercase">${b._type}</span>
        </td>
        <td class="p-3 text-xs text-slate-500">${Utils.formatDate(b.qabul_vaqt)}</td>
        <td class="p-3">
          <span class="px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-lg text-xs font-black">${b.kunlar} kun</span>
        </td>
      </tr>
    `).join('');
    showModal({
      title: `${esc(group.muassasa)} — 15+ kun bemorlar`,
      size: 'lg',
      body: `
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead><tr class="bg-slate-50">
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">K/T No</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">F.I.Sh</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">Yosh</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">Turi</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">Qabul vaqti</th>
              <th class="p-3 text-[10px] font-bold text-slate-400 uppercase">Kunlar</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `
    });
    initIcons();
  },

  renderAlertItem(ic, title, count, color) {
    const bg = color === 'red' ? 'bg-red-50 text-red-500' : color === 'blue' ? 'bg-blue-50 text-blue-500' : 'bg-slate-100 text-slate-500';
    const text = color === 'red' ? 'text-red-600' : 'text-slate-800';
    return `
      <div class="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl cursor-pointer group transition-all">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 ${bg} rounded-lg flex items-center justify-center">${icon(ic, 16)}</div>
          <span class="text-xs font-semibold text-slate-700">${title}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm font-black ${text}">${count}</span>
          <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors"></i>
        </div>
      </div>
    `;
  },

  renderDetailCard(label, val, davol = null, vafot = null) {
    const hasSub = davol !== null && vafot !== null;
    return `
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
        <p class="text-[11px] font-bold text-slate-600 uppercase mb-2 group-hover:text-blue-600 transition-colors leading-tight">${label}</p>
        <p class="text-2xl font-black text-slate-900 mb-2">${val.toLocaleString()}</p>
        ${hasSub ? `
        <div class="flex gap-2 mt-1">
          <span class="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-md px-2 py-0.5">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            ${davol.toLocaleString()} davolandi
          </span>
          <span class="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-md px-2 py-0.5">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            ${vafot.toLocaleString()} vafot
          </span>
        </div>` : ''}
      </div>
    `;
  },

  renderGoalCard(label, val, target, color) {
    const isGood = color === 'green' ? val <= target : val >= target;
    const barColor = isGood ? 'bg-green-500' : 'bg-red-500';
    const textColor = isGood ? 'text-green-600' : 'text-red-600';
    const percent = Math.min(100, (val / target) * 100);
    return `
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
        <p class="text-[9px] font-bold ${textColor} uppercase mb-1 italic">${label}</p>
        <p class="text-lg font-black text-slate-800">${val} <span class="text-[10px] text-slate-400 font-normal">MIN</span></p>
        <div class="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden"><div class="h-full ${barColor}" style="width:${percent}%"></div></div>
        <p class="text-[8px] text-slate-400 mt-1 uppercase font-bold">Maqsad: ${color==='green'?'<':'>'}${target} min</p>
      </div>
    `;
  },

  renderDQInfo(title, val, color) {
    const text = color === 'red' ? 'text-red-500' : color === 'orange' ? 'text-orange-500' : 'text-slate-700';
    return `
      <div class="flex items-center justify-between text-[11px]">
        <span class="text-slate-500 font-medium">${title}</span>
        <span class="font-black ${text}">${val}</span>
      </div>
    `;
  },

  drawNewCharts(trend, trend12, stats, viloyat, demo, profile, riskFactors) {
    if (window.ChartDataLabels) {
      Chart.register(window.ChartDataLabels);
    }

    // 1. Dynamics Chart
    const ctxD = document.getElementById('dynamicsChart')?.getContext('2d');
    if (ctxD) {
      new Chart(ctxD, {
        type: 'line',
        data: {
          labels: trend.labels,
          datasets: [
            { label: 'Infarkt', data: trend.infData, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.05)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 3 },
            { label: 'Insult',  data: trend.insData, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', fill: true, tension: 0.4, pointRadius: 3, borderWidth: 3 }
          ]
        },
        plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: window.ChartDataLabels ? {
              display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
              align: 'top',
              anchor: 'end',
              color: ctx => ctx.datasetIndex === 0 ? '#ef4444' : '#3b82f6',
              font: { weight: 'bold', size: 11 },
              formatter: v => v > 0 ? v : ''
            } : { display: false }
          },
          scales: {
            x: { grid: { borderDash: [5,5], color: '#f1f5f9' }, ticks: { font: { size: 12, weight: '600' } } },
            y: { grid: { borderDash: [5,5], color: '#f1f5f9' }, ticks: { font: { size: 12, weight: '600' } }, beginAtZero: true }
          }
        }
      });
    }

    // 2. Region/Facility Distribution Chart
    const ctxR = document.getElementById('regionChart')?.getContext('2d');
    if (ctxR) {
      // super_admin bo'lmasa — muassasalar bo'yicha ko'rsatish (viloyat[] dan keladi)
      const isSuperAdminView = profile?.role === 'super_admin' && !DashboardPage._viewViloyat;

      const regionData = (isSuperAdminView
        ? (APP_CONFIG.VILOYATLAR || []).map(rName => {
            const found = (viloyat || []).find(v => v[0] === rName);
            return found ? { name: rName, total: found[1], inf: found[2]||0, ins: found[3]||0 } : { name: rName, total: 0, inf: 0, ins: 0 };
          }).filter(v => v.total > 0)
        : (() => {
            const fromDb = (viloyat || []).map(v => Array.isArray(v) ? { name: v[0], total: v[1], inf: v[2]||0, ins: v[3]||0 } : v);
            const dbNames = new Set(fromDb.map(v => v.name));
            const configNames = APP_CONFIG.MUASSASALAR[DashboardPage._viewViloyat || profile?.viloyat] || [];
            const extra = configNames.filter(n => !dbNames.has(n)).map(n => ({ name: n, total: 0, inf: 0, ins: 0 }));
            return [...fromDb, ...extra];
          })()
      ).sort((a, b) => b.total - a.total);

      DashboardPage._regionData = regionData;
      DashboardPage._regionProfile = profile;

      const aholi = APP_CONFIG.AHOLI_18PLUS || {};
      const getChartData = (mode) => {
        if (mode === '100k') {
          return regionData.map(v => {
            const pop = aholi[v.name] || 0;
            return {
              inf: pop > 0 ? +((v.inf / pop) * 100000).toFixed(2) : 0,
              ins: pop > 0 ? +((v.ins / pop) * 100000).toFixed(2) : 0
            };
          });
        }
        return regionData.map(v => ({ inf: v.inf, ins: v.ins }));
      };

      const buildRegionChart = (mode) => {
        if (DashboardPage._charts.region) {
          DashboardPage._charts.region.destroy();
          delete DashboardPage._charts.region;
        }
        const d = getChartData(mode);
        const is100k = mode === '100k';
        DashboardPage._charts.region = new Chart(ctxR, {
          type: 'bar',
          data: {
            labels: regionData.map(v => v.name),
            datasets: [
              { label: 'Infarkt', data: d.map(v => v.inf), backgroundColor: '#dc2626', borderRadius: 4, borderSkipped: false },
              { label: 'Insult',  data: d.map(v => v.ins), backgroundColor: '#2563eb', borderRadius: 4, borderSkipped: false }
            ]
          },
          plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
          options: {
            responsive: true, maintainAspectRatio: false,
            layout: { padding: { top: 24, bottom: 10 } },
            plugins: {
              legend: {
                display: true, position: 'top', align: 'end',
                labels: { usePointStyle: true, pointStyle: 'rect', font: { weight: '700', size: 12 }, color: '#475569', padding: 20 }
              },
              tooltip: {
                callbacks: {
                  afterBody: (items) => {
                    if (!is100k) return [];
                    const idx = items[0]?.dataIndex;
                    const v = regionData[idx];
                    const pop = aholi[v?.name];
                    return pop ? [`Aholi 18+: ${(pop/1000).toFixed(0)} ming`] : [];
                  }
                }
              },
              datalabels: window.ChartDataLabels ? {
                anchor: 'end', align: 'top',
                display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
                color: ctx => ctx.datasetIndex === 0 ? '#dc2626' : '#2563eb',
                font: { weight: 'bold', size: 11 },
                formatter: v => v > 0 ? v : ''
              } : { display: false }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { font: { size: 12, weight: '600' }, maxRotation: 45, minRotation: 45, autoSkip: false, color: '#475569' }
              },
              y: {
                grid: { borderDash: [5,5], color: '#e2e8f0' },
                ticks: { font: { size: 12, weight: '600' } },
                beginAtZero: true,
                title: { display: is100k, text: '100 000 aholiga nisbatan', font: { size: 11 }, color: '#64748b' }
              }
            }
          }
        });
      };

      buildRegionChart(DashboardPage._chartMode);
      DashboardPage._buildRegionChart = buildRegionChart;
    }

    // 4. Risk Factors Donut Charts
    if (riskFactors) {
      DashboardPage._drawDonut('riskInfarktChart', 'riskInfarktLegend', riskFactors.infarkt, '#ef4444', stats?.jamiInfarkt);
      DashboardPage._drawDonut('riskInsultChart',  'riskInsultLegend',  riskFactors.insult,  '#3b82f6', stats?.jamiInsult);
    }

    // 2b. Monthly Trend Chart
    const ctxM = document.getElementById('monthlyChart')?.getContext('2d');
    if (ctxM && trend12) {
      new Chart(ctxM, {
        type: 'bar',
        data: {
          labels: trend12.labels,
          datasets: [
            { label: 'Infarkt', data: trend12.infData, backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 5, borderSkipped: false },
            { label: 'Insult',  data: trend12.insData, backgroundColor: 'rgba(59,130,246,0.85)', borderRadius: 5, borderSkipped: false }
          ]
        },
        plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            datalabels: window.ChartDataLabels ? {
              anchor: 'end', align: 'top',
              display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
              color: ctx => ctx.datasetIndex === 0 ? '#dc2626' : '#2563eb',
              font: { weight: 'bold', size: 11 },
              formatter: v => v > 0 ? v : ''
            } : { display: false }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11, weight: '600' }, color: '#475569' } },
            y: { grid: { borderDash: [5,5], color: '#f1f5f9' }, ticks: { font: { size: 11 } }, beginAtZero: true }
          }
        }
      });
    }

    // 3. Age Groups Chart
    const ctxA = document.getElementById('ageChart')?.getContext('2d');
    if (ctxA && demo) {
      const ageLabels = ['≤29', '30-44', '45-59', '60-74', '75+'];
      const insData = ageLabels.map(k => demo.insult.ages[k]  || 0);
      const infData = ageLabels.map(k => demo.infarkt.ages[k] || 0);
      new Chart(ctxA, {
        type: 'bar',
        data: {
          labels: ageLabels,
          datasets: [
            {
              label: 'Insult',
              data: insData,
              backgroundColor: '#2563eb',
              borderRadius: 5,
              borderSkipped: false
            },
            {
              label: 'Infarkt',
              data: infData,
              backgroundColor: '#dc2626',
              borderRadius: 5,
              borderSkipped: false
            }
          ]
        },
        plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 30, left: 4, right: 4, bottom: 4 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                footer: (items) => {
                  const total = items.reduce((s, i) => s + i.parsed.y, 0);
                  return `Jami: ${total} ta`;
                }
              }
            },
            datalabels: window.ChartDataLabels ? {
              anchor: 'end', align: 'top',
              offset: 2,
              display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
              color: ctx => ctx.datasetIndex === 0 ? '#1d4ed8' : '#b91c1c',
              font: { weight: '900', size: 15 },
              formatter: v => v > 0 ? v.toLocaleString() : ''
            } : { display: false }
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { font: { size: 13, weight: '700' }, color: '#475569' }
            },
            y: {
              grid: { color: '#f1f5f9', lineWidth: 1 },
              border: { display: false, dash: [4, 4] },
              ticks: { font: { size: 11 }, color: '#94a3b8' },
              beginAtZero: true
            }
          }
        }
      });
    }
  },

  _drawDonut(canvasId, legendId, data, baseColor, patientCount) {
    const ctx = document.getElementById(canvasId)?.getContext('2d');
    if (!ctx || !data || !data.length) return;

    const COLORS = [
      '#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6',
      '#06b6d4','#f97316','#ec4899'
    ];
    const total = data.reduce((s, [, v]) => s + v, 0);

    // Outside pointer labels via custom plugin
    const outsideLabelsPlugin = {
      id: 'outsideLabels_' + canvasId,
      afterDraw(chart) {
        const { ctx: c, chartArea: { top, left, width, height } } = chart;
        const cx = left + width / 2;
        const cy = top + height / 2;
        const meta = chart.getDatasetMeta(0);
        const outerR = meta.data[0]?.outerRadius || (Math.min(width, height) / 2 * 0.62);
        const lineLen = 18;
        const extLen = 10;

        c.save();
        c.font = '600 11px Inter, system-ui, sans-serif';
        c.textBaseline = 'middle';

        meta.data.forEach((arc, i) => {
          const [label, val] = data[i];
          const pct = ((val / total) * 100).toFixed(1);
          if (val === 0) return;

          const midAngle = (arc.startAngle + arc.endAngle) / 2;
          const cos = Math.cos(midAngle);
          const sin = Math.sin(midAngle);

          // Line start (on outer edge)
          const x1 = cx + cos * outerR;
          const y1 = cy + sin * outerR;
          // Line elbow
          const x2 = cx + cos * (outerR + lineLen);
          const y2 = cy + sin * (outerR + lineLen);
          // Text anchor
          const isRight = cos >= 0;
          const x3 = x2 + (isRight ? extLen : -extLen);
          const y3 = y2;

          // Draw leader line
          c.beginPath();
          c.moveTo(x1, y1);
          c.lineTo(x2, y2);
          c.lineTo(x3, y3);
          c.strokeStyle = COLORS[i];
          c.lineWidth = 1.5;
          c.stroke();

          // Dot at elbow
          c.beginPath();
          c.arc(x2, y2, 2.5, 0, Math.PI * 2);
          c.fillStyle = COLORS[i];
          c.fill();

          // Label text
          const shortLabel = label.length > 28 ? label.slice(0, 26) + '…' : label;
          const text = `${shortLabel}  ${val}`;
          c.fillStyle = '#1e293b';
          c.textAlign = isRight ? 'left' : 'right';
          c.fillText(text, x3 + (isRight ? 4 : -4), y3);
        });

        c.restore();
      }
    };

    const displayCount = (patientCount != null && patientCount > 0) ? patientCount : total;
    const centerTextPlugin = {
      id: 'centerText_' + canvasId,
      afterDraw(chart) {
        const { ctx: c, chartArea: { top, left, width, height } } = chart;
        const cx = left + width / 2;
        const cy = top + height / 2;
        c.save();
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillStyle = '#94a3b8';
        c.font = '500 11px Inter, system-ui, sans-serif';
        c.fillText('Jami bemor', cx, cy - 11);
        c.fillStyle = '#0f172a';
        c.font = '700 22px Inter, system-ui, sans-serif';
        c.fillText(displayCount.toLocaleString(), cx, cy + 10);
        c.restore();
      }
    };

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(([k]) => k),
        datasets: [{
          data: data.map(([, v]) => v),
          backgroundColor: COLORS.slice(0, data.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      plugins: [outsideLabelsPlugin, centerTextPlugin],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        layout: { padding: 70 },
        plugins: {
          legend: { display: false },
          datalabels: { display: false },
          tooltip: {
            callbacks: {
              label: item => ` ${item.label}: ${item.parsed} ta (${((item.parsed/total)*100).toFixed(1)}%)`
            }
          }
        }
      }
    });
  },

  async showVafotDetail() {
    showModal({ title: 'Vafot etgan bemorlar', body: `<div class="flex justify-center py-10"><div class="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>` });
    try {
      const sb = getSupabase();
      const vil = DashboardPage._viewViloyat;
      const eqV = q => vil ? q.eq('viloyat', vil) : q;
      const [infRes, insRes] = await Promise.all([
        eqV(sb.from('infarkt_qabul').select('kt_no,fio,tugilgan_yil,viloyat,muassasa,qabul_vaqt,infarkt_turi').eq('status','vafot')).order('qabul_vaqt',{ascending:false}),
        eqV(sb.from('insult_qabul').select('kt_no,fio,tugilgan_yil,viloyat,muassasa,qabul_vaqt,insult_turi').eq('status','vafot')).order('qabul_vaqt',{ascending:false})
      ]);
      const all = [
        ...(infRes.data||[]).map(p=>({...p,_type:'infarkt',kasallik:p.infarkt_turi||'—'})),
        ...(insRes.data||[]).map(p=>({...p,_type:'insult',kasallik:p.insult_turi||'—'}))
      ].sort((a,b)=>new Date(b.qabul_vaqt)-new Date(a.qabul_vaqt));

      // Viloyat kesimida hisoblash
      const vilMap = {};
      all.forEach(p=>{ const v=p.viloyat||'Noma\'lum'; vilMap[v]=(vilMap[v]||0)+1; });
      const vilRows = Object.entries(vilMap).sort((a,b)=>b[1]-a[1])
        .map(([v,c])=>`<div class="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
          <span class="text-sm text-slate-700 font-medium">${esc(v)}</span>
          <span class="text-sm font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg">${c} ta</span>
        </div>`).join('');

      const tableRows = all.map(p=>`
        <tr class="border-b border-slate-50 hover:bg-rose-50/30 cursor-pointer transition-colors" onclick="closeModal();Router.go('bemor-karta',{kt_no:'${p.kt_no}',type:'${p._type}'})">
          <td class="p-2 text-xs font-mono text-slate-500">${esc(p.kt_no)}</td>
          <td class="p-2 text-sm font-semibold text-slate-800">${esc(p.fio||'—')}</td>
          <td class="p-2 text-xs">${p._type==='infarkt'?'<span class="text-red-600 font-bold">Infarkt</span>':'<span class="text-blue-600 font-bold">Insult</span>'}</td>
          <td class="p-2 text-xs text-slate-600">${esc(p.viloyat||'—')}</td>
          <td class="p-2 text-xs text-slate-600">${esc(p.muassasa||'—')}</td>
          <td class="p-2 text-xs text-slate-500">${Utils.formatDateTime(p.qabul_vaqt)}</td>
          <td class="p-2 text-xs text-slate-600">${esc(p.kasallik)}</td>
        </tr>`).join('');

      showModal({
        title: `Vafot etgan bemorlar — ${all.length} ta`,
        body: `
          <div class="flex gap-4" style="min-width:min(860px,88vw)">
            <div style="width:210px;flex-shrink:0">
              <div class="font-bold text-slate-600 mb-2 text-xs uppercase tracking-wide">Viloyat kesimida</div>
              <div class="bg-slate-50 rounded-xl p-3">${vilRows||'<p class="text-slate-400 text-sm">Ma\'lumot yo\'q</p>'}</div>
            </div>
            <div class="flex-1 overflow-auto" style="max-height:60vh">
              <table class="w-full text-left">
                <thead class="bg-rose-50 sticky top-0">
                  <tr>
                    <th class="p-2 text-xs font-bold text-slate-500">K/T No</th>
                    <th class="p-2 text-xs font-bold text-slate-500">F.I.O</th>
                    <th class="p-2 text-xs font-bold text-slate-500">Turi</th>
                    <th class="p-2 text-xs font-bold text-slate-500">Viloyat</th>
                    <th class="p-2 text-xs font-bold text-slate-500">Muassasa</th>
                    <th class="p-2 text-xs font-bold text-slate-500">Qabul vaqti</th>
                    <th class="p-2 text-xs font-bold text-slate-500">Kasallik</th>
                  </tr>
                </thead>
                <tbody>${tableRows||'<tr><td colspan="7" class="p-4 text-center text-slate-400">Ma\'lumot yo\'q</td></tr>'}</tbody>
              </table>
            </div>
          </div>`
      });
    } catch(err) {
      showModal({ title: 'Xatolik', body: `<p class="text-red-500 p-4">${err.message}</p>` });
    }
  },

  exportExcel() {
    const data = DashboardPage._recentPatients;
    if (!data?.length) { showToast("Ma'lumot yuklanmagan, biroz kuting", 'warning'); return; }
    Utils.exportCSV(data.map(p => ({
      Turi: p._type === 'infarkt' ? 'Infarkt' : 'Insult',
      'K/T No': p.kt_no,
      'F.I.O': p.fio || '—',
      Viloyat: p.viloyat || '—',
      Muassasa: p.muassasa || '—',
      'Qabul vaqti': Utils.formatDateTime(p.qabul_vaqt),
      Holat: p.status || '—',
      'Kasallik turi': p.infarkt_turi || p.insult_turi || '—',
      Muolaja: p.muolaja_turi || '—'
    })), `dashboard_bemorlar_${new Date().toISOString().slice(0,10)}.csv`);
    showToast('Excel eksport boshlandi', 'success');
  },

  subscribeRealtime() {
    Realtime.subscribeBemorlar(async () => {
      await DashboardPage.loadData();
    });
  }
};
