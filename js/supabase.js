// ==================== SUPABASE CLIENT ====================
let _supabase = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(
      APP_CONFIG.SUPABASE_URL,
      APP_CONFIG.SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false
        }
      }
    );
  }
  return _supabase;
}

// ==================== AUTH ====================
const Auth = {
  async signIn(email, password) {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signUp(email, password, metadata = {}) {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const sb = getSupabase();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  },

  async getUser() {
    const sb = getSupabase();
    const { data: { user } } = await sb.auth.getUser();
    return user;
  },

  async getSession() {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    return session;
  },

  onAuthStateChange(callback) {
    return getSupabase().auth.onAuthStateChange(callback);
  },

  async updatePassword(newPassword) {
    const { data, error } = await getSupabase().auth.updateUser({ password: newPassword });
    if (error) throw error;
    return data;
  }
};

// ==================== DATABASE ====================
const DB = {
  // Infarkt CRUD
  async infarktQabul(data) {
    const user = await Auth.getUser();
    // Faqat mavjud ustunlarni yuboramiz
    const allowed = [
      'viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli','yuborgan_muassasa',
      'fio','tugilgan_yil','jins',
      'aha_bali','simptom_vaqt','birlamchi_yoki_takroriy',
      'infarkt_turi','killip','qon_bosimi','puls','ekg_vaqti','troponin','kkfmb',
      'ekg_natija','xavf_omil',
      'muolaja_turi','angio_natija','otkazilgan_muassasa',
      'dinamika_muolaja_turi','dinamika_izoh',
      'shifokor_fio','status'
    ];
    const clean = {};
    for (const k of allowed) {
      if (data[k] !== undefined) clean[k] = data[k];
    }
    const { data: result, error } = await getSupabase()
      .from('infarkt_qabul')
      .insert({ ...clean, user_id: user?.id })
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  // Ro'yxat uchun faqat kerakli ustunlar (select * emas)
  _LIST_COLS_INF: 'kt_no,fio,tugilgan_sana,tugilgan_yil,jins,viloyat,muassasa,qabul_vaqt,status,infarkt_turi,muolaja_turi,killip,created_at',

  async infarktList(filters = {}) {
    const cols = filters.allCols ? '*' : DB._LIST_COLS_INF;
    const pageSize = filters.pageSize || 50;
    const page     = filters.page     || 0;

    const applyFilters = (q) => {
      if (filters.status)  q = q.eq('status',  filters.status);
      if (filters.viloyat) q = q.eq('viloyat', filters.viloyat);
      if (filters.from)    q = q.gte('qabul_vaqt', filters.from);
      if (filters.to)      q = q.lte('qabul_vaqt', filters.to);
      if (filters.search) { const s = filters.search.replace(/[,().*%]/g, '').trim(); if (s) q = q.or(`fio.ilike.%${s}%,kt_no.ilike.%${s}%,muassasa.ilike.%${s}%`); }
      return q;
    };

    if (filters.from || filters.to) {
      // Paginate in 1000-row batches to bypass Supabase server max-rows=1000 hard cap
      let allData = [], offset = 0;
      while (true) {
        const q = applyFilters(
          getSupabase().from('infarkt_qabul').select(cols).order('created_at', { ascending: false })
        ).range(offset, offset + 999);
        const { data, error } = await q;
        if (error) { if (error.code === 'PGRST103') break; throw error; }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return { data: allData, count: allData.length };
    }

    const q = applyFilters(
      getSupabase().from('infarkt_qabul').select(cols, { count: 'estimated' }).order('created_at', { ascending: false })
    ).range(page * pageSize, page * pageSize + pageSize - 1);
    const { data, error, count } = await q;
    if (error) {
      if (error.code === 'PGRST103') return { data: [], count: 0 };
      throw error;
    }
    return { data: data || [], count: count || 0 };
  },

  async infarktByKtNo(kt_no) {
    const { data, error } = await getSupabase()
      .from('infarkt_qabul').select('*').eq('kt_no', kt_no).single();
    if (error) throw error;
    return data;
  },

  async infarktUpdate(kt_no, updates) {
    const { data, error } = await getSupabase()
      .from('infarkt_qabul').update(updates).eq('kt_no', kt_no).select().single();
    if (error) throw error;
    return data;
  },

  // Insult CRUD
  async insultQabul(data) {
    const user = await Auth.getUser();
    // Faqat mavjud ustunlarni yuboramiz
    const allowed = [
      'viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli','yuborgan_muassasa',
      'fio','tugilgan_yil','jins',
      'simptom_vaqt','nihss_qabul','gcs_bali','insult_turi','qon_bosimi',
      'xavf_omil','aha_bali',
      'mskt','muolaja_turi','otkazilgan_muassasa',
      'dinamika_muolaja_turi','dinamika_izoh',
      'shifokor_fio','status'
    ];
    const clean = {};
    for (const k of allowed) {
      if (data[k] !== undefined) clean[k] = data[k];
    }
    const { data: result, error } = await getSupabase()
      .from('insult_qabul')
      .insert({ ...clean, user_id: user?.id })
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  _LIST_COLS_INS: 'kt_no,fio,tugilgan_sana,tugilgan_yil,jins,viloyat,muassasa,qabul_vaqt,status,insult_turi,muolaja_turi,nihss_qabul,created_at',

  async insultList(filters = {}) {
    const cols = filters.allCols ? '*' : DB._LIST_COLS_INS;
    const pageSize = filters.pageSize || 50;
    const page     = filters.page     || 0;

    const applyFilters = (q) => {
      if (filters.status)  q = q.eq('status',  filters.status);
      if (filters.viloyat) q = q.eq('viloyat', filters.viloyat);
      if (filters.from)    q = q.gte('qabul_vaqt', filters.from);
      if (filters.to)      q = q.lte('qabul_vaqt', filters.to);
      if (filters.search) { const s = filters.search.replace(/[,().*%]/g, '').trim(); if (s) q = q.or(`fio.ilike.%${s}%,kt_no.ilike.%${s}%,muassasa.ilike.%${s}%`); }
      return q;
    };

    if (filters.from || filters.to) {
      // Paginate in 1000-row batches to bypass Supabase server max-rows=1000 hard cap
      let allData = [], offset = 0;
      while (true) {
        const q = applyFilters(
          getSupabase().from('insult_qabul').select(cols).order('created_at', { ascending: false })
        ).range(offset, offset + 999);
        const { data, error } = await q;
        if (error) { if (error.code === 'PGRST103') break; throw error; }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return { data: allData, count: allData.length };
    }

    const q = applyFilters(
      getSupabase().from('insult_qabul').select(cols, { count: 'estimated' }).order('created_at', { ascending: false })
    ).range(page * pageSize, page * pageSize + pageSize - 1);
    const { data, error, count } = await q;
    if (error) {
      if (error.code === 'PGRST103') return { data: [], count: 0 };
      throw error;
    }
    return { data: data || [], count: count || 0 };
  },

  async insultByKtNo(kt_no) {
    const { data, error } = await getSupabase()
      .from('insult_qabul').select('*').eq('kt_no', kt_no).single();
    if (error) throw error;
    return data;
  },

  async insultUpdate(kt_no, updates) {
    const { data, error } = await getSupabase()
      .from('insult_qabul').update(updates).eq('kt_no', kt_no).select().single();
    if (error) throw error;
    return data;
  },

  // Chiqarish
  async insultChiqarish(data) {
    const { data: result, error } = await getSupabase()
      .from('insult_chiqarish').insert(data);
    if (error) throw error;
    return result;
  },

  async infarktChiqarish(data) {
    const { data: result, error } = await getSupabase()
      .from('infarkt_chiqarish').insert(data);
    if (error) throw error;
    return result;
  },

  // Davolash
  async davolashQosh(data) {
    const { data: result, error } = await getSupabase()
      .from('davolash').insert(data).select().single();
    if (error) throw error;
    return result;
  },

  async davolashList(registr_turi, kt_no) {
    const { data, error } = await getSupabase()
      .from('davolash')
      .select('*')
      .eq('registr_turi', registr_turi)
      .eq('kt_no', kt_no)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async davolashUpdate(id, updates) {
    const { data, error } = await getSupabase()
      .from('davolash').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  // Holat baholash
  async holatBaholashQosh(data) {
    const { data: result, error } = await getSupabase()
      .from('holat_baxolash').insert(data).select().single();
    if (error) throw error;
    return result;
  },

  async holatBaholashList(registr_turi, kt_no) {
    const { data, error } = await getSupabase()
      .from('holat_baxolash')
      .select('*')
      .eq('registr_turi', registr_turi)
      .eq('kt_no', kt_no)
      .order('vaqt', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Kuzatuv (Follow-up)
  async addKuzatuv(data) {
    const { data: result, error } = await getSupabase()
      .from('kuzatuv').insert(data).select().single();
    if (error) throw error;
    return result;
  },

  async getKuzatuv(kt_no) {
    const { data, error } = await getSupabase()
      .from('kuzatuv')
      .select('*')
      .eq('kt_no', kt_no)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getDinamikaMuolajalar(kt_no) {
    const { data, error } = await getSupabase()
      .from('dinamika_muolajalar')
      .select('*')
      .eq('kt_no', kt_no)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async addDinamikaMuolaja(data) {
    const { data: result, error } = await getSupabase()
      .from('dinamika_muolajalar')
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async getHolatDinamikasi(kt_no) {
    const { data, error } = await getSupabase()
      .from('holat_dinamikasi').select('*').eq('kt_no', kt_no)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async addHolatDinamikasi(data) {
    const { data: result, error } = await getSupabase()
      .from('holat_dinamikasi').insert(data).select().single();
    if (error) throw error;
    return result;
  },

  async getNavbatchiJurnal(kt_no) {
    const { data, error } = await getSupabase()
      .from('navbatchi_jurnal').select('*').eq('kt_no', kt_no)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addNavbatchiJurnal(data) {
    const { data: result, error } = await getSupabase()
      .from('navbatchi_jurnal').insert(data).select().single();
    if (error) throw error;
    return result;
  },

  // Dashboard stats
  async getDashboardStats() {
    const p = await Profile.getCurrent();
    const viloyat = p?.role === 'super_admin' ? null : p?.viloyat;
    const eqViloyat = (q) => viloyat ? q.eq('viloyat', viloyat) : q;
    // Kasalxona ish kuni 07:00 dan boshlanadi (Telegram bot bilan mos)
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(7, 0, 0, 0);
    if (now < cutoff) cutoff.setDate(cutoff.getDate() - 1);
    const todayISO = cutoff.toISOString();
    const cutoffEnd = new Date(cutoff);
    cutoffEnd.setDate(cutoffEnd.getDate() + 1); // Ertaga 07:00 — yuqori chegara
    const todayEndISO = cutoffEnd.toISOString();

    const [
      { count: infAll },
      { count: insAll },
      { count: infAktiv },
      { count: insAktiv },
      { count: infVafot },
      { count: insVafot },
      { count: infChiqarildi },
      { count: insChiqarildi },
      { count: infarktBugun },
      { count: insultBugun },
      { count: kritikInfarkt },
      { count: kritikInsult },
      { count: infOtkaz },
      { count: insOtkaz }
    ] = await Promise.all([
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true })),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true })),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'vafot')),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'vafot')),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'chiqarildi')),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'chiqarildi')),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).gte('qabul_vaqt', todayISO).lt('qabul_vaqt', todayEndISO)),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).gte('qabul_vaqt', todayISO).lt('qabul_vaqt', todayEndISO)),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')).in('killip', ['Killip III — o\'pka shishi', 'Killip IV — kardiogen shok']),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')).gte('nihss_qabul', 15),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).not('otkazilgan_muassasa', 'is', null)),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).not('otkazilgan_muassasa', 'is', null))
    ]);

    // Klinik turlari va muolajalar breakdown (paginated)
    const fetchAllTypes = async (table, cols) => {
      let all = [], offset = 0;
      while (true) {
        const { data, error } = await eqViloyat(
          getSupabase().from(table).select(cols)
        ).range(offset, offset + 999);
        if (error) { if (error.code === 'PGRST103') break; throw error; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return all;
    };
    const [iT, nT] = await Promise.all([
      fetchAllTypes('infarkt_qabul', 'infarkt_turi,muolaja_turi'),
      fetchAllTypes('insult_qabul', 'insult_turi,muolaja_turi')
    ]);

    return {
      jamiInfarkt: infAll || 0,
      jamiInsult: insAll || 0,
      jami: (infAll || 0) + (insAll || 0),
      infarktAktiv: infAktiv || 0,
      insultAktiv: insAktiv || 0,
      vafotInfarkt: infVafot || 0,
      vafotInsult: insVafot || 0,
      vafot: (infVafot || 0) + (insVafot || 0),
      chiqarilganInfarkt: infChiqarildi || 0,
      chiqarilganInsult: insChiqarildi || 0,
      infarktBugun: infarktBugun || 0,
      insultBugun: insultBugun || 0,
      kritikInfarkt: kritikInfarkt || 0,
      kritikInsult: kritikInsult || 0,
      otkazildi: (infOtkaz || 0) + (insOtkaz || 0),
      // Infarkt klinik
      stemi:        iT.filter(p => p.infarkt_turi?.toUpperCase().includes('STEMI') && !p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length,
      nstemi:       iT.filter(p => p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length,
      miokard:      iT.filter(p => p.infarkt_turi?.toLowerCase().includes('miokard')).length,
      koronar:      iT.filter(p => p.muolaja_turi?.includes('KAG') || p.muolaja_turi?.toLowerCase().includes('angiografiya')).length,
      trombolizis:  iT.filter(p => p.muolaja_turi?.includes('TLT') || p.muolaja_turi?.toLowerCase().includes('trombolitik')).length,
      medikamentoz: iT.filter(p => p.muolaja_turi?.toLowerCase().includes('medikamentoz')).length,
      // Insult klinik
      ishemik:           nT.filter(p => p.insult_turi?.toLowerCase().includes('ishemik')).length,
      gemorragik:        nT.filter(p => p.insult_turi?.toLowerCase().includes('gemorragik')).length,
      tia:               nT.filter(p => p.insult_turi?.toUpperCase().includes('TIA')).length,
      mskt:              nT.filter(p => p.muolaja_turi?.toUpperCase().includes('MSKT')).length,
      trombektomiya:     nT.filter(p => p.muolaja_turi?.toLowerCase().includes('trombektom') || p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya')).length,
      insultMedikamentoz: nT.filter(p => p.muolaja_turi?.toLowerCase().includes('medikamentoz') || p.muolaja_turi?.toLowerCase().includes('konservativ')).length,
    };
  },

  // Last 30 days trend
  async getTrend30() {
    const p = await Profile.getCurrent();
    const viloyat = p?.role === 'super_admin' ? null : p?.viloyat;
    const eqViloyat = (q) => viloyat ? q.eq('viloyat', viloyat) : q;
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 29);
    from.setUTCHours(0, 0, 0, 0);
    const fromISO = from.toISOString();

    const fetchAll = async (table) => {
      let all = [], offset = 0;
      while (true) {
        const { data, error } = await eqViloyat(
          getSupabase().from(table).select('qabul_vaqt').gte('qabul_vaqt', fromISO)
        ).range(offset, offset + 999);
        if (error) { if (error.code === 'PGRST103') break; throw error; }
        if (!data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return all;
    };

    const [inf, ins] = await Promise.all([
      fetchAll('infarkt_qabul'),
      fetchAll('insult_qabul')
    ]);

    const labels = [], infData = [], insData = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(from);
      d.setUTCDate(from.getUTCDate() + i);
      const ds = d.toISOString().split('T')[0];
      labels.push(ds.slice(5));
      infData.push(inf.filter(r => r.qabul_vaqt?.startsWith(ds)).length);
      insData.push(ins.filter(r => r.qabul_vaqt?.startsWith(ds)).length);
    }
    return { labels, infData, insData };
  },

  // Recent patients
  async getRecentPatients(limit = 10) {
    const p = await Profile.getCurrent();
    const viloyat = p?.role === 'super_admin' ? null : p?.viloyat;
    const eqViloyat = (q) => viloyat ? q.eq('viloyat', viloyat) : q;
    const [{ data: inf }, { data: ins }] = await Promise.all([
      eqViloyat(getSupabase().from('infarkt_qabul').select('*').order('created_at', { ascending: false }).limit(limit)),
      eqViloyat(getSupabase().from('insult_qabul').select('*').order('created_at', { ascending: false }).limit(limit))
    ]);
    const combined = [
      ...(inf || []).map(r => ({ ...r, _type: 'infarkt' })),
      ...(ins || []).map(r => ({ ...r, _type: 'insult' }))
    ];
    combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return combined.slice(0, limit);
  },

  // Demographics
  async getDemographics() {
    const p = await Profile.getCurrent();
    const viloyat = p?.role === 'super_admin' ? null : p?.viloyat;
    const { data, error } = await getSupabase().rpc('get_demographics', { p_viloyat: viloyat });
    if (error) {
      console.error('getDemographics RPC xato:', error.message);
      return {
        infarkt: { male: 0, female: 0, ages: { '≤29': 0, '30-44': 0, '45-59': 0, '60-74': 0, '75+': 0 } },
        insult:  { male: 0, female: 0, ages: { '≤29': 0, '30-44': 0, '45-59': 0, '60-74': 0, '75+': 0 } }
      };
    }
    return data;
  },

  // Viloyat (yoki Muassasa) distribution
  async getViloyatStats() {
    const p = await Profile.getCurrent();
    const userViloyat = p?.role === 'super_admin' ? null : p?.viloyat;
    const sb = getSupabase();

    if (userViloyat) {
      // Non-admin: muassasa kesimida ko'rsatish
      const [{ data: inf }, { data: ins }] = await Promise.all([
        sb.from('infarkt_qabul').select('muassasa').eq('viloyat', userViloyat).range(0, 9999),
        sb.from('insult_qabul').select('muassasa').eq('viloyat', userViloyat).range(0, 9999)
      ]);
      const map = {};
      (inf || []).forEach(r => {
        if (!r.muassasa) return;
        if (!map[r.muassasa]) map[r.muassasa] = { total: 0, inf: 0, ins: 0 };
        map[r.muassasa].total++; map[r.muassasa].inf++;
      });
      (ins || []).forEach(r => {
        if (!r.muassasa) return;
        if (!map[r.muassasa]) map[r.muassasa] = { total: 0, inf: 0, ins: 0 };
        map[r.muassasa].total++; map[r.muassasa].ins++;
      });
      return Object.entries(map).map(([name, s]) => [name, s.total, s.inf, s.ins]).sort((a, b) => b[1] - a[1]).slice(0, 14);
    }

    // Admin: har viloyat uchun server-side count (qator limiti muammosi yo'q)
    const viloyatlar = APP_CONFIG.VILOYATLAR || [];
    const countResults = await Promise.all(
      viloyatlar.flatMap(v => [
        sb.from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('viloyat', v),
        sb.from('insult_qabul').select('id', { count: 'exact', head: true }).eq('viloyat', v)
      ])
    );
    return viloyatlar
      .map((name, i) => {
        const inf = countResults[i * 2].count || 0;
        const ins = countResults[i * 2 + 1].count || 0;
        return [name, inf + ins, inf, ins];
      })
      .filter(r => r[1] > 0)
      .sort((a, b) => b[1] - a[1]);
  },

  // Detailed Registry Stats (Viloyat or Muassasa level)
  async getRegistryStats(type, viloyat = null) {
    const table = type === 'infarkt' ? 'infarkt_qabul' : 'insult_qabul';
    const sb = getSupabase();
    
    let query = sb.from(table).select('viloyat, muassasa, status');
    if (viloyat) query = query.eq('viloyat', viloyat);
    query = query.range(0, 9999);

    const { data, error } = await query;
    if (error) throw error;
    
    const stats = {};
    
    // Dastlab barcha muassasalarni 0 bilan to'ldiramiz (agar viloyat tanlangan bo'lsa)
    if (viloyat && APP_CONFIG.MUASSASALAR[viloyat]) {
      APP_CONFIG.MUASSASALAR[viloyat].forEach(m => {
        stats[m] = { name: m, jami: 0, aktiv: 0, vafot: 0, chiqarildi: 0, otkazildi: 0 };
      });
    }

    data.forEach(r => {
      let key = viloyat ? r.muassasa : r.viloyat;
      if (!key) return;

      const clean = (s) => s.toLowerCase().replace(/ttb|shtb|emergency department|politravma markazi|filiali|shoshilinch tibbiy yordam/g, '').trim();

      // Agar nom configda bo'lmasa, o'xshashini qidirib ko'ramiz
      if (viloyat && !stats[key]) {
        const cKey = clean(key);
        const match = Object.keys(stats).find(name => clean(name) === cKey || clean(name).includes(cKey) || cKey.includes(clean(name)));
        if (match) key = match;
      }

      if (!stats[key]) {
        stats[key] = { name: key, jami: 0, aktiv: 0, vafot: 0, chiqarildi: 0, otkazildi: 0 };
      }
      stats[key].jami++;
      if (r.status === 'active') stats[key].aktiv++;
      else if (r.status === 'vafot') stats[key].vafot++;
      else if (r.status === 'chiqarildi') stats[key].chiqarildi++;
      else if (r.status === 'otkazildi') stats[key].otkazildi++;
    });
    
    return Object.values(stats).sort((a, b) => b.jami - a.jami || a.name.localeCompare(b.name));
  },

  async fixInstitutionNames() {
    const tables = ['infarkt_qabul', 'insult_qabul'];
    const sb = getSupabase();
    let updatedCount = 0;

    const clean = (s) => s.toLowerCase().replace(/ttb|shtb|emergency department|politravma markazi|filiali|shoshilinch tibbiy yordam/g, '').trim();

    for (const table of tables) {
      const { data: records, error } = await sb.from(table).select('id, muassasa, viloyat');
      if (error) continue;

      for (const rec of records) {
        if (!rec.muassasa || !rec.viloyat) continue;
        const newList = APP_CONFIG.MUASSASALAR[rec.viloyat] || [];
        if (!newList.includes(rec.muassasa)) {
          const cOld = clean(rec.muassasa);
          const match = newList.find(m => clean(m) === cOld || clean(m).includes(cOld) || cOld.includes(clean(m)));

          if (match && match !== rec.muassasa) {
            await sb.from(table).update({ muassasa: match }).eq('id', rec.id);
            updatedCount++;
          }
        }
      }
    }
    return updatedCount;
  }
};

// ==================== TELEGRAM ====================
const Telegram = {

  async notify(patient, type) {
    const token = type === 'infarkt'
      ? APP_CONFIG.TELEGRAM_INFARKT_TOKEN
      : APP_CONFIG.TELEGRAM_INSULT_TOKEN;

    // Chat ID — integer bo'lishi kerak
    const chatId = parseInt(
      type === 'infarkt'
        ? APP_CONFIG.TELEGRAM_INFARKT_CHAT
        : APP_CONFIG.TELEGRAM_INSULT_CHAT
    );

    try {
      const text = Telegram.buildMessage(patient, type);

      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
          })
        }
      );

      const json = await res.json();

      if (json.ok) {
        showToast('📱 Telegram xabar yuborildi!', 'success', 3000);
        console.log('✅ Telegram OK:', json);
      } else {
        const errMsg = json.description || 'Noma\'lum xato';
        showToast(`⚠️ Telegram xato: ${errMsg}`, 'warning', 6000);
        console.error('❌ Telegram API xato:', json);
      }
    } catch (e) {
      showToast(`⚠️ Telegram ulanmadi: ${e.message}`, 'warning', 6000);
      console.error('❌ Telegram fetch xato:', e);
    }
  },

  // Test funksiyasi — brauzer konsolidan chaqirish uchun: Telegram.test('infarkt')
  async test(type = 'infarkt') {
    const token = type === 'infarkt'
      ? APP_CONFIG.TELEGRAM_INFARKT_TOKEN
      : APP_CONFIG.TELEGRAM_INSULT_TOKEN;
    const chatId = parseInt(
      type === 'infarkt'
        ? APP_CONFIG.TELEGRAM_INFARKT_CHAT
        : APP_CONFIG.TELEGRAM_INSULT_CHAT
    );

    console.log(`🔍 Telegram test: type=${type}, chatId=${chatId}`);

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✅ RSHTYOIM test xabari — ${new Date().toLocaleString('uz-UZ')}`,
          parse_mode: 'HTML'
        })
      }
    );
    const json = await res.json();
    console.log('Telegram test natija:', json);
    if (json.ok) {
      showToast('✅ Test xabar yuborildi!', 'success');
    } else {
      showToast(`❌ Test xato: ${json.description}`, 'error', 8000);
    }
    return json;
  },

  buildMessage(patient, type) {
    const tugilgan = patient.tugilgan_sana || patient.tugilgan_yil || '';
    const age = tugilgan
      ? new Date().getFullYear() - parseInt(tugilgan.toString().slice(0, 4))
      : '?';

    const qabul = patient.qabul_vaqt
      ? (() => {
          const d = new Date(patient.qabul_vaqt);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          const hh = String(d.getHours()).padStart(2, '0');
          const mi = String(d.getMinutes()).padStart(2, '0');
          return `${dd}.${mm}.${yyyy} ${hh}:${mi}`;
        })()
      : '—';

    const genderIcon = patient.jins === 'Ayol' ? '👩' : '👨';
    const shifokor = patient.shifokor_fio || '—';

    if (type === 'infarkt') {
      const killip = patient.killip || '';
      let kritik = '';
      if (killip.includes('III') || killip.includes('IV')) {
        kritik = `\n⚠️ <b>DIQQAT: KRITIK HOLAT! (Killip ${killip.includes('IV') ? 'IV' : 'III'})</b>`;
      }
      const kagLine = patient.angio_natija
        ? `\n🧪 <b>KAG natijasi:</b> ${patient.angio_natija}` : '';

      return `🫀 <b>YANGI INFARKT BEMOR QABUL QILINDI</b>
━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Viloyat:</b> ${patient.viloyat || '—'}
🏥 <b>Muassasa:</b> ${patient.muassasa || '—'}
👨‍⚕️ <b>Shifokor:</b> ${shifokor}
📋 <b>K/T No:</b> <code>${patient.kt_no || '—'}</code>
${genderIcon} <b>Bemor:</b> ${patient.fio || '—'}, ${age} yosh, ${patient.jins || '—'}
🔴 <b>${patient.infarkt_turi || '—'}</b>
🩺 <b>Killip:</b> ${killip || '—'}
💊 <b>Muolaja:</b> ${patient.muolaja_turi || '—'}${kagLine}
📊 <b>AHA bali:</b> ${patient.aha_bali ?? '—'}
⏰ <b>Simptom:</b> ${patient.simptom_vaqt || '—'}
🕐 <b>Qabul:</b> ${qabul}
━━━━━━━━━━━━━━━━━━━━━━${kritik}`;

    } else {
      const nihss = patient.nihss_qabul ?? '—';
      const gcs   = patient.gcs_bali ?? patient.gcs_qabul ?? '—';
      let kritik = '';
      if (patient.nihss_qabul != null && patient.nihss_qabul >= 15) {
        kritik = `\n⚠️ <b>DIQQAT: OG'IR HOLAT! (NIHSS = ${patient.nihss_qabul})</b>`;
      }

      return `🧠 <b>YANGI INSULT BEMOR QABUL QILINDI</b>
━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Viloyat:</b> ${patient.viloyat || '—'}
🏥 <b>Muassasa:</b> ${patient.muassasa || '—'}
👨‍⚕️ <b>Shifokor:</b> ${shifokor}
📋 <b>K/T №:</b> <code>${patient.kt_no || '—'}</code>
${genderIcon} <b>Bemor:</b> ${patient.fio || '—'}, ${age} yosh, ${patient.jins || '—'}
🩺 <b>Insult turi:</b> ${patient.insult_turi || '—'}
📊 <b>NIHSS/GCS:</b> ${nihss} / ${gcs}
📋 <b>AHA:</b> ${patient.aha_bali ?? '—'}
⏱️ <b>Simptom:</b> ${patient.simptom_vaqt || '—'}
💉 <b>Muolaja:</b> ${patient.muolaja_turi || '—'}
🕐 <b>Qabul:</b> ${qabul}
━━━━━━━━━━━━━━━━━━━━━━${kritik}`;
    }
  }
};

// ==================== REALTIME ====================
const Realtime = {
  _channels: {},

  async subscribeBemorlar(callback) {
    const sb = getSupabase();

    // Avval eski channelni o'chir (xato oldini olish uchun)
    if (this._channels['bemorlar']) {
      try {
        await sb.removeChannel(this._channels['bemorlar']);
      } catch (e) {
        console.warn('Realtime: eski channel o\'chirishda xato:', e.message);
      }
      delete this._channels['bemorlar'];
    }

    // Har safar yangi unikal channel nomi (takrorlanishni oldini oladi)
    const channelName = `bemorlar-changes-${Date.now()}`;

    const ch = sb.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'infarkt_qabul' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insult_qabul' }, callback)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime ulandi:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Realtime xato:', channelName);
        }
      });

    this._channels['bemorlar'] = ch;
    return ch;
  },

  async unsubscribe(key) {
    if (this._channels[key]) {
      try {
        await getSupabase().removeChannel(this._channels[key]);
      } catch (e) {
        console.warn('Realtime unsubscribe xato:', e.message);
      }
      delete this._channels[key];
    }
  },

  async unsubscribeAll() {
    for (const k of Object.keys(this._channels)) {
      await this.unsubscribe(k);
    }
  }
};

// ==================== PROFILE ====================
const Profile = {
  _cache: {},
  async get(userId) {
    if (this._cache[userId]) return this._cache[userId];
    const sb = getSupabase();
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (error) {
      console.warn('Profile get error:', error);
      return null;
    }
    if (data) this._cache[userId] = data;
    return data;
  },
  async getCurrent() {
    const user = await Auth.getUser();
    if (!user) return null;
    return await this.get(user.id);
  },
  // super_admin yoki admin bo'lsa true
  async isAdmin() {
    const p = await this.getCurrent();
    return p?.role === 'admin' || p?.role === 'super_admin';
  },
  // Faqat super_admin uchun
  async isSuperAdmin() {
    const p = await this.getCurrent();
    return p?.role === 'super_admin';
  },
  // Tahrirlash huquqi: super_admin va admin uchun
  async canEdit() {
    const p = await this.getCurrent();
    return p?.role === 'admin' || p?.role === 'super_admin';
  },
  // Foydalanuvchilarni boshqarish: faqat super_admin
  async canManageUsers() {
    const p = await this.getCurrent();
    return p?.role === 'super_admin';
  },
  // O'chirish huquqi: faqat super_admin
  async canDelete() {
    const p = await this.getCurrent();
    return p?.role === 'super_admin';
  },
  async listAll() {
    const { data, error } = await getSupabase().from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async setRole(userId, role) {
    const { data, error } = await getSupabase().from('profiles').update({ role }).eq('id', userId).select().single();
    if (error) throw error;
    this._cache[userId] = data;
    return data;
  },
  async setViloyat(userId, viloyat) {
    const { data, error } = await getSupabase().from('profiles').update({ viloyat }).eq('id', userId).select().single();
    if (error) throw error;
    this._cache[userId] = data;
    return data;
  },
  async deleteProfile(userId) {
    const { error } = await getSupabase().rpc('admin_delete_user', { target_user_id: userId });
    if (error) throw error;
    delete this._cache[userId];
  },

  async update(updates) {
    const user = await Auth.getUser();
    if (!user) throw new Error('Foydalanuvchi tizimga kirmagan');
    const { error } = await getSupabase()
      .from('profiles').update(updates).eq('id', user.id);
    if (error) throw error;
    delete this._cache[user.id];
  }
};

// ==================== MUASSASA CONFIG DB ====================
const MuassasaDB = {
  async getOverrides() {
    try {
      const { data, error } = await getSupabase()
        .from('muassasa_overrides').select('*').order('created_at');
      if (error) throw error;
      return data || [];
    } catch(e) {
      return [];
    }
  },

  async addOverride(viloyat, nomi, action) {
    const sb = getSupabase();
    const opposite = action === 'add' ? 'remove' : 'add';
    await sb.from('muassasa_overrides').delete()
      .eq('viloyat', viloyat).eq('nomi', nomi).eq('action', opposite);
    const { data: existing } = await sb.from('muassasa_overrides').select('id')
      .eq('viloyat', viloyat).eq('nomi', nomi).eq('action', action);
    if (existing && existing.length > 0) return;
    const { error } = await sb.from('muassasa_overrides').insert({ viloyat, nomi, action });
    if (error) throw error;
  },

  async deleteOverride(id) {
    const { error } = await getSupabase().from('muassasa_overrides').delete().eq('id', id);
    if (error) throw error;
  },

  applyToConfig(overrides) {
    if (!APP_CONFIG._MUASSASALAR_BASE) {
      APP_CONFIG._MUASSASALAR_BASE = {};
      Object.keys(APP_CONFIG.MUASSASALAR).forEach(v => {
        APP_CONFIG._MUASSASALAR_BASE[v] = [...APP_CONFIG.MUASSASALAR[v]];
      });
    }
    const result = {};
    Object.keys(APP_CONFIG._MUASSASALAR_BASE).forEach(v => {
      result[v] = [...APP_CONFIG._MUASSASALAR_BASE[v]];
    });
    overrides.forEach(ov => {
      if (!result[ov.viloyat]) result[ov.viloyat] = [];
      if (ov.action === 'add' && !result[ov.viloyat].includes(ov.nomi)) {
        result[ov.viloyat].push(ov.nomi);
      } else if (ov.action === 'remove') {
        result[ov.viloyat] = result[ov.viloyat].filter(n => n !== ov.nomi);
      }
    });
    APP_CONFIG.MUASSASALAR = result;
  },

  async fetchAllRecords() {
    const sb = getSupabase();
    const cols = 'kt_no,fio,viloyat,muassasa,qabul_vaqt,status';
    const fetchAll = async (table) => {
      let all = [], from = 0;
      while (true) {
        const { data, error } = await sb.from(table).select(cols).range(from, from + 999);
        if (error || !data) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        from += 1000;
      }
      return all;
    };
    const [infs, ins] = await Promise.all([
      fetchAll('infarkt_qabul'),
      fetchAll('insult_qabul')
    ]);
    return [
      ...infs.map(p => ({ ...p, _type: 'infarkt' })),
      ...ins.map(p => ({ ...p, _type: 'insult' }))
    ];
  }
};
