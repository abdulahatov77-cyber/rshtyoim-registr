// ==================== INSULT REYESTRI SAHIFASI ====================
const InsultReyestriPage = {
  _viloyat: null,
  _currentData: [],

  async render() {
    const user = await Auth.getUser();
    const profile = await Profile.getCurrent();
    this._profile = profile;
    this._viloyat = profile?.role === 'super_admin' ? null : profile?.viloyat;

    document.getElementById('app').innerHTML = Components.renderLayout(
      'insult-reyestri', 'Insult Reyestri', 'Viloyatlar va muassasalar tahlili',
      `<div id="reyestr-wrap" class="animate-fadein">
        <div class="flex items-center justify-center py-20">
          <div class="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>`,
      user
    );
    this._currentData = [];
    initIcons();
    await this.loadStats();
    Realtime.subscribeBemorlar(async () => {
      if (Router._current !== 'insult-reyestri') return;
      await InsultReyestriPage.loadStats();
    });
  },

  async refreshStats() {
    const btn = document.querySelector('button[onclick*="refreshStats"]');
    if (btn) setLoading(btn, true);
    try {
      // Migratsiyani amalga oshirish (eski nomlarni to'g'rilash)
      const updated = await DB.fixInstitutionNames();
      if (updated > 0) {
        showToast(`${updated} ta muassasa nomi yangilandi`, 'success');
      }
      
      const stats = await DB.getRegistryStats('insult', this._viloyat);
      this._currentData = stats;
      this.renderContent(stats);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (btn) setLoading(btn, false);
    }
  },

  async loadStats() {
    const wrap = document.getElementById('reyestr-wrap');
    try {
      const data = await DB.getRegistryStats('insult', this._viloyat);
      this._currentData = data;
      this.renderContent(data);
    } catch (err) {
      wrap.innerHTML = `<div class="p-10 text-red-500 bg-red-50 rounded-2xl border border-red-100">Xatolik: ${err.message}</div>`;
    }
  },

  renderContent(data) {
    const wrap = document.getElementById('reyestr-wrap');
    const title = this._viloyat ? `${this._viloyat} muassasalari` : 'Viloyatlar kesimida';

    let html = `
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          ${this._viloyat && (this._profile?.role === 'admin' || this._profile?.role === 'super_admin') ? `<button class="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm" onclick="InsultReyestriPage.goBack()">${icon('arrow-left', 20)}</button>` : ''}
          <div>
            <h2 class="text-xl font-black text-slate-800 leading-none">${title}</h2>
            <p class="text-xs font-bold text-slate-400 uppercase mt-1">Insult patologiyasi bo'yicha</p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm" onclick="InsultReyestriPage.refreshStats()">
            ${icon('refresh-cw', 14)} Yangilash
          </button>
          <button class="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200" onclick="InsultReyestriPage.exportData()">
            ${icon('download', 14)} Excel yuklash
          </button>
        </div>
      </div>
      
      <div class="bg-white rounded-[32px] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr class="bg-slate-50/50 border-b border-slate-100">
                <th class="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">${this._viloyat ? 'Muassasa' : 'Viloyat'}</th>
                <th class="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Jami</th>
                <th class="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Aktiv</th>
                <th class="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Vafot</th>
                <th class="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Chiqarildi</th>
                <th class="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">O'tkazildi</th>
                <th class="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">O'lim %</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              ${data.length === 0 ? `<tr><td colspan="7" class="px-6 py-10 text-center text-slate-400 font-medium">Ma'lumotlar topilmadi</td></tr>` : ''}
              ${data.map(r => {
                const mortality = r.jami > 0 ? ((r.vafot / r.jami) * 100).toFixed(1) : 0;
                return `
                  <tr class="hover:bg-slate-50/80 transition-colors cursor-pointer group" onclick="${!this._viloyat ? `InsultReyestriPage.drillDown('${r.name}')` : `Router.go('bemorlar', {type: 'insult', viloyat: '${this._viloyat}', muassasa: '${r.name}'})`}">
                    <td class="px-6 py-5">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                          ${icon(this._viloyat ? 'building-2' : 'map-pin', 16)}
                        </div>
                        <span class="text-sm font-bold text-slate-700">${r.name}</span>
                      </div>
                    </td>
                    <td class="px-6 py-5 text-center font-black text-slate-900">${r.jami}</td>
                    <td class="px-6 py-5 text-center">
                      <span class="px-2.5 py-1 bg-green-50 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-green-100 hover:bg-green-100 transition-colors" onclick="event.stopPropagation(); Router.go('bemorlar', {type: 'insult', viloyat: '${this._viloyat || r.name}', muassasa: '${this._viloyat ? r.name : ''}', status: 'active'})">${r.aktiv}</span>
                    </td>
                    <td class="px-6 py-5 text-center">
                      <span class="px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-red-100 hover:bg-red-100 transition-colors" onclick="event.stopPropagation(); Router.go('bemorlar', {type: 'insult', viloyat: '${this._viloyat || r.name}', muassasa: '${this._viloyat ? r.name : ''}', status: 'vafot'})">${r.vafot}</span>
                    </td>
                    <td class="px-6 py-5 text-center">
                      <span class="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-blue-100 hover:bg-blue-100 transition-colors" onclick="event.stopPropagation(); Router.go('bemorlar', {type: 'insult', viloyat: '${this._viloyat || r.name}', muassasa: '${this._viloyat ? r.name : ''}', status: 'chiqarildi'})">${r.chiqarildi}</span>
                    </td>
                    <td class="px-6 py-5 text-center">
                      <span class="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black uppercase tracking-wider border border-amber-100 hover:bg-amber-100 transition-colors" onclick="event.stopPropagation(); Router.go('bemorlar', {type: 'insult', viloyat: '${this._viloyat || r.name}', muassasa: '${this._viloyat ? r.name : ''}', status: 'otkazildi'})">${r.otkazildi}</span>
                    </td>
                    <td class="px-6 py-5 text-center">
                      <div class="flex items-center justify-center gap-3">
                        <div class="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div class="h-full bg-red-500" style="width: ${mortality}%"></div>
                        </div>
                        <span class="text-[11px] font-black text-red-600">${mortality}%</span>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    wrap.innerHTML = html;
    initIcons();
  },

  drillDown(viloyat) {
    this._viloyat = viloyat;
    this.loadStats();
  },

  goBack() {
    this._viloyat = null;
    this.loadStats();
  },

  exportData() {
    const filename = this._viloyat ? `insult_${this._viloyat}.csv` : 'insult_viloyatlar.csv';
    // Ma'lumotlarni o'zbekcha sarlavhalarga o'girish
    const mappedData = this._currentData.map(r => ({
      'Hudud/Muassasa': r.name,
      'Jami bemorlar': r.jami,
      'Aktiv davolanayotganlar': r.aktiv,
      'Vafot etganlar': r.vafot,
      'Chiqarilganlar': r.chiqarildi,
      'Boshqa muassasaga o\'tkazilganlar': r.otkazildi,
      'O\'lim ko\'rsatkichi (%)': ((r.vafot / (r.jami || 1)) * 100).toFixed(1)
    }));
    Utils.exportCSV(mappedData, filename);
  }
};
