const crypto = require('crypto');

// Vercel Serverless Function — Telegram xabarlarini server tarafidan jo'natadi
// Bot token brauzerga chiqmaydi, faqat Vercel Environment Variables da saqlanadi

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

module.exports = async function handler(req, res) {
  // CORS — faqat o'z domenimizdan
  const origin = req.headers.origin || '';
  const allowed = [
    'https://rshtyoim-registr.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  ];
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Server-Key');
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    if (origin && !allowed.includes(origin)) return res.status(403).end();
    return res.status(200).end();
  }

  // Faqat POST so'rovlarni qabul qil
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (origin && !allowed.includes(origin)) {
    return res.status(403).json({ error: 'Origin ruxsat etilmagan' });
  }

  // AUTH 1: server-to-server (Supabase trigger) — maxfiy kalit orqali
  // Kalit faqat Vercel env (TELEGRAM_SERVER_KEY) va Supabase trigger funksiyasida saqlanadi
  const serverKey = req.headers['x-server-key'] || '';
  const isServerCall = !!process.env.TELEGRAM_SERVER_KEY && safeEqual(serverKey, process.env.TELEGRAM_SERVER_KEY);

  // AUTH 2: faqat tizimga kirgan foydalanuvchi yubora oladi
  // Klient Authorization: Bearer <access_token> yuboradi, server Supabase orqali tekshiradi
  if (!isServerCall) try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      return res.status(401).json({ error: 'Avtorizatsiya talab qilinadi' });
    }
    const SUPA_URL = process.env.SUPABASE_URL || 'https://udayvbywwnulbxrvxknm.supabase.co';
    // Anon key — env bo'lmasa config'дagi ochiq anon key (bu maxfiy emas)
    const SUPA_ANON = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkYXl2Ynl3d251bGJ4cnZ4a25tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Njk0NTYsImV4cCI6MjA5MjI0NTQ1Nn0.9lgD_V2H2TRKgdtPD0BO1jmE71st45JsOtlCIhmtP8U';
    const authHeaders = { 'Authorization': `Bearer ${token}`, 'apikey': SUPA_ANON };
    const uRes = await fetch(`${SUPA_URL}/auth/v1/user`, {
      headers: authHeaders
    });
    if (!uRes.ok) {
      return res.status(401).json({ error: 'Sessiya yaroqsiz — qayta kiring' });
    }
    const authUser = await uRes.json();
    const pRes = await fetch(
      `${SUPA_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(authUser.id)}&select=role`,
      { headers: authHeaders }
    );
    if (!pRes.ok) {
      return res.status(403).json({ error: 'Profil ruxsati tekshirilmadi' });
    }
    const profiles = await pRes.json();
    const role = profiles?.[0]?.role;
    if (!['admin', 'rahbar', 'super_admin'].includes(role)) {
      return res.status(403).json({ error: 'Telegram yuborish uchun ruxsat yetarli emas' });
    }
  } catch (e) {
    return res.status(401).json({ error: 'Avtorizatsiya xatosi' });
  }

  try {
    const { type, text, parseMode } = req.body || {};

    if (!type || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'type va text talab qilinadi' });
    }
    if (text.length > 4096) {
      return res.status(413).json({ error: 'Telegram xabari 4096 belgidan oshmasligi kerak' });
    }

    // Token va chat_id — Vercel Environment Variables dan
    let token, chatId;
    if (type === 'infarkt') {
      token  = process.env.TELEGRAM_INFARKT_TOKEN;
      chatId = process.env.TELEGRAM_INFARKT_CHAT;
    } else if (type === 'insult') {
      token  = process.env.TELEGRAM_INSULT_TOKEN;
      chatId = process.env.TELEGRAM_INSULT_CHAT;
    } else {
      return res.status(400).json({ error: "type 'infarkt' yoki 'insult' bo'lishi kerak" });
    }

    if (!token || !chatId) {
      console.error('Telegram env vars missing for type:', type);
      return res.status(500).json({ error: 'Telegram konfiguratsiyasi sozlanmagan' });
    }

    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: parseInt(chatId),
          text,
          // parseMode: null yuborilsa HTML parse qilinmaydi (oddiy matn)
          ...(parseMode === null ? {} : { parse_mode: parseMode || 'HTML' })
        })
      }
    );

    const data = await tgRes.json();

    if (!tgRes.ok || !data.ok) {
      console.error('Telegram API error:', data);
      return res.status(502).json({ error: 'Telegram API xatosi' });
    }

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Telegram handler error:', err);
    return res.status(500).json({ error: err.message });
  }
};
