// ==================== DASHBOARD PAGE ====================
const DashboardPage = {
  _charts: {},
  _realtimeSub: null,

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
      const [stats, trend, recent, viloyat, demo] = await Promise.all([
        DB.getDashboardStats(),
        DB.getTrend30(),
        DB.getRecentPatients(10),
        DB.getViloyatStats(),
        DB.getDemographics()
      ]);
      DashboardPage._recentPatients = recent;
      DashboardPage.renderContent(stats, trend, recent, viloyat, profile, demo);
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

  renderContent(stats, trend, recent, viloyat, profile, demo) {
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

    const bugunInfarkt = stats.infarktBugun || 0;
    const bugunInsult = stats.insultBugun || 0;

    inner.innerHTML = `
      <!-- ROW 1: KPI CARDS (TOP 5) -->
      <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
        <!-- 1. Jami Qabul Qilingan Bemorlar -->
        <div class="bg-slate-900 p-7 rounded-[32px] border border-slate-800 shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden">
          <div class="absolute -right-10 -top-10 w-32 h-32 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-all"></div>
          <div class="flex items-center justify-between mb-6 relative z-10">
            <div class="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('users', 32)}</div>
            <span class="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em]">JAMI BAZA</span>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2 relative z-10">Jami Qabul Qilingan</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${jami.toLocaleString()}</h3>
          <div class="mt-6 flex flex-col gap-3 relative z-10">
            <div class="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span> <span class="text-[13px] font-bold text-slate-300">Infarkt</span></div>
              <span class="text-lg font-black text-white">${jamiInfarkt}</span>
            </div>
            <div class="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span> <span class="text-[13px] font-bold text-slate-300">Insult</span></div>
              <span class="text-lg font-black text-white">${jamiInsult}</span>
            </div>
          </div>
        </div>

        <!-- 2. Bugungi Yangi Bemorlar -->
        <div class="bg-blue-600 p-7 rounded-[32px] shadow-2xl shadow-blue-900/30 hover:shadow-blue-500/40 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden">
          <div class="absolute -right-16 -bottom-16 w-56 h-56 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
          <div class="flex items-center justify-between mb-6 relative z-10">
            <div class="w-14 h-14 bg-white/20 text-white rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-all duration-500">${icon('activity', 32)}</div>
            <span class="text-[12px] font-black text-blue-100 uppercase tracking-[0.2em]">BUGUN</span>
          </div>
          <p class="text-blue-100/80 text-[11px] font-bold uppercase tracking-wider mb-2 relative z-10">Bugungi Yangi Qabullar</p>
          <div class="flex items-baseline gap-3 relative z-10">
            <h3 class="text-6xl font-black text-white tracking-tighter">${bugunInfarkt + bugunInsult}</h3>
            <span class="text-[12px] font-black bg-white text-blue-600 px-3 py-1 rounded-xl uppercase">Ta</span>
          </div>
          <div class="mt-6 flex flex-col gap-3 relative z-10">
            <div class="flex items-center justify-between py-2 px-3 bg-white/10 rounded-xl border border-white/10">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)]"></span> <span class="text-[13px] font-bold text-white">Infarkt</span></div>
              <span class="text-lg font-black text-white">${bugunInfarkt}</span>
            </div>
            <div class="flex items-center justify-between py-2 px-3 bg-white/10 rounded-xl border border-white/10">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-white/50 rounded-full"></span> <span class="text-[13px] font-bold text-blue-100">Insult</span></div>
              <span class="text-lg font-black text-white">${bugunInsult}</span>
            </div>
          </div>
        </div>

        <!-- 3. Jami Chiqarilgan Bemorlar -->
        <div class="bg-emerald-900 p-7 rounded-[32px] border border-emerald-800 shadow-2xl hover:shadow-emerald-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden">
          <div class="absolute -left-10 -bottom-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-6 relative z-10">
            <div class="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('log-out', 32)}</div>
            <span class="text-[12px] font-black text-emerald-500 uppercase tracking-[0.2em]">CHIQARILGAN</span>
          </div>
          <p class="text-emerald-500/60 text-[11px] font-bold uppercase tracking-wider mb-2 relative z-10">Uyga javob berilgan</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(chiqarilganInfarkt + chiqarilganInsult).toLocaleString()}</h3>
          <div class="mt-6 flex flex-col gap-3 relative z-10">
            <div class="flex items-center justify-between py-2 px-3 bg-emerald-800/50 rounded-xl border border-emerald-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-400 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span> <span class="text-[13px] font-bold text-emerald-100">Infarkt</span></div>
              <span class="text-lg font-black text-white">${chiqarilganInfarkt}</span>
            </div>
            <div class="flex items-center justify-between py-2 px-3 bg-emerald-800/50 rounded-xl border border-emerald-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span> <span class="text-[13px] font-bold text-emerald-100">Insult</span></div>
              <span class="text-lg font-black text-white">${chiqarilganInsult}</span>
            </div>
          </div>
        </div>

        <!-- 4. Statsionarda Davolanayotganlar -->
        <div class="bg-slate-900 p-7 rounded-[32px] border border-slate-800 shadow-2xl hover:shadow-orange-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden">
          <div class="absolute right-0 bottom-0 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-6 relative z-10">
            <div class="w-14 h-14 bg-orange-500/10 text-orange-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('bed-double', 32)}</div>
            <span class="text-[12px] font-black text-orange-500 uppercase tracking-[0.2em]">AKTIV</span>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2 relative z-10">Hozir Statsionarda</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(aktivInfarkt + aktivInsult).toLocaleString()}</h3>
          <div class="mt-6 flex flex-col gap-3 relative z-10">
            <div class="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span> <span class="text-[13px] font-bold text-slate-300">Infarkt</span></div>
              <span class="text-lg font-black text-white">${aktivInfarkt}</span>
            </div>
            <div class="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span> <span class="text-[13px] font-bold text-slate-300">Insult</span></div>
              <span class="text-lg font-black text-white">${aktivInsult}</span>
            </div>
          </div>
        </div>

        <!-- 5. Jami Vafot Etganlar -->
        <div class="bg-slate-900 p-7 rounded-[32px] border border-slate-800 shadow-2xl hover:shadow-rose-500/20 hover:-translate-y-2 transition-all duration-500 group cursor-pointer relative overflow-hidden">
          <div class="absolute -right-10 -top-10 w-32 h-32 bg-rose-600/5 rounded-full blur-3xl"></div>
          <div class="flex items-center justify-between mb-6 relative z-10">
            <div class="w-14 h-14 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-500">${icon('user-x', 32)}</div>
            <div class="px-3 py-1 bg-rose-500/10 rounded-xl border border-rose-500/20">
              <span class="text-sm font-black text-rose-500">${jami > 0 ? ((vafotInfarkt + vafotInsult) / jami * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
          <p class="text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2 relative z-10">Vafot etganlar</p>
          <h3 class="text-5xl font-black text-white relative z-10 tracking-tight">${(vafotInfarkt + vafotInsult).toLocaleString()}</h3>
          <div class="mt-6 flex flex-col gap-3 relative z-10">
            <div class="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.6)]"></span> <span class="text-[13px] font-bold text-slate-300">Infarkt</span></div>
              <span class="text-lg font-black text-white">${vafotInfarkt}</span>
            </div>
            <div class="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div class="flex items-center gap-2"><span class="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span> <span class="text-[13px] font-bold text-slate-300">Insult</span></div>
              <span class="text-lg font-black text-white">${vafotInsult}</span>
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

      <!-- ROW 3: REGIONAL DISTRIBUTION CHART -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
        <div class="flex items-center justify-between mb-8">
           <h3 class="text-sm font-bold text-slate-800 uppercase tracking-wider">${distTitle}</h3>
           <div class="flex gap-4">
             <div class="flex items-center gap-1.5"><span class="w-3 h-3 bg-[#dc2626]"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">Infarkt</span></div>
             <div class="flex items-center gap-1.5"><span class="w-3 h-3 bg-[#2563eb]"></span> <span class="text-[10px] font-bold text-slate-500 uppercase">Insult</span></div>
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
          <div class="p-4" style="min-height:240px;position:relative"><canvas id="ageChart"></canvas></div>
          <!-- Aniq raqamlar jadvali -->
          <div class="border-t border-slate-100 mx-4 mb-4">
            <table class="w-full text-xs" style="border-collapse:separate;border-spacing:0">
              <thead>
                <tr style="background:#f8fafc">
                  <th class="text-left py-2 px-3 font-bold text-slate-500 rounded-tl-lg">Yosh</th>
                  <th class="text-center py-2 px-2 font-bold" style="color:#3b82f6">Insult</th>
                  <th class="text-center py-2 px-2 font-bold" style="color:#ef4444">Infarkt</th>
                  <th class="text-center py-2 px-3 font-bold text-slate-700 rounded-tr-lg">Jami</th>
                </tr>
              </thead>
              <tbody>
                ${['≤29','30-44','45-59','60-74','75+'].map((k,i) => {
                  const ins = demo?.insult?.ages?.[k] || 0;
                  const inf = demo?.infarkt?.ages?.[k] || 0;
                  const tot = ins + inf;
                  const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
                  return `<tr style="background:${bg}">
                    <td class="py-1.5 px-3 font-bold text-slate-700">${k}</td>
                    <td class="py-1.5 px-2 text-center font-semibold" style="color:#3b82f6">${ins.toLocaleString()}</td>
                    <td class="py-1.5 px-2 text-center font-semibold" style="color:#ef4444">${inf.toLocaleString()}</td>
                    <td class="py-1.5 px-3 text-center font-bold text-slate-800">${tot.toLocaleString()}</td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ROW 4: DETAILED CLINICAL INDICATORS -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- Infarkt Detail -->
        <div class="bg-white rounded-2xl border-t-4 border-t-red-500 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">${icon('heart-pulse', 20, 'text-red-500')} Infarkt turlari va muolajalar</h3>
            <span class="text-[10px] font-bold text-slate-400">YALPI KO'RSATKICHLAR</span>
          </div>
          <div class="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            ${this.renderDetailCard('STEMI', stats.stemi ?? 0)}
            ${this.renderDetailCard('NSTEMI', stats.nstemi ?? 0)}
            ${this.renderDetailCard("O'tkir miokard infarkti (AMI)", stats.miokard ?? 0)}
            ${this.renderDetailCard('Koronarangiografiya', stats.koronar ?? 0)}
            ${this.renderDetailCard('Trombolizis', stats.trombolizis ?? 0)}
            ${this.renderDetailCard('Medikamentoz davo', stats.medikamentoz ?? 0)}
          </div>
        </div>

        <!-- Stroke Detail -->
        <div class="bg-white rounded-2xl border-t-4 border-t-blue-500 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 class="font-bold text-slate-800 flex items-center gap-2">${icon('brain-circuit', 20, 'text-blue-500')} Insult turlari va muolajalar</h3>
            <span class="text-[10px] font-bold text-slate-400">YALPI KO'RSATKICHLAR</span>
          </div>
          <div class="p-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            ${this.renderDetailCard('Ishemik insult', stats.ishemik ?? 0)}
            ${this.renderDetailCard('Gemorragik insult', stats.gemorragik ?? 0)}
            ${this.renderDetailCard('Tranzitor ishemik ataka', stats.tia ?? 0)}
            ${this.renderDetailCard('MSKT angiografiya', stats.mskt ?? 0)}
            ${this.renderDetailCard('Trombektomiya', stats.trombektomiya ?? 0)}
            ${this.renderDetailCard('Medikamentoz davo', stats.insultMedikamentoz ?? 0)}
          </div>
        </div>
      </div>



      <!-- ROW 6: PATIENT LIST TABLE -->
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

    // Initialize Charts
    requestAnimationFrame(() => {
      initIcons();
      setTimeout(() => {
        DashboardPage.drawNewCharts(trend, stats, viloyat, demo, profile);
      }, 300);
    });
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

  renderDetailCard(label, val, unit = '') {
    return `
      <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer group">
        <p class="text-[11px] font-bold text-slate-600 uppercase mb-2 group-hover:text-blue-600 transition-colors leading-tight">${label}</p>
        <p class="text-2xl font-black text-slate-900">${val.toLocaleString()} ${unit ? `<span class="text-xs text-slate-500 font-semibold uppercase">${unit}</span>` : ''}</p>
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

  drawNewCharts(trend, stats, viloyat, demo, profile) {
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
            datalabels: {
              display: ctx => ctx.dataset.data[ctx.dataIndex] > 0,
              align: 'top',
              color: ctx => ctx.datasetIndex === 0 ? '#ef4444' : '#3b82f6',
              font: { weight: 'bold', size: 12 }
            }
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
      const isFiltered = profile?.role !== 'admin';

      const regionData = (isFiltered ? (viloyat || []) : (APP_CONFIG.VILOYATLAR || []).map(rName => {
        const found = (viloyat || []).find(v => v[0] === rName);
        return found ? { name: rName, total: found[1], inf: found[2]||0, ins: found[3]||0 } : { name: rName, total: 0, inf: 0, ins: 0 };
      })).map(v => Array.isArray(v) ? { name: v[0], total: v[1], inf: v[2], ins: v[3] } : v)
         .sort((a, b) => b.total - a.total);

      new Chart(ctxR, {
        type: 'bar',
        data: {
          labels: regionData.map(v => v.name),
          datasets: [
            { label: 'Infarkt', data: regionData.map(v => v.inf), backgroundColor: '#dc2626', borderRadius: 4, borderSkipped: false },
            { label: 'Insult',  data: regionData.map(v => v.ins), backgroundColor: '#2563eb', borderRadius: 4, borderSkipped: false }
          ]
        },
        plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
        options: {
          responsive: true, maintainAspectRatio: false,
          layout: { padding: { top: 24, bottom: 10 } },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              align: 'end',
              labels: { usePointStyle: true, pointStyle: 'rect', font: { weight: '700', size: 12 }, color: '#475569', padding: 20 }
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
            y: { grid: { borderDash: [5,5], color: '#e2e8f0' }, ticks: { font: { size: 12, weight: '600' } }, beginAtZero: true }
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
              backgroundColor: 'rgba(59,130,246,0.85)',
              borderColor: '#2563eb',
              borderWidth: 0,
              borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 6, bottomRight: 6 },
              borderSkipped: false
            },
            {
              label: 'Infarkt',
              data: infData,
              backgroundColor: 'rgba(239,68,68,0.85)',
              borderColor: '#dc2626',
              borderWidth: 0,
              borderRadius: { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 },
              borderSkipped: false
            }
          ]
        },
        plugins: window.ChartDataLabels ? [window.ChartDataLabels] : [],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 32, left: 4, right: 4, bottom: 4 } },
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
              labels: {
                inside: {
                  anchor: 'center', align: 'center',
                  color: '#fff',
                  font: { weight: 'bold', size: 12 },
                  display: ctx => {
                    const max = Math.max(...ctx.chart.data.datasets.flatMap(d => d.data));
                    return ctx.dataset.data[ctx.dataIndex] >= max * 0.06;
                  },
                  formatter: v => v > 0 ? v.toLocaleString() : ''
                },
                total: {
                  anchor: 'end', align: 'top',
                  offset: 4,
                  color: '#1e293b',
                  font: { weight: '800', size: 13 },
                  display: ctx => ctx.datasetIndex === 1,
                  formatter: (_, ctx) =>
                    ctx.chart.data.datasets.reduce((s, ds) => s + (ds.data[ctx.dataIndex] || 0), 0).toLocaleString()
                }
              }
            } : {}
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              border: { display: false },
              ticks: { font: { size: 13, weight: '700' }, color: '#475569' }
            },
            y: {
              stacked: true,
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
