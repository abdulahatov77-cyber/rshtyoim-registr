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

// ==================== USER ACTIVITY LOG ====================
const UserLog = {
  async write(action) {
    try {
      const profile = await Profile.getCurrent();
      if (!profile) return;
      await getSupabase().from('user_logs').insert({
        user_id:   profile.id,
        email:     profile.email,
        full_name: profile.full_name,
        role:      profile.role,
        viloyat:   profile.viloyat,
        action,
        user_agent: navigator.userAgent.slice(0, 200)
      });
    } catch(_) { /* log yozish muvaffaqiyatsiz bo'lsa dastur ishini to'xtatmasin */ }
  },

  async list({ limit = 200, userId } = {}) {
    let q = getSupabase()
      .from('user_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (userId) q = q.eq('user_id', userId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
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
  _LIST_COLS_INF: 'kt_no,fio,tugilgan_sana,tugilgan_yil,jins,viloyat,muassasa,qabul_vaqt,status,infarkt_turi,muolaja_turi,killip,otkazilgan_muassasa,created_at',

  async infarktList(filters = {}) {
    const cols = filters.allCols ? '*' : DB._LIST_COLS_INF;
    const pageSize = filters.pageSize || 50;
    const page     = filters.page     || 0;

    const applyFilters = (q) => {
      if (filters.status)  q = q.eq('status',  filters.status);
      if (filters.viloyat) q = q.eq('viloyat', filters.viloyat);
      if (filters.from)    q = q.gte('qabul_vaqt', filters.from);
      if (filters.to)      q = q.lte('qabul_vaqt', filters.to);
      if (filters.search) { const s = filters.search.replace(/[,()]/g, '').trim(); if (s) q = q.or(`fio.ilike.%${s}%,kt_no.ilike.%${s}%,muassasa.ilike.%${s}%`); }
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
    const p = await Profile.getCurrent();
    const sb = getSupabase();
    let q = sb.from('infarkt_qabul').select('*').eq('kt_no', kt_no);
    if (p?.role !== 'super_admin' && p?.viloyat) q = q.eq('viloyat', p.viloyat);
    const { data, error } = await q.single();
    if (error) throw error;
    return data;
  },

  async infarktUpdate(kt_no, updates) {
    const p = await Profile.getCurrent();
    const sb = getSupabase();
    let q = sb.from('infarkt_qabul').update(updates).eq('kt_no', kt_no);
    if (p?.role !== 'super_admin' && p?.viloyat) q = q.eq('viloyat', p.viloyat);
    const { data, error } = await q.select().single();
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

  _LIST_COLS_INS: 'kt_no,fio,tugilgan_sana,tugilgan_yil,jins,viloyat,muassasa,qabul_vaqt,status,insult_turi,muolaja_turi,nihss_qabul,otkazilgan_muassasa,created_at',

  async insultList(filters = {}) {
    const cols = filters.allCols ? '*' : DB._LIST_COLS_INS;
    const pageSize = filters.pageSize || 50;
    const page     = filters.page     || 0;

    const applyFilters = (q) => {
      if (filters.status)  q = q.eq('status',  filters.status);
      if (filters.viloyat) q = q.eq('viloyat', filters.viloyat);
      if (filters.from)    q = q.gte('qabul_vaqt', filters.from);
      if (filters.to)      q = q.lte('qabul_vaqt', filters.to);
      if (filters.search) { const s = filters.search.replace(/[,()]/g, '').trim(); if (s) q = q.or(`fio.ilike.%${s}%,kt_no.ilike.%${s}%,muassasa.ilike.%${s}%`); }
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
    const p = await Profile.getCurrent();
    const sb = getSupabase();
    let q = sb.from('insult_qabul').select('*').eq('kt_no', kt_no);
    if (p?.role !== 'super_admin' && p?.viloyat) q = q.eq('viloyat', p.viloyat);
    const { data, error } = await q.single();
    if (error) throw error;
    return data;
  },

  async insultUpdate(kt_no, updates) {
    const p = await Profile.getCurrent();
    const sb = getSupabase();
    let q = sb.from('insult_qabul').update(updates).eq('kt_no', kt_no);
    if (p?.role !== 'super_admin' && p?.viloyat) q = q.eq('viloyat', p.viloyat);
    const { data, error } = await q.select().single();
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
  async getDashboardStats(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const eqViloyat = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);
    // Bugungi sana: O'zbekiston vaqti (UTC+5) da 00:00 dan 23:59 gacha
    // UTC+5 => bugungi 00:00 UZT = UTC 19:00 (kecha), 23:59 UZT = UTC 18:59 (bugun)
    const nowUzt = new Date();
    const uztOffset = 5 * 60; // daqiqada
    const localMs = nowUzt.getTime() + uztOffset * 60000;
    const uztDate = new Date(localMs);
    const yy = uztDate.getUTCFullYear();
    const mm = String(uztDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(uztDate.getUTCDate()).padStart(2, '0');
    // Bugungi 00:00 UZT = shu kecha UTC 19:00
    const todayISO    = `${yy}-${mm}-${dd}T00:00:00+05:00`;
    const todayEndISO = `${yy}-${mm}-${dd}T23:59:59+05:00`;

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
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')).in('killip', ['Killip III вЂ” o\'pka shishi', 'Killip IV вЂ” kardiogen shok']),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')).gte('nihss_qabul', 15),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'otkazildi')),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'otkazildi'))
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
      fetchAllTypes('infarkt_qabul', 'infarkt_turi,muolaja_turi,status'),
      fetchAllTypes('insult_qabul', 'insult_turi,muolaja_turi,status')
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
      otkazilganInfarkt: infOtkaz || 0,
      otkazilganInsult: insOtkaz || 0,
      otkazildi: (infOtkaz || 0) + (insOtkaz || 0),
      // Infarkt klinik
      stemi:              iT.filter(p => p.infarkt_turi?.toUpperCase().includes('STEMI') && !p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length,
      stemiDavol:         iT.filter(p => p.infarkt_turi?.toUpperCase().includes('STEMI') && !p.infarkt_turi?.toUpperCase().includes('NSTEMI') && p.status === 'chiqarildi').length,
      stemiVafot:         iT.filter(p => p.infarkt_turi?.toUpperCase().includes('STEMI') && !p.infarkt_turi?.toUpperCase().includes('NSTEMI') && p.status === 'vafot').length,
      nstemi:             iT.filter(p => p.infarkt_turi?.toUpperCase().includes('NSTEMI')).length,
      nstemiDavol:        iT.filter(p => p.infarkt_turi?.toUpperCase().includes('NSTEMI') && p.status === 'chiqarildi').length,
      nstemiVafot:        iT.filter(p => p.infarkt_turi?.toUpperCase().includes('NSTEMI') && p.status === 'vafot').length,
      miokard:            iT.filter(p => p.infarkt_turi?.toLowerCase().includes('miokard')).length,
      miokardDavol:       iT.filter(p => p.infarkt_turi?.toLowerCase().includes('miokard') && p.status === 'chiqarildi').length,
      miokardVafot:       iT.filter(p => p.infarkt_turi?.toLowerCase().includes('miokard') && p.status === 'vafot').length,
      koronar:            iT.filter(p => p.muolaja_turi?.includes('KAG') || p.muolaja_turi?.toLowerCase().includes('koronarangiografiya')).length,
      koronarDavol:       iT.filter(p => (p.muolaja_turi?.includes('KAG') || p.muolaja_turi?.toLowerCase().includes('koronarangiografiya')) && p.status === 'chiqarildi').length,
      koronarVafot:       iT.filter(p => (p.muolaja_turi?.includes('KAG') || p.muolaja_turi?.toLowerCase().includes('koronarangiografiya')) && p.status === 'vafot').length,
      trombolizis:        iT.filter(p => p.muolaja_turi?.includes('TLT') || p.muolaja_turi?.toLowerCase().includes('trombolitik')).length,
      trombolizisDavol:   iT.filter(p => (p.muolaja_turi?.includes('TLT') || p.muolaja_turi?.toLowerCase().includes('trombolitik')) && p.status === 'chiqarildi').length,
      trombolizisVafot:   iT.filter(p => (p.muolaja_turi?.includes('TLT') || p.muolaja_turi?.toLowerCase().includes('trombolitik')) && p.status === 'vafot').length,
      medikamentoz:       iT.filter(p => p.muolaja_turi?.toLowerCase().includes('medikamentoz')).length,
      medikamentozDavol:  iT.filter(p => p.muolaja_turi?.toLowerCase().includes('medikamentoz') && p.status === 'chiqarildi').length,
      medikamentozVafot:  iT.filter(p => p.muolaja_turi?.toLowerCase().includes('medikamentoz') && p.status === 'vafot').length,
      // Insult klinik
      ishemik:                nT.filter(p => p.insult_turi?.toLowerCase().includes('ishemik')).length,
      ishemikDavol:           nT.filter(p => p.insult_turi?.toLowerCase().includes('ishemik') && p.status === 'chiqarildi').length,
      ishemikVafot:           nT.filter(p => p.insult_turi?.toLowerCase().includes('ishemik') && p.status === 'vafot').length,
      gemorragik:             nT.filter(p => p.insult_turi?.toLowerCase().includes('gemorragik')).length,
      gemorragikDavol:        nT.filter(p => p.insult_turi?.toLowerCase().includes('gemorragik') && p.status === 'chiqarildi').length,
      gemorragikVafot:        nT.filter(p => p.insult_turi?.toLowerCase().includes('gemorragik') && p.status === 'vafot').length,
      tia:                    nT.filter(p => p.insult_turi?.toUpperCase().includes('TIA')).length,
      tiaDavol:               nT.filter(p => p.insult_turi?.toUpperCase().includes('TIA') && p.status === 'chiqarildi').length,
      tiaVafot:               nT.filter(p => p.insult_turi?.toUpperCase().includes('TIA') && p.status === 'vafot').length,
      mskt:                   nT.filter(p => p.muolaja_turi?.toUpperCase().includes('MSKT')).length,
      msktDavol:              nT.filter(p => p.muolaja_turi?.toUpperCase().includes('MSKT') && p.status === 'chiqarildi').length,
      msktVafot:              nT.filter(p => p.muolaja_turi?.toUpperCase().includes('MSKT') && p.status === 'vafot').length,
      trombektomiya:          nT.filter(p => p.muolaja_turi?.toLowerCase().includes('trombektom') || p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya')).length,
      trombektomiyaDavol:     nT.filter(p => (p.muolaja_turi?.toLowerCase().includes('trombektom') || p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya')) && p.status === 'chiqarildi').length,
      trombektomiyaVafot:     nT.filter(p => (p.muolaja_turi?.toLowerCase().includes('trombektom') || p.muolaja_turi?.toLowerCase().includes('tromboekstraksiya')) && p.status === 'vafot').length,
      insultMedikamentoz:       nT.filter(p => p.muolaja_turi?.toLowerCase().includes('medikamentoz') || p.muolaja_turi?.toLowerCase().includes('konservativ')).length,
      insultMedikamentozDavol:  nT.filter(p => (p.muolaja_turi?.toLowerCase().includes('medikamentoz') || p.muolaja_turi?.toLowerCase().includes('konservativ')) && p.status === 'chiqarildi').length,
      insultMedikamentozVafot:  nT.filter(p => (p.muolaja_turi?.toLowerCase().includes('medikamentoz') || p.muolaja_turi?.toLowerCase().includes('konservativ')) && p.status === 'vafot').length,
    };
  },

  // Last 30 days trend
  async getTrend30(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const eqViloyat = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);
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

  // Last 12 months trend
  async getTrend12Month(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const eqViloyat = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
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
    const monthNames = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + i, 1));
      const yr = d.getUTCFullYear();
      const mo = d.getUTCMonth();
      const prefix = `${yr}-${String(mo + 1).padStart(2, '0')}`;
      labels.push(`${monthNames[mo]} ${yr}`);
      infData.push(inf.filter(r => r.qabul_vaqt?.startsWith(prefix)).length);
      insData.push(ins.filter(r => r.qabul_vaqt?.startsWith(prefix)).length);
    }
    return { labels, infData, insData };
  },

  // Risk factors distribution
  async getRiskFactors(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const eqViloyat = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);

    const fetchAll = async (table) => {
      let all = [], offset = 0;
      while (true) {
        const { data, error } = await eqViloyat(
          getSupabase().from(table).select('xavf_omil')
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

    const count = (rows) => {
      const map = {};
      rows.forEach(r => {
        const arr = Array.isArray(r.xavf_omil) ? r.xavf_omil : (r.xavf_omil ? [r.xavf_omil] : []);
        arr.forEach(v => {
          if (!v || !v.trim()) return;
          const k = v.trim();
          map[k] = (map[k] || 0) + 1;
        });
      });
      return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
    };

    return { infarkt: count(inf), insult: count(ins) };
  },

  // Recent patients
  async getRecentPatients(limit = 10, overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const eqViloyat = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);
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

  // 15+ kun davolanayotgan bemorlar muassasa bo'yicha
  async getLongStayPatients(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const eqViloyat = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 15);
    const cutoffISO = cutoff.toISOString();
    const [{ data: inf }, { data: ins }] = await Promise.all([
      eqViloyat(getSupabase().from('infarkt_qabul').select('kt_no,fio,tugilgan_yil,muassasa,viloyat,qabul_vaqt,status,infarkt_turi').eq('status', 'active').lte('qabul_vaqt', cutoffISO)),
      eqViloyat(getSupabase().from('insult_qabul').select('kt_no,fio,tugilgan_yil,muassasa,viloyat,qabul_vaqt,status,insult_turi').eq('status', 'active').lte('qabul_vaqt', cutoffISO))
    ]);
    const all = [
      ...(inf || []).map(r => ({ ...r, _type: 'infarkt' })),
      ...(ins || []).map(r => ({ ...r, _type: 'insult' }))
    ];
    // Muassasa bo'yicha guruhlash
    const map = {};
    all.forEach(r => {
      const key = r.muassasa || r.viloyat || 'Noma\'lum';
      if (!map[key]) map[key] = { muassasa: key, bemorlar: [] };
      const days = Math.floor((new Date() - new Date(r.qabul_vaqt)) / 86400000);
      map[key].bemorlar.push({ ...r, kunlar: days });
    });
    return Object.values(map).sort((a, b) => b.bemorlar.length - a.bemorlar.length);
  },

  // Jins bo'yicha vafot foizi
  async getGenderMortality(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const eqV = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);
    const sb = getSupabase();
    const norm = (s) => {
      const v = (s||'').toLowerCase();
      if (['erkak','e','m','male'].includes(v)) return 'male';
      if (['ayol','a','f','female'].includes(v)) return 'female';
      return null;
    };
    const fetchAll = async (table) => {
      let all = [], offset = 0;
      while (true) {
        const { data, error } = await eqV(sb.from(table).select('jins,status')).range(offset, offset + 999);
        if (error || !data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return all;
    };
    const [inf, ins] = await Promise.all([fetchAll('infarkt_qabul'), fetchAll('insult_qabul')]);
    const calc = (rows) => {
      const r = { male: 0, female: 0, maleDeath: 0, femaleDeath: 0 };
      rows.forEach(row => {
        const g = norm(row.jins);
        if (g === 'male') { r.male++; if (row.status === 'vafot') r.maleDeath++; }
        else if (g === 'female') { r.female++; if (row.status === 'vafot') r.femaleDeath++; }
      });
      return r;
    };
    return { infarkt: calc(inf), insult: calc(ins) };
  },

  // Demographics
  async getDemographics(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const { data, error } = await getSupabase().rpc('get_demographics', { p_viloyat: viloyat });
    if (error) {
      console.error('getDemographics RPC xato:', error.message);
      return {
        infarkt: { male: 0, female: 0, ages: { 'в‰¤29': 0, '30-44': 0, '45-59': 0, '60-74': 0, '75+': 0 } },
        insult:  { male: 0, female: 0, ages: { 'в‰¤29': 0, '30-44': 0, '45-59': 0, '60-74': 0, '75+': 0 } }
      };
    }
    return data;
  },

  // Age-Sex Pyramid ma'lumotlari
  async getAgeSexPyramid(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const sb = getSupabase();
    const eqV = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);
    const AGE_GROUPS = ['75+', '60-74', '45-59', '30-44', 'в‰¤29']; // yuqoridan pastga
    const norm = (s) => {
      const v = (s||'').toLowerCase();
      if (['erkak','e','m','male'].includes(v)) return 'male';
      if (['ayol','a','f','female'].includes(v)) return 'female';
      return null;
    };
    const getAge = (row) => {
      const born = row.tugilgan_sana || row.tugilgan_yil;
      if (!born) return null;
      const b = new Date(born);
      if (isNaN(b)) return null;
      const ref = row.qabul_vaqt ? new Date(row.qabul_vaqt) : new Date();
      let age = ref.getFullYear() - b.getFullYear();
      if (ref.getMonth() < b.getMonth() || (ref.getMonth() === b.getMonth() && ref.getDate() < b.getDate())) age--;
      return age;
    };
    const ageGroup = (age) => {
      if (age === null) return null;
      if (age <= 29) return 'в‰¤29';
      if (age <= 44) return '30-44';
      if (age <= 59) return '45-59';
      if (age <= 74) return '60-74';
      return '75+';
    };
    const fetchAll = async (table) => {
      let all = [], offset = 0;
      while (true) {
        const { data, error } = await eqV(sb.from(table).select('jins,status,tugilgan_sana,tugilgan_yil,qabul_vaqt')).range(offset, offset + 999);
        if (error || !data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < 1000) break;
        offset += 1000;
      }
      return all;
    };
    const buildPyramid = (rows) => {
      const res = {};
      AGE_GROUPS.forEach(g => { res[g] = { mTotal: 0, fTotal: 0, mDeath: 0, fDeath: 0 }; });
      rows.forEach(row => {
        const g = norm(row.jins);
        const ag = ageGroup(getAge(row));
        if (!g || !ag) return;
        const isDead = row.status === 'vafot';
        if (g === 'male') { res[ag].mTotal++; if (isDead) res[ag].mDeath++; }
        else { res[ag].fTotal++; if (isDead) res[ag].fDeath++; }
      });
      return { groups: AGE_GROUPS, data: res };
    };
    const [inf, ins] = await Promise.all([fetchAll('infarkt_qabul'), fetchAll('insult_qabul')]);
    return { infarkt: buildPyramid(inf), insult: buildPyramid(ins) };
  },

  // Viloyat (yoki Muassasa) distribution
  async getViloyatStats(overrideViloyat) {
    const p = await Profile.getCurrent();
    const userViloyat = overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat);
    const sb = getSupabase();

    if (userViloyat) {
      // Non-admin: muassasa kesimida ko'rsatish
      const fetchAll = async (table) => {
        let all = [], offset = 0;
        while (true) {
          const { data, error } = await sb.from(table).select('muassasa').eq('viloyat', userViloyat).range(offset, offset + 999);
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
      return Object.entries(map).map(([name, s]) => [name, s.total, s.inf, s.ins]).sort((a, b) => b[1] - a[1]);
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

    let all = [], offset = 0;
    while (true) {
      let query = sb.from(table).select('viloyat, muassasa, status');
      if (viloyat) query = query.eq('viloyat', viloyat);
      query = query.range(offset, offset + 999);
      const { data, error } = await query;
      if (error) { if (error.code === 'PGRST103') break; throw error; }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      offset += 1000;
    }
    const data = all;
    
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

      const norm = (s) => s.replace(/[вЂвЂ™Кј`Вґ]/g, "'").toLowerCase().replace(/ttb|shtb|emergency department|politravma markazi|filiali|shoshilinch tibbiy yordam/g, '').trim();

      // Agar nom configda bo'lmasa, o'xshashini qidirib ko'ramiz
      if (viloyat && !stats[key]) {
        const nKey = norm(key);
        const match = Object.keys(stats).find(name => norm(name) === nKey || norm(name).includes(nKey) || nKey.includes(norm(name)));
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

    // Chat ID вЂ” integer bo'lishi kerak
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
        showToast('рџ“± Telegram xabar yuborildi!', 'success', 3000);
        console.log('вњ… Telegram OK:', json);
      } else {
        const errMsg = json.description || 'Noma\'lum xato';
        showToast(`вљ пёЏ Telegram xato: ${errMsg}`, 'warning', 6000);
        console.error('вќЊ Telegram API xato:', json);
      }
    } catch (e) {
      showToast(`вљ пёЏ Telegram ulanmadi: ${e.message}`, 'warning', 6000);
      console.error('вќЊ Telegram fetch xato:', e);
    }
  },

  // Test funksiyasi вЂ” brauzer konsolidan chaqirish uchun: Telegram.test('infarkt')
  async test(type = 'infarkt') {
    const token = type === 'infarkt'
      ? APP_CONFIG.TELEGRAM_INFARKT_TOKEN
      : APP_CONFIG.TELEGRAM_INSULT_TOKEN;
    const chatId = parseInt(
      type === 'infarkt'
        ? APP_CONFIG.TELEGRAM_INFARKT_CHAT
        : APP_CONFIG.TELEGRAM_INSULT_CHAT
    );

    console.log(`рџ”Ќ Telegram test: type=${type}, chatId=${chatId}`);

    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `вњ… RSHTYOIM test xabari вЂ” ${new Date().toLocaleString('uz-UZ')}`,
          parse_mode: 'HTML'
        })
      }
    );
    const json = await res.json();
    console.log('Telegram test natija:', json);
    if (json.ok) {
      showToast('вњ… Test xabar yuborildi!', 'success');
    } else {
      showToast(`вќЊ Test xato: ${json.description}`, 'error', 8000);
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
          if (isNaN(d)) return String(patient.qabul_vaqt);
          // UTC+5 Toshkent vaqtiga o'girish
          const tz = new Date(d.getTime() + 5 * 60 * 60 * 1000);
          const pad = n => String(n).padStart(2, '0');
          return `${pad(tz.getUTCDate())}.${pad(tz.getUTCMonth()+1)}.${tz.getUTCFullYear()} ${pad(tz.getUTCHours())}:${pad(tz.getUTCMinutes())}`;
        })()
      : 'вЂ”';

    const genderIcon = patient.jins === 'Ayol' ? 'рџ‘©' : 'рџ‘Ё';
    const shifokor = patient.shifokor_fio || 'вЂ”';

    if (type === 'infarkt') {
      const killip = patient.killip || '';
      let kritik = '';
      if (killip.includes('III') || killip.includes('IV')) {
        kritik = `\nвљ пёЏ <b>DIQQAT: KRITIK HOLAT! (Killip ${killip.includes('IV') ? 'IV' : 'III'})</b>`;
      }
      const kagLine = patient.angio_natija
        ? `\nрџ§Є <b>KAG natijasi:</b> ${patient.angio_natija}` : '';

      return `рџ«Ђ <b>YANGI INFARKT BEMOR QABUL QILINDI</b>
в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
рџ“Ќ <b>Viloyat:</b> ${patient.viloyat || 'вЂ”'}
рџЏҐ <b>Muassasa:</b> ${patient.muassasa || 'вЂ”'}
рџ‘ЁвЂЌвљ•пёЏ <b>Shifokor:</b> ${shifokor}
рџ“‹ <b>K/T No:</b> <code>${patient.kt_no || 'вЂ”'}</code>
${genderIcon} <b>Bemor:</b> ${patient.fio || 'вЂ”'}, ${age} yosh, ${patient.jins || 'вЂ”'}
рџ”ґ <b>${patient.infarkt_turi || 'вЂ”'}</b>
рџ©є <b>Killip:</b> ${killip || 'вЂ”'}
рџ’Љ <b>Muolaja:</b> ${patient.muolaja_turi || 'вЂ”'}${kagLine}
рџ“Љ <b>AHA bali:</b> ${patient.aha_bali ?? 'вЂ”'}
вЏ° <b>Simptom:</b> ${patient.simptom_vaqt || 'вЂ”'}
рџ•ђ <b>Qabul:</b> ${qabul}
в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ${kritik}`;

    } else {
      const nihss = patient.nihss_qabul ?? 'вЂ”';
      const gcs   = patient.gcs_bali ?? patient.gcs_qabul ?? 'вЂ”';
      let kritik = '';
      if (patient.nihss_qabul != null && patient.nihss_qabul >= 15) {
        kritik = `\nвљ пёЏ <b>DIQQAT: OG'IR HOLAT! (NIHSS = ${patient.nihss_qabul})</b>`;
      }

      return `рџ§  <b>YANGI INSULT BEMOR QABUL QILINDI</b>
в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ
рџ“Ќ <b>Viloyat:</b> ${patient.viloyat || 'вЂ”'}
рџЏҐ <b>Muassasa:</b> ${patient.muassasa || 'вЂ”'}
рџ‘ЁвЂЌвљ•пёЏ <b>Shifokor:</b> ${shifokor}
рџ“‹ <b>K/T в„–:</b> <code>${patient.kt_no || 'вЂ”'}</code>
${genderIcon} <b>Bemor:</b> ${patient.fio || 'вЂ”'}, ${age} yosh, ${patient.jins || 'вЂ”'}
рџ©є <b>Insult turi:</b> ${patient.insult_turi || 'вЂ”'}
рџ“Љ <b>NIHSS/GCS:</b> ${nihss} / ${gcs}
рџ“‹ <b>AHA:</b> ${patient.aha_bali ?? 'вЂ”'}
вЏ±пёЏ <b>Simptom:</b> ${patient.simptom_vaqt || 'вЂ”'}
рџ’‰ <b>Muolaja:</b> ${patient.muolaja_turi || 'вЂ”'}
рџ•ђ <b>Qabul:</b> ${qabul}
в”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓв”Ѓ${kritik}`;
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
          console.log('вњ… Realtime ulandi:', channelName);
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('вљ пёЏ Realtime xato:', channelName);
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

