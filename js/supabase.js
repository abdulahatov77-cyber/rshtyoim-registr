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
  }
};

// ==================== DATABASE ====================
const DB = {
  // Infarkt CRUD
  async infarktQabul(data) {
    const user = await Auth.getUser();
    const { data: result, error } = await getSupabase()
      .from('infarkt_qabul')
      .insert({ ...data, user_id: user?.id })
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async infarktList(filters = {}) {
    let q = getSupabase().from('infarkt_qabul').select('*').order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.viloyat) q = q.eq('viloyat', filters.viloyat);
    if (filters.from) q = q.gte('qabul_vaqt', filters.from);
    if (filters.to) q = q.lte('qabul_vaqt', filters.to);
    if (filters.search) q = q.or(`fio.ilike.%${filters.search}%,kt_no.ilike.%${filters.search}%`);
    if (filters.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
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
    const { data: result, error } = await getSupabase()
      .from('insult_qabul')
      .insert({ ...data, user_id: user?.id })
      .select()
      .single();
    if (error) throw error;
    return result;
  },

  async insultList(filters = {}) {
    let q = getSupabase().from('insult_qabul').select('*').order('created_at', { ascending: false });
    if (filters.status) q = q.eq('status', filters.status);
    if (filters.viloyat) q = q.eq('viloyat', filters.viloyat);
    if (filters.from) q = q.gte('qabul_vaqt', filters.from);
    if (filters.to) q = q.lte('qabul_vaqt', filters.to);
    if (filters.search) q = q.or(`fio.ilike.%${filters.search}%,kt_no.ilike.%${filters.search}%`);
    if (filters.limit) q = q.limit(filters.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
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

  // Dashboard stats
  async getDashboardStats() {
    const p = await Profile.getCurrent();
    const viloyat = p?.role === 'admin' ? null : p?.viloyat;
    const eqViloyat = (q) => viloyat ? q.eq('viloyat', viloyat) : q;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      { count: infAll },
      { count: insAll },
      { count: infAktiv },
      { count: insAktiv },
      { count: infVafot },
      { count: insVafot },
      { count: infarktBugun },
      { count: insultBugun },
      { count: kritikInfarkt },
      { count: kritikInsult }
    ] = await Promise.all([
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true })),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true })),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'vafot')),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'vafot')),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).gte('qabul_vaqt', todayISO)),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).gte('qabul_vaqt', todayISO)),
      eqViloyat(getSupabase().from('infarkt_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')).in('killip', ['Killip III — o\'pka shishi', 'Killip IV — kardiogen shok']),
      eqViloyat(getSupabase().from('insult_qabul').select('id', { count: 'exact', head: true }).eq('status', 'active')).gte('nihss_qabul', 15)
    ]);

    return {
      jamiInfarkt: infAll || 0,
      jamiInsult: insAll || 0,
      jami: (infAll || 0) + (insAll || 0),
      infarktAktiv: infAktiv || 0,
      insultAktiv: insAktiv || 0,
      vafot: (infVafot || 0) + (insVafot || 0),
      infarktBugun: infarktBugun || 0,
      insultBugun: insultBugun || 0,
      kritikInfarkt: kritikInfarkt || 0,
      kritikInsult: kritikInsult || 0
    };
  },

  // Last 30 days trend
  async getTrend30() {
    const p = await Profile.getCurrent();
    const viloyat = p?.role === 'admin' ? null : p?.viloyat;
    const eqViloyat = (q) => viloyat ? q.eq('viloyat', viloyat) : q;
    const from = new Date();
    from.setDate(from.getDate() - 29);
    from.setHours(0, 0, 0, 0);

    const [{ data: inf }, { data: ins }] = await Promise.all([
      eqViloyat(getSupabase().from('infarkt_qabul').select('qabul_vaqt').gte('qabul_vaqt', from.toISOString())),
      eqViloyat(getSupabase().from('insult_qabul').select('qabul_vaqt').gte('qabul_vaqt', from.toISOString()))
    ]);

    const labels = [], infData = [], insData = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const ds = d.toISOString().split('T')[0];
      labels.push(ds.slice(5));
      infData.push((inf || []).filter(r => r.qabul_vaqt?.startsWith(ds)).length);
      insData.push((ins || []).filter(r => r.qabul_vaqt?.startsWith(ds)).length);
    }
    return { labels, infData, insData };
  },

  // Recent patients
  async getRecentPatients(limit = 10) {
    const p = await Profile.getCurrent();
    const viloyat = p?.role === 'admin' ? null : p?.viloyat;
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

  // Viloyat distribution
  async getViloyatStats() {
    const p = await Profile.getCurrent();
    const viloyat = p?.role === 'admin' ? null : p?.viloyat;
    const eqViloyat = (q) => viloyat ? q.eq('viloyat', viloyat) : q;
    const [{ data: inf }, { data: ins }] = await Promise.all([
      eqViloyat(getSupabase().from('infarkt_qabul').select('viloyat').eq('status', 'active')),
      eqViloyat(getSupabase().from('insult_qabul').select('viloyat').eq('status', 'active'))
    ]);
    const map = {};
    [...(inf || []), ...(ins || [])].forEach(r => {
      map[r.viloyat] = (map[r.viloyat] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10);
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
    const age = patient.tugilgan_yil
      ? new Date().getFullYear() - parseInt(patient.tugilgan_yil.toString().slice(0, 4))
      : '?';

    const qabul = patient.qabul_vaqt
      ? new Date(patient.qabul_vaqt).toLocaleString('uz-UZ', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '—';

    let kritik = '';

    if (type === 'infarkt') {
      const killip = patient.killip || '';
      if (killip.includes('III') || killip.includes('IV')) {
        kritik = '\n⚠️ <b>DIQQAT: KRITIK HOLAT! (Killip ' +
          (killip.includes('IV') ? 'IV' : 'III') + ')</b>';
      }

      return `🫀 <b>YANGI INFARKT BEMORI QABUL QILINDI</b>
━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Viloyat:</b> ${patient.viloyat || '—'}
🏥 <b>Muassasa:</b> ${patient.muassasa || '—'}
📋 <b>K/T No:</b> <code>${patient.kt_no || '—'}</code>
👤 <b>Bemor:</b> ${patient.fio || '—'}, ${age} yosh, ${patient.jins || '—'}
🔴 <b>${patient.infarkt_turi || '—'}</b>
🩺 <b>Killip:</b> ${patient.killip || '—'}
💊 <b>Muolaja:</b> ${patient.muolaja_turi || '—'}
⏰ <b>Simptom:</b> ${patient.simptom_vaqt || '—'}
🕐 <b>Qabul:</b> ${qabul}
━━━━━━━━━━━━━━━━━━━━━━${kritik}`;

    } else {
      const nihss = patient.nihss_qabul;
      if (nihss != null && nihss >= 15) {
        kritik = `\n⚠️ <b>DIQQAT: OG'IR HOLAT! (NIHSS = ${nihss})</b>`;
      }

      return `🧠 <b>YANGI INSULT BEMORI QABUL QILINDI</b>
━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Viloyat:</b> ${patient.viloyat || '—'}
🏥 <b>Muassasa:</b> ${patient.muassasa || '—'}
📋 <b>K/T No:</b> <code>${patient.kt_no || '—'}</code>
👤 <b>Bemor:</b> ${patient.fio || '—'}, ${age} yosh, ${patient.jins || '—'}
🔵 <b>${patient.insult_turi || '—'}</b>
📊 <b>NIHSS:</b> ${nihss ?? '—'} | <b>GCS:</b> ${patient.gcs_qabul ?? '—'}
💊 <b>Muolaja:</b> ${patient.muolaja_turi || '—'}
⏰ <b>Simptom:</b> ${patient.simptom_vaqt || '—'}
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
  async isAdmin() {
    const p = await this.getCurrent();
    return p?.role === 'admin';
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
    const { error } = await getSupabase().from('profiles').delete().eq('id', userId);
    if (error) throw error;
    delete this._cache[userId];
  }
};
