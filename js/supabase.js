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

    // Barcha statistikani bitta RPC chaqiruvida olamiz (14 ta alohida so'rov o'rniga)
    const { data: rpcData, error: rpcErr } = await getSupabase().rpc('get_dashboard_stats', {
      p_viloyat:   viloyat || null,
      p_muassasa:  overrideMuassasa || null,
      p_today_start: todayISO,
      p_today_end:   todayEndISO
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
    const { data, error } = await getSupabase().rpc('get_demographics', { p_viloyat: viloyat, p_muassasa: overrideMuassasa || null });
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

  // _getAgeSexPyramid_OLD — eskirgan, faqat zaxira sifatida saqlanadi
  async _getAgeSexPyramid_OLD(overrideViloyat, overrideMuassasa) {
    const p = await Profile.getCurrent();
    const viloyat = overrideMuassasa ? null : (overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat));
    const sb = getSupabase();
    const eqV = (q) => overrideMuassasa ? q.eq('muassasa', overrideMuassasa) : (viloyat ? q.eq('viloyat', viloyat) : q);
    const AGE_GROUPS = ['75+', '60-74', '45-59', '30-44', '≤29'];
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
      if (age <= 29) return '≤29';
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

  // Viloyat (yoki Muassasa) distribution — RPC orqali
  async getViloyatStats(overrideViloyat) {
    const p = await Profile.getCurrent();
    const userViloyat = overrideViloyat !== undefined ? overrideViloyat : (p?.role === 'super_admin' ? null : p?.viloyat);
    const { data, error } = await getSupabase().rpc('get_viloyat_stats', {
      p_viloyat: userViloyat || null
    });
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
      } else {
        const errMsg = json.description || 'Noma\'lum xato';
        showToast(`вљ пёЏ Telegram xato: ${errMsg}`, 'warning', 6000);
      }
    } catch (e) {
      showToast(`вљ пёЏ Telegram ulanmadi: ${e.message}`, 'warning', 6000);
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
    const shifokor = patient.shifokor_fio || dash;

    if (type === 'infarkt') {
      const killip = patient.killip || '';
      let kritik = '';
      if (killip.includes('III') || killip.includes('IV')) {
        kritik = `\n${e.warn} <b>DIQQAT: KRITIK HOLAT! (Killip ${killip.includes('IV') ? 'IV' : 'III'})</b>`;
      }
      const kagLine = patient.angio_natija
        ? `\n${e.test} <b>KAG natijasi:</b> ${patient.angio_natija}` : '';

      return `${e.heart} <b>YANGI INFARKT BEMOR QABUL QILINDI</b>
${e.line}
${e.pin} <b>Viloyat:</b> ${patient.viloyat || dash}
${e.hosp} <b>Muassasa:</b> ${patient.muassasa || dash}
${e.doc} <b>Shifokor:</b> ${shifokor}
${e.clip} <b>K/T No:</b> <code>${patient.kt_no || dash}</code>
${genderIcon} <b>Bemor:</b> ${patient.fio || dash}, ${age} yosh, ${patient.jins || dash}
${e.red} <b>${patient.infarkt_turi || dash}</b>
${e.stetho} <b>Killip:</b> ${killip || dash}
${e.pill} <b>Muolaja:</b> ${patient.muolaja_turi || dash}${kagLine}
${e.chart} <b>AHA bali:</b> ${patient.aha_bali ?? dash}
${e.clock} <b>Simptom:</b> ${patient.simptom_vaqt || dash}
${e.clock2} <b>Qabul:</b> ${qabul}
${e.line}${kritik}`;

    } else {
      const nihss = patient.nihss_qabul ?? dash;
      const gcs   = patient.gcs_bali ?? patient.gcs_qabul ?? dash;
      let kritik = '';
      if (patient.nihss_qabul != null && patient.nihss_qabul >= 15) {
        kritik = `\n${e.warn} <b>DIQQAT: OG'IR HOLAT! (NIHSS = ${patient.nihss_qabul})</b>`;
      }

      return `${e.brain} <b>YANGI INSULT BEMOR QABUL QILINDI</b>
${e.line}
${e.pin} <b>Viloyat:</b> ${patient.viloyat || dash}
${e.hosp} <b>Muassasa:</b> ${patient.muassasa || dash}
${e.doc} <b>Shifokor:</b> ${shifokor}
${e.clip} <b>K/T №:</b> <code>${patient.kt_no || dash}</code>
${genderIcon} <b>Bemor:</b> ${patient.fio || dash}, ${age} yosh, ${patient.jins || dash}
${e.stetho} <b>Insult turi:</b> ${patient.insult_turi || dash}
${e.chart} <b>NIHSS/GCS:</b> ${nihss} / ${gcs}
${e.clip} <b>AHA:</b> ${patient.aha_bali ?? dash}
${e.clock} <b>Simptom:</b> ${patient.simptom_vaqt || dash}
${e.inj} <b>Muolaja:</b> ${patient.muolaja_turi || dash}
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


