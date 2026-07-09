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
  _userCache: null,

  async signIn(email, password) {
    const sb = getSupabase();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    Auth._userCache = data?.user || null;
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
    Auth._userCache = null;
    Profile._cache = {};
  },

  // getSession() local localStorage dan o'qiydi — network so'rovsiz, tez
  async getUser() {
    if (Auth._userCache) return Auth._userCache;
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    Auth._userCache = session?.user || null;
    return Auth._userCache;
  },

  async getSession() {
    const sb = getSupabase();
    const { data: { session } } = await sb.auth.getSession();
    return session;
  },

  onAuthStateChange(callback) {
    return getSupabase().auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') Auth._userCache = session?.user || null;
      if (event === 'SIGNED_OUT') { Auth._userCache = null; Profile._cache = {}; }
      callback(event, session);
    });
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
  // F.I.O normalize qilingan holda bir xil bemor bazada bormi tekshiradi
  async checkDuplicate(table, fio, tugilganYil, qabulVaqtIso) {
    if (!fio || !qabulVaqtIso) return null;
    const normFio = Utils.normalizeFio(fio);
    const day = qabulVaqtIso.slice(0, 10);
    const { data } = await getSupabase()
      .from(table)
      .select('kt_no,fio,tugilgan_yil,qabul_vaqt,muassasa')
      .gte('qabul_vaqt', `${day}T00:00:00`)
      .lte('qabul_vaqt', `${day}T23:59:59`)
      .limit(50);
    if (!data) return null;
    return data.find(r => {
      const rFio = Utils.normalizeFio(r.fio || '').toLowerCase();
      const nFio = normFio.toLowerCase();
      return rFio === nFio && String(r.tugilgan_yil||'') === String(tugilganYil||'');
    }) || null;
  },

  // Infarkt CRUD
  async infarktQabul(data) {
    const user = await Auth.getUser();
    // Faqat mavjud ustunlarni yuboramiz
    const allowed = [
      'viloyat','muassasa','kt_no','qabul_vaqt','murojaat_yoli','yuborgan_muassasa',
      'fio','tugilgan_yil','jins',
      'aha_bali','simptom_vaqt','birlamchi_yoki_takroriy',
      'infarkt_turi','killip','qon_bosimi','puls','ekg_vaqti','troponin','kkfmb','grace_bali',
      'ekg_natija','xavf_omil',
      'birinchi_murojaat_vaqti','tez_yordam_kelgan_vaqt','tlt_vaqt','pci_vaqt',
      'muolaja_turi','angio_natija','otkazilgan_muassasa','otkazish_sababi',
      'dinamika_muolaja_turi','dinamika_izoh',
      'shifokor_fio','shifokor_tel','status'
    ];
    const clean = {};
    for (const k of allowed) {
      if (data[k] !== undefined) clean[k] = data[k];
    }
    if (clean.fio) clean.fio = Utils.normalizeFio(clean.fio);
    // INTEGER maydonlar: bo'sh string → null
    if (clean.grace_bali === '' || clean.grace_bali === null) delete clean.grace_bali;
    else if (clean.grace_bali !== undefined) clean.grace_bali = parseInt(clean.grace_bali) || null;
    // (kt_no, muassasa) juftligi takrorlansa — yangi kt_no bilan qayta urinish
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) clean.kt_no = Utils.generateKtNo(clean.muassasa || '');
      const { data: result, error } = await getSupabase()
        .from('infarkt_qabul')
        .insert({ ...clean, user_id: user?.id })
        .select()
        .single();
      if (!error) return result;
      const isKtDup = error.message?.includes('infarkt_qabul_kt_no_muassasa_key');
      if (!isKtDup) throw error;
    }
    throw new Error(`"${clean.kt_no}" raqami bu muassasada allaqachon mavjud — boshqa raqam kiriting`);
  },

  // Ro'yxat uchun faqat kerakli ustunlar (select * emas)
  _LIST_COLS_INF: 'kt_no,fio,tugilgan_sana,tugilgan_yil,jins,viloyat,muassasa,qabul_vaqt,status,infarkt_turi,muolaja_turi,killip,otkazilgan_muassasa,created_at',

  async infarktList(filters = {}) {
    const cols = filters.allCols ? '*' : DB._LIST_COLS_INF;
    const pageSize = filters.pageSize || 50;
    const page     = filters.page     || 0;

    const applyFilters = (q) => {
      if (filters.status)   q = q.eq('status',   filters.status);
      if (filters.viloyat)  q = q.eq('viloyat',  filters.viloyat);
      if (filters.muassasa) q = q.eq('muassasa', filters.muassasa);
      if (filters.from)     q = q.gte('qabul_vaqt', filters.from);
      if (filters.to)       q = q.lte('qabul_vaqt', filters.to);
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
      getSupabase().from('infarkt_qabul').select(cols, { count: 'exact' }).order('created_at', { ascending: false })
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
      'mskt','mskt_angiografiya','muolaja_turi','otkazilgan_muassasa',
      'aspects_c','aspects_l','aspects_ic','aspects_i',
      'aspects_m1','aspects_m2','aspects_m3','aspects_m4','aspects_m5','aspects_m6',
      'birinchi_murojaat_vaqti','tez_yordam_kelgan_vaqt','kt_vaqti','trombolizis_vaqti','trombektomiya_vaqti',
      'dinamika_muolaja_turi','dinamika_izoh',
      'shifokor_fio','shifokor_tel','status'
    ];
    const clean = {};
    for (const k of allowed) {
      if (data[k] !== undefined) clean[k] = data[k];
    }
    if (clean.fio) clean.fio = Utils.normalizeFio(clean.fio);
    for (let attempt = 0; attempt < 5; attempt++) {
      if (attempt > 0) clean.kt_no = Utils.generateKtNo(clean.muassasa || '');
      const { data: result, error } = await getSupabase()
        .from('insult_qabul')
        .insert({ ...clean, user_id: user?.id })
        .select()
        .single();
      if (!error) return result;
      const isKtDup = error.message?.includes('insult_qabul_kt_no_muassasa_key');
      if (!isKtDup) throw error;
    }
    throw new Error(`"${clean.kt_no}" raqami bu muassasada allaqachon mavjud — boshqa raqam kiriting`);
  },

  _LIST_COLS_INS: 'kt_no,fio,tugilgan_sana,tugilgan_yil,jins,viloyat,muassasa,qabul_vaqt,status,insult_turi,muolaja_turi,nihss_qabul,otkazilgan_muassasa,created_at',

  async insultList(filters = {}) {
    const cols = filters.allCols ? '*' : DB._LIST_COLS_INS;
    const pageSize = filters.pageSize || 50;
    const page     = filters.page     || 0;

    const applyFilters = (q) => {
      if (filters.status)   q = q.eq('status',   filters.status);
      if (filters.viloyat)  q = q.eq('viloyat',  filters.viloyat);
      if (filters.muassasa) q = q.eq('muassasa', filters.muassasa);
      if (filters.from)     q = q.gte('qabul_vaqt', filters.from);
      if (filters.to)       q = q.lte('qabul_vaqt', filters.to);
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
      getSupabase().from('insult_qabul').select(cols, { count: 'exact' }).order('created_at', { ascending: false })
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
  async getDashboardStats(overrideViloyat, overrideMuassasa, dateFrom, dateTo) {
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

    // Barcha statistikani bitta RPC chaqiruvida olamiz (14 ta alohida so'rov o'rniga)
    const { data: rpcData, error: rpcErr } = await getSupabase().rpc('get_dashboard_stats', {
      p_viloyat:     viloyat || null,
      p_muassasa:    overrideMuassasa || null,
      p_today_start: todayISO,
      p_today_end:   todayEndISO,
      p_from:        dateFrom || null,
      p_to:          dateTo   || null
    });
    if (rpcErr) throw rpcErr;
    const s = rpcData || {};

    return {
      jamiInfarkt:        s.jami_infarkt        || 0,
      jamiInsult:         s.jami_insult         || 0,
      jami:              (s.jami_infarkt         || 0) + (s.jami_insult         || 0),
      infarktAktiv:       s.aktiv_infarkt       || 0,
      insultAktiv:        s.aktiv_insult        || 0,
      vafotInfarkt:       s.vafot_infarkt       || 0,
      vafotInsult:        s.vafot_insult        || 0,
      vafot:             (s.vafot_infarkt        || 0) + (s.vafot_insult        || 0),
      chiqarilganInfarkt: s.chiqarildi_infarkt  || 0,
      chiqarilganInsult:  s.chiqarildi_insult   || 0,
      infarktBugun:       s.bugun_infarkt       || 0,
      insultBugun:        s.bugun_insult        || 0,
      kritikInfarkt:      s.kritik_infarkt      || 0,
      kritikInsult:       s.kritik_insult       || 0,
      otkazilganInfarkt:  s.otkazildi_infarkt   || 0,
      otkazilganInsult:   s.otkazildi_insult    || 0,
      otkazildi:         (s.otkazildi_infarkt    || 0) + (s.otkazildi_insult    || 0),
      // Infarkt klinik
      stemi:              s.stemi               || 0,
      stemiDavol:         s.stemi_davol         || 0,
      stemiVafot:         s.stemi_vafot         || 0,
      nstemi:             s.nstemi              || 0,
      nstemiDavol:        s.nstemi_davol        || 0,
      nstemiVafot:        s.nstemi_vafot        || 0,
      miokard:            s.miokard             || 0,
      miokardDavol:       s.miokard_davol       || 0,
      miokardVafot:       s.miokard_vafot       || 0,
      koronar:            s.koronar             || 0,
      koronarDavol:       s.koronar_davol       || 0,
      koronarVafot:       s.koronar_vafot       || 0,
      trombolizis:        s.trombolizis         || 0,
      trombolizisDavol:   s.trombolizis_davol   || 0,
      trombolizisVafot:   s.trombolizis_vafot   || 0,
      medikamentoz:       s.medikamentoz_inf    || 0,
      medikamentozDavol:  s.medikamentoz_inf_davol || 0,
      medikamentozVafot:  s.medikamentoz_inf_vafot || 0,
      // Insult klinik
      ishemik:                s.ishemik             || 0,
      ishemikDavol:           s.ishemik_davol       || 0,
      ishemikVafot:           s.ishemik_vafot       || 0,
      gemorragik:             s.gemorragik          || 0,
      gemorragikDavol:        s.gemorragik_davol    || 0,
      gemorragikVafot:        s.gemorragik_vafot    || 0,
      tia:                    s.tia                 || 0,
      tiaDavol:               s.tia_davol           || 0,
      tiaVafot:               s.tia_vafot           || 0,
      mskt:                   s.mskt                || 0,
      msktDavol:              s.mskt_davol          || 0,
      msktVafot:              s.mskt_vafot          || 0,
      trombektomiya:          s.trombektomiya       || 0,
      trombektomiyaDavol:     s.trombektomiya_davol || 0,
      trombektomiyaVafot:     s.trombektomiya_vafot || 0,
      insultMedikamentoz:       s.medikamentoz_ins        || 0,
      insultMedikamentozDavol:  s.medikamentoz_ins_davol  || 0,
      insultMedikamentozVafot:  s.medikamentoz_ins_vafot  || 0,
    };
  },

  // Last 30 days trend — RPC orqali (Toshkent UTC+5 da)
  async getTrend30(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const { data, error } = await getSupabase().rpc('get_trend_30', {
      p_viloyat:  viloyat || null,
      p_muassasa: overrideMuassasa || null
    });
    if (error) throw error;
    const rows = data || [];
    const labels  = rows.map(r => r.sana.slice(5));
    const infData = rows.map(r => r.infarkt_count || 0);
    const insData = rows.map(r => r.insult_count  || 0);
    return { labels, infData, insData };
  },

  // Last 12 months trend — RPC orqali
  async getTrend12Month(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const { data, error } = await getSupabase().rpc('get_trend_12month', {
      p_viloyat:  viloyat || null,
      p_muassasa: overrideMuassasa || null
    });
    if (error) throw error;
    const monthNames = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];
    const rows = data || [];
    const labels  = rows.map(r => `${monthNames[parseInt(r.oy.split('-')[1]) - 1]} ${r.oy.split('-')[0]}`);
    const infData = rows.map(r => Number(r.infarkt_count) || 0);
    const insData = rows.map(r => Number(r.insult_count)  || 0);
    return { labels, infData, insData };
  },

  // Risk factors distribution — RPC orqali
  async getRiskFactors(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const { data, error } = await getSupabase().rpc('get_risk_factors', {
      p_viloyat:  viloyat || null,
      p_muassasa: overrideMuassasa || null
    });
    if (error) throw error;
    const rows = data || [];
    const inf = rows.filter(r => r.registr === 'infarkt').map(r => [r.omil, r.cnt]);
    const ins = rows.filter(r => r.registr === 'insult').map(r => [r.omil, r.cnt]);
    return { infarkt: inf, insult: ins };
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

  // Jins bo'yicha vafot foizi — RPC orqali
  async getGenderMortality(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const { data, error } = await getSupabase().rpc('get_gender_mortality', {
      p_viloyat:  viloyat || null,
      p_muassasa: overrideMuassasa || null
    });
    if (error) throw error;
    const rows = data || [];
    const build = (registr) => {
      const r = { male: 0, female: 0, maleDeath: 0, femaleDeath: 0 };
      rows.filter(x => x.registr === registr).forEach(x => {
        if (x.jins === 'male')   { r.male   = x.jami; r.maleDeath   = x.vafot; }
        if (x.jins === 'female') { r.female = x.jami; r.femaleDeath = x.vafot; }
      });
      return r;
    };
    return { infarkt: build('infarkt'), insult: build('insult') };
  },

  // Demographics
  async getDemographics(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const { data, error } = await getSupabase().rpc('get_demographics', { p_viloyat: viloyat || null, p_muassasa: overrideMuassasa || null });
    if (error) {
      console.error('getDemographics RPC xato:', error.message);
      return {
        infarkt: { male: 0, female: 0, ages: { '≤29': 0, '30-44': 0, '45-59': 0, '60-74': 0, '75+': 0 } },
        insult:  { male: 0, female: 0, ages: { '≤29': 0, '30-44': 0, '45-59': 0, '60-74': 0, '75+': 0 } }
      };
    }
    return data;
  },

  // Age-Sex Pyramid ma'lumotlari — RPC orqali
  async getAgeSexPyramid(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const { data, error } = await getSupabase().rpc('get_age_sex_pyramid', {
      p_viloyat:  viloyat || null,
      p_muassasa: overrideMuassasa || null
    });
    const AGE_GROUPS = ['75+', '60-74', '45-59', '30-44', '≤29'];
    const emptyPyramid = () => {
      const res = {};
      AGE_GROUPS.forEach(g => { res[g] = { mTotal: 0, fTotal: 0, mDeath: 0, fDeath: 0 }; });
      return { groups: AGE_GROUPS, data: res };
    };
    if (error) {
      console.error('getAgeSexPyramid xato:', error.message);
      return { infarkt: emptyPyramid(), insult: emptyPyramid() };
    }
    const buildPyramid = (registr) => {
      const res = {};
      AGE_GROUPS.forEach(g => { res[g] = { mTotal: 0, fTotal: 0, mDeath: 0, fDeath: 0 }; });
      (data || []).filter(r => r.registr === registr).forEach(r => {
        const g = r.yosh_guruhi;
        if (!res[g]) return;
        if (r.jins === 'male')   { res[g].mTotal += r.jami; res[g].mDeath += r.vafot; }
        if (r.jins === 'female') { res[g].fTotal += r.jami; res[g].fDeath += r.vafot; }
      });
      return { groups: AGE_GROUPS, data: res };
    };
    return { infarkt: buildPyramid('infarkt'), insult: buildPyramid('insult') };
  },

  // Viloyat (yoki Muassasa) distribution — RPC orqali
  async getMuassasaStats(viloyat, dateFrom, dateTo) {
    // Viloyat tanlanganda muassasalar bo'yicha statistika
    let qi = getSupabase().from('infarkt_qabul').select('muassasa').eq('viloyat', viloyat);
    let qins = getSupabase().from('insult_qabul').select('muassasa').eq('viloyat', viloyat);
    if (dateFrom) { qi = qi.gte('qabul_vaqt', dateFrom); qins = qins.gte('qabul_vaqt', dateFrom); }
    if (dateTo)   { qi = qi.lte('qabul_vaqt', dateTo);   qins = qins.lte('qabul_vaqt', dateTo); }
    const [{ data: infData }, { data: insData }] = await Promise.all([qi.range(0,9999), qins.range(0,9999)]);
    const map = {};
    (infData||[]).forEach(r => { if (!map[r.muassasa]) map[r.muassasa] = {inf:0,ins:0}; map[r.muassasa].inf++; });
    (insData||[]).forEach(r => { if (!map[r.muassasa]) map[r.muassasa] = {inf:0,ins:0}; map[r.muassasa].ins++; });
    return Object.entries(map).map(([nom, v]) => [nom, v.inf+v.ins, v.inf, v.ins]);
  },

  async getViloyatStats(overrideViloyat, dateFrom, dateTo) {
    const p = await Profile.getCurrent();
    const userViloyat = overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat);
    const params = { p_viloyat: userViloyat || null };
    if (dateFrom) params.p_from = dateFrom;
    if (dateTo)   params.p_to   = dateTo;
    const { data, error } = await getSupabase().rpc('get_viloyat_stats', params);
    if (error) throw error;
    return (data || []).map(r => [r.nom, r.jami, r.infarkt_count, r.insult_count]);
  },

  // Detailed Registry Stats (Viloyat or Muassasa level)
  async getRegistryStats(type, viloyat = null) {
    const sb = getSupabase();
    const fn = type === 'infarkt' ? 'get_infarkt_registry_stats' : 'get_insult_registry_stats';

    const { data, error } = await sb.rpc(fn, { p_viloyat: viloyat });
    if (error) throw error;

    const stats = {};

    if (viloyat && APP_CONFIG.MUASSASALAR[viloyat]) {
      APP_CONFIG.MUASSASALAR[viloyat].forEach(m => {
        stats[m] = { name: m, jami: 0, aktiv: 0, vafot: 0, chiqarildi: 0, otkazildi: 0 };
      });
    }

    const norm = (s) => s.toLowerCase().replace(/ttb|shtb|emergency department|politravma markazi|filiali|shoshilinch tibbiy yordam/g, '').trim();

    (data || []).forEach(r => {
      let key = r.name;
      if (!key) return;
      if (viloyat && !stats[key]) {
        const nKey = norm(key);
        const match = Object.keys(stats).find(name => norm(name) === nKey || norm(name).includes(nKey) || nKey.includes(norm(name)));
        if (match) key = match;
      }
      if (!stats[key]) stats[key] = { name: key, jami: 0, aktiv: 0, vafot: 0, chiqarildi: 0, otkazildi: 0 };
      stats[key].jami += Number(r.jami);
      stats[key].aktiv += Number(r.aktiv);
      stats[key].vafot += Number(r.vafot);
      stats[key].chiqarildi += Number(r.chiqarildi);
      stats[key].otkazildi += Number(r.otkazildi);
    });

    return Object.values(stats).sort((a, b) => b.jami - a.jami || a.name.localeCompare(b.name));
  },

  async fixInstitutionNames() {
    // Muassasa nomlarini APP_CONFIG.MUASSASALAR ro'yxatiga moslash
    const sb = getSupabase();
    let updatedCount = 0;
    const clean = (s) => s.toLowerCase().replace(/ttb|shtb|emergency department|politravma markazi|filiali|shoshilinch tibbiy yordam/g, '').trim();

    for (const table of ['infarkt_qabul', 'insult_qabul']) {
      // Faqat noto'g'ri muassasa nomlari bo'lgan qatorlarni olamiz
      const { data: distinct, error } = await sb.from(table)
        .select('viloyat, muassasa')
        .not('muassasa', 'is', null)
        .order('viloyat');
      if (error) continue;

      // Unikal (viloyat, muassasa) juftlarini olib ishlash
      const seen = new Set();
      for (const rec of (distinct || [])) {
        const key = `${rec.viloyat}|${rec.muassasa}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const newList = APP_CONFIG.MUASSASALAR[rec.viloyat] || [];
        if (newList.includes(rec.muassasa)) continue;
        const cOld = clean(rec.muassasa);
        const match = newList.find(m => clean(m) === cOld || clean(m).includes(cOld) || cOld.includes(clean(m)));
        if (match && match !== rec.muassasa) {
          const { count } = await sb.from(table).update({ muassasa: match })
            .eq('viloyat', rec.viloyat).eq('muassasa', rec.muassasa)
            .select('id', { count: 'exact', head: true });
          updatedCount += count || 0;
        }
      }
    }
    return updatedCount;
  }
};

// ==================== TRANSFER LOG ====================
const TransferLog = {
  async getByKtNo(kt_no) {
    const { data, error } = await getSupabase()
      .from('transfer_log')
      .select('*')
      .eq('kt_no', kt_no)
      .order('sana', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async add(record) {
    const { error } = await getSupabase().from('transfer_log').insert(record);
    if (error) throw error;
  },

  async remove(id) {
    const { error } = await getSupabase().from('transfer_log').delete().eq('id', id);
    if (error) throw error;
  }
};

// ==================== TELEGRAM ====================
const Telegram = {

  async notify(patient, type) {
    try {
      const text = Telegram.buildMessage(patient, type);

      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, text })
      });

      const json = await res.json();

      if (res.ok && json.ok) {
        showToast('📱 Telegram xabar yuborildi!', 'success', 3000);
      } else {
        const errMsg = json.error || "Noma'lum xato";
        showToast(`⚠️ Telegram xato: ${errMsg}`, 'warning', 6000);
      }
    } catch (e) {
      showToast(`⚠️ Telegram ulanmadi: ${e.message}`, 'warning', 6000);
    }
  },

  // Test funksiyasi — brauzer konsolidan chaqirish uchun: Telegram.test('infarkt')
  async test(type = 'infarkt') {
    const text = `✅ RSHTYOIM test xabari — ${new Date().toLocaleString('uz-UZ')}`; 
    const res = await fetch('/api/telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, text })
    });
    const json = await res.json();
    if (res.ok && json.ok) {
      showToast('✅ Test xabar yuborildi!', 'success');
    } else {
      showToast(`❌ Test xato: ${json.error || ''}`, 'error', 8000);
    }
    return json;
  },

  buildMessage(patient, type) {
    // Telegram HTML da xavfli belgilarni tozalash
    const tesc = s => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';

    const tugilgan = patient.tugilgan_sana || patient.tugilgan_yil || '';
    const age = tugilgan
      ? new Date().getFullYear() - parseInt(tugilgan.toString().slice(0, 4))
      : '?';

    const qabul = patient.qabul_vaqt
      ? (() => {
          const d = new Date(patient.qabul_vaqt);
          if (isNaN(d)) return String(patient.qabul_vaqt);
          const tz = new Date(d.getTime() + 5 * 60 * 60 * 1000);
          const pad = n => String(n).padStart(2, '0');
          return `${pad(tz.getUTCDate())}.${pad(tz.getUTCMonth()+1)}.${tz.getUTCFullYear()} ${pad(tz.getUTCHours())}:${pad(tz.getUTCMinutes())}`;
        })()
      : '—';

    const e = {
      heart:   '🫀', // 🫀
      brain:   '🧠', // 🧠
      pin:     '📍', // 📍
      hosp:    '🏥', // 🏥
      doc:     '👨‍⚕️', // 👨‍⚕️
      clip:    '📋', // 📋
      man:     '👨', // 👨
      woman:   '👩', // 👩
      red:     '🔴', // 🔴
      stetho:  '🩺', // 🩺
      pill:    '💊', // 💊
      inj:     '💉', // 💉
      chart:   '📊', // 📊
      clock:   '⏰',       // ⏰
      clock2:  '🕐', // 🕐
      warn:    '⚠️', // ⚠️
      test:    '🧪', // 🧪
      line:    '━━━━━━━━━━━━━━━━━━━━━━',
      dash:    '—'
    };

    const genderIcon = patient.jins === 'Ayol' ? e.woman : e.man;
    const dash = e.dash;
    const shifokor = tesc(patient.shifokor_fio) || dash;
    const shifokorTel = patient.shifokor_tel ? ` · 📞 ${tesc(patient.shifokor_tel)}` : '';

    if (type === 'infarkt') {
      const killip = patient.killip || '';
      let kritik = '';
      if (killip.includes('III') || killip.includes('IV')) {
        kritik = `\n${e.warn} <b>DIQQAT: KRITIK HOLAT! (Killip ${killip.includes('IV') ? 'IV' : 'III'})</b>`;
      }
      const kagLine = patient.angio_natija
        ? `\n${e.test} <b>KAG natijasi:</b> ${patient.angio_natija}` : '';

      // GRACE Score — faqat NSTEMI uchun
      let graceLine = '';
      const isNSTEMI = (patient.infarkt_turi || '').toUpperCase().includes('NSTEMI');
      if (isNSTEMI && patient.grace_bali) {
        const g = parseInt(patient.grace_bali);
        let graceIcon, graceTavsiya;
        if (g > 140) {
          graceIcon    = '🔴';
          graceTavsiya = `Yuqori xavf (>3%) — KAG 24 soat ichida o'tkazilishi tavsiya etiladi`;
        } else if (g >= 109) {
          graceIcon    = '🟡';
          graceTavsiya = `O'rta xavf (1–3%) — KAG 72 soat ichida tavsiya etiladi`;
        } else {
          graceIcon    = '🟢';
          graceTavsiya = `Past xavf (<1%) — Konservativ davolash tavsiya etiladi`;
        }
        graceLine = `\n🧮${graceIcon} <b>GRACE Score: ${g} ball.</b> ${graceTavsiya}`;
      }

      return `${e.heart} <b>YANGI INFARKT BEMOR QABUL QILINDI</b>
${e.line}
${e.pin} <b>Viloyat:</b> ${tesc(patient.viloyat) || dash}
${e.hosp} <b>Muassasa:</b> ${tesc(patient.muassasa) || dash}
${e.doc} <b>Shifokor:</b> ${shifokor}${shifokorTel}
${e.clip} <b>K/T No:</b> <code>${tesc(patient.kt_no) || dash}</code>
${genderIcon} <b>Bemor:</b> ${tesc(patient.fio) || dash}, ${age} yosh, ${tesc(patient.jins) || dash}
${e.red} <b>${tesc(patient.infarkt_turi) || dash}</b>
${e.stetho} <b>Killip:</b> ${tesc(killip) || dash}${graceLine}
${e.pill} <b>Muolaja:</b> ${tesc(patient.muolaja_turi) || dash}${kagLine}
${e.chart} <b>AHA bali:</b> ${patient.aha_bali ?? dash}
${e.clock} <b>Simptom:</b> ${tesc(patient.simptom_vaqt) || dash}
${e.clock2} <b>Qabul:</b> ${qabul}
${e.line}${kritik}`;

    } else {
      const nihss = patient.nihss_qabul ?? dash;
      const gcs   = patient.gcs_bali ?? patient.gcs_qabul ?? dash;
      let kritik = '';
      if (patient.nihss_qabul != null && patient.nihss_qabul >= 15) {
        kritik = `\n${e.warn} <b>DIQQAT: OG'IR HOLAT! (NIHSS = ${patient.nihss_qabul})</b>`;
      }

      // MSKT Angiografiya va ASPECTS — faqat Ishemik insult + Angiografiya Ha uchun
      const msktDone = patient.mskt === "Ha – o'tkazildi";
      const isIshemikInsult = (patient.insult_turi || '') === 'Ishemik insult';
      let msktAngioLine = '';
      if (msktDone && isIshemikInsult && patient.mskt_angiografiya) {
        msktAngioLine = `\n🔬 <b>MSKT Angiografiya:</b> ${patient.mskt_angiografiya}`;
      }
      let aspectsLine = '';
      if (msktDone && isIshemikInsult && patient.mskt_angiografiya === 'Ha') {
        const aKeys = ['aspects_c','aspects_l','aspects_ic','aspects_i','aspects_m1','aspects_m2','aspects_m3','aspects_m4','aspects_m5','aspects_m6'];
        const aLabels = { aspects_c:'C', aspects_l:'L', aspects_ic:'IC', aspects_i:'I', aspects_m1:'M1', aspects_m2:'M2', aspects_m3:'M3', aspects_m4:'M4', aspects_m5:'M5', aspects_m6:'M6' };
        const damaged = aKeys.filter(k => patient[k]);
        const ball = (patient.aspects_ball != null) ? patient.aspects_ball : (10 - damaged.length);
        const sign = ball >= 6 ? '(≥6)' : '(<6 ⚠️)';
        const hududlar = damaged.length ? ` — ${damaged.map(k=>aLabels[k]).join(', ')}` : '';
        aspectsLine = `\n🧮 <b>ASPECTS:</b> ${ball} ball ${sign}${hududlar}`;
      }

      return `${e.brain} <b>YANGI INSULT BEMOR QABUL QILINDI</b>
${e.line}
${e.pin} <b>Viloyat:</b> ${tesc(patient.viloyat) || dash}
${e.hosp} <b>Muassasa:</b> ${tesc(patient.muassasa) || dash}
${e.doc} <b>Shifokor:</b> ${shifokor}${shifokorTel}
${e.clip} <b>K/T №:</b> <code>${tesc(patient.kt_no) || dash}</code>
${genderIcon} <b>Bemor:</b> ${tesc(patient.fio) || dash}, ${age} yosh, ${tesc(patient.jins) || dash}
${e.stetho} <b>Insult turi:</b> ${tesc(patient.insult_turi) || dash}
${e.chart} <b>NIHSS/GCS:</b> ${nihss} / ${gcs}
${e.clip} <b>AHA:</b> ${patient.aha_bali ?? dash}${msktAngioLine}${aspectsLine}
${e.clock} <b>Simptom:</b> ${tesc(patient.simptom_vaqt) || dash}
${e.inj} <b>Muolaja:</b> ${tesc(patient.muolaja_turi) || dash}
${e.clock2} <b>Qabul:</b> ${qabul}
${e.line}${kritik}`;
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
        } else if (status === 'CHANNEL_ERROR') {
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
    const sb = getSupabase();
    let all = [], from = 0;
    while (true) {
      const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false }).range(from, from + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < 1000) break;
      from += 1000;
    }
    return all;
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
    const cols = 'kt_no,fio,tugilgan_yil,viloyat,muassasa,qabul_vaqt,status,otkazilgan_muassasa';
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
  },

  // Bir xil F.I.O + tug'ilgan yili + qabul sanasi (kun) bilan, bir xil muassasadagi yozuvlarni topadi
  findDuplicates(records) {
    const dupKey = (r) => {
      const fio = Utils.normalizeFio(r.fio || '').toLowerCase();
      const yil = r.tugilgan_yil || '';
      const sana = r.qabul_vaqt ? new Date(r.qabul_vaqt).toISOString().slice(0, 10) : '';
      const muassasa = (r.muassasa || '').trim().toLowerCase();
      if (!fio || !sana || !muassasa) return null;
      return `${r._type}|${fio}|${yil}|${sana}|${muassasa}`;
    };
    const groups = {};
    for (const r of records) {
      const key = dupKey(r);
      if (!key) continue;
      (groups[key] = groups[key] || []).push(r);
    }
    return Object.values(groups).filter(g => g.length > 1);
  },

  // Barcha vaqt: FIO+tug'ilgan yil bo'yicha guruhlaydi, har guruhni duplicate/qayta_murojaat deb belgilaydi
  findAllDuplicates(records) {
    const normKey = (r) => {
      const fio = Utils.normalizeFio(r.fio || '').toLowerCase().replace(/\s+/g, ' ').trim();
      const yil = String(r.tugilgan_yil || '').slice(0, 4);
      if (!fio || fio.length < 3 || !yil) return null;
      return `${fio}|${yil}`;
    };
    const groups = {};
    for (const r of records) {
      const key = normKey(r);
      if (!key) continue;
      (groups[key] = groups[key] || []).push(r);
    }
    return Object.values(groups)
      .filter(g => g.length > 1)
      .map(g => {
        const hasDup = g.some((a, i) =>
          g.slice(i + 1).some(b => {
            const sanaA = (a.qabul_vaqt || '').slice(0, 10);
            const sanaB = (b.qabul_vaqt || '').slice(0, 10);
            const mA = (a.muassasa || '').trim().toLowerCase();
            const mB = (b.muassasa || '').trim().toLowerCase();
            return sanaA && sanaB && sanaA === sanaB && mA === mB;
          })
        );
        return { records: g, type: hasDup ? 'duplicate' : 'qayta_murojaat' };
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'duplicate' ? -1 : 1;
        return b.records.length - a.records.length;
      });
  }
};


