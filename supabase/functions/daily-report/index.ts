// @ts-nocheck
// Supabase Edge Function: daily-report
// Har kuni 07:30 Toshkent vaqtida (02:30 UTC) ishga tushadi
// Telegram ga infarkt va insult bo'yicha alohida sutkalik hisobot yuboradi

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TG_INFARKT_TOKEN      = Deno.env.get('TG_INFARKT_TOKEN')!;
const TG_INFARKT_CHAT       = Deno.env.get('TG_INFARKT_CHAT')!;
const TG_INSULT_TOKEN       = Deno.env.get('TG_INSULT_TOKEN')!;
const TG_INSULT_CHAT        = Deno.env.get('TG_INSULT_CHAT')!;

// ── Telegram xabar yuborish ──────────────────────────────────
async function sendTelegram(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });
  const json = await res.json();
  if (!json.ok) console.error('Telegram xato:', json.description);
  return json;
}

// ── Sana formatlash (Toshkent UTC+5) ────────────────────────
function formatDate(d: Date): string {
  const local = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = local.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

// ── Muolajalar hisobi ────────────────────────────────────────
function countByField(rows: any[], field: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const val = r[field] || 'Noma\'lum';
    map[val] = (map[val] || 0) + 1;
  }
  return map;
}

function topItems(map: Record<string, number>, max = 8): string {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k, v]) => `  • ${k}: <b>${v}</b> ta`)
    .join('\n');
}

// ── Viloyatlar kesimida qabul hisobi ────────────────────────
function viloyatBlock(rows: any[]): string {
  const map: Record<string, number> = {};
  for (const r of rows) {
    const v = r.viloyat || 'Noma\'lum';
    map[v] = (map[v] || 0) + 1;
  }
  const lines = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([v, n]) => `  • ${v}: <b>${n}</b> ta`)
    .join('\n');
  return lines || '  • Ma\'lumot yo\'q';
}

// ── Umumiy bloklar (ikkalasida bir xil) ──────────────────────
function statusBlock(jami: number, chiqarildi: number, otkazildi: number, vafot: number, aktiv: number): string {
  return `👥 <b>Jami yangi qabul:</b> ${jami} ta
🟢 Davolanib chiqarildi: <b>${chiqarildi}</b> ta
🔄 Boshqa muassasaga o'tkazildi: <b>${otkazildi}</b> ta
⚫ Vafot etdi: <b>${vafot}</b> ta
🏥 Xozir shifoxonada: <b>${aktiv}</b> ta`;
}

// ── INFARKT HISOBOT ──────────────────────────────────────────
function buildInfarktReport(rows: any[], fromDate: Date, toDate: Date): string {
  const jami       = rows.length;
  const aktiv      = rows.filter(r => r.status === 'active').length;
  const chiqarildi = rows.filter(r => r.status === 'chiqarildi').length;
  const otkazildi  = rows.filter(r => r.status === 'otkazildi').length;
  const vafot      = rows.filter(r => r.status === 'vafot').length;
  const stemi      = rows.filter(r => r.infarkt_turi === "O'KS ST elevatsiya bilan (STEMI)").length;
  const nstemi     = rows.filter(r => r.infarkt_turi === "O'KS ST elevatsiyasiz (NSTEMI)").length;
  const ami        = rows.filter(r => r.infarkt_turi === "O'tkir miokard infarkti (AMI)").length;
  const muolajaMap = countByField(rows, 'muolaja_turi');
  const davr       = `${formatDate(fromDate)} 07:00 — ${formatDate(toDate)} 07:00`;

  if (jami === 0) return `🫀 <b>INFARKT SUTKALIK HISOBOT</b>
━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Davr:</b> ${davr}
━━━━━━━━━━━━━━━━━━━━━━
📭 Bu davrda infarkt bilan bemor qabul qilinmagan.
━━━━━━━━━━━━━━━━━━━━━━`;

  return `🫀 <b>INFARKT SUTKALIK HISOBOT</b>
━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Davr:</b> ${davr}
━━━━━━━━━━━━━━━━━━━━━━
${statusBlock(jami, chiqarildi, otkazildi, vafot, aktiv)}
━━━━━━━━━━━━━━━━━━━━━━
📊 <b>Tashxis turi:</b>
  • O'KS ST elevatsiya bilan (STEMI): <b>${stemi}</b> ta
  • O'KS ST elevatsiyasiz (NSTEMI): <b>${nstemi}</b> ta
  • O'tkir miokard infarkti (AMI): <b>${ami}</b> ta
━━━━━━━━━━━━━━━━━━━━━━
🗺 <b>Viloyatlar kesimida:</b>
${viloyatBlock(rows)}
━━━━━━━━━━━━━━━━━━━━━━
💊 <b>Davolash turlari:</b>
${topItems(muolajaMap)}
━━━━━━━━━━━━━━━━━━━━━━`;
}

// ── INSULT HISOBOT ───────────────────────────────────────────
function buildInsultReport(rows: any[], fromDate: Date, toDate: Date): string {
  const jami       = rows.length;
  const aktiv      = rows.filter(r => r.status === 'active').length;
  const chiqarildi = rows.filter(r => r.status === 'chiqarildi').length;
  const otkazildi  = rows.filter(r => r.status === 'otkazildi').length;
  const vafot      = rows.filter(r => r.status === 'vafot').length;
  const ishemik    = rows.filter(r => r.insult_turi === 'Ishemik insult').length;
  const gemorragik = rows.filter(r => r.insult_turi === 'Gemorragik insult').length;
  const tia        = rows.filter(r => r.insult_turi === 'TIA (Tranzitor ishemik ataka)').length;
  const muolajaMap = countByField(rows, 'muolaja_turi');
  const davr       = `${formatDate(fromDate)} 07:00 — ${formatDate(toDate)} 07:00`;

  if (jami === 0) return `🧠 <b>INSULT SUTKALIK HISOBOT</b>
━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Davr:</b> ${davr}
━━━━━━━━━━━━━━━━━━━━━━
📭 Bu davrda insult bilan bemor qabul qilinmagan.
━━━━━━━━━━━━━━━━━━━━━━`;

  return `🧠 <b>INSULT SUTKALIK HISOBOT</b>
━━━━━━━━━━━━━━━━━━━━━━
📅 <b>Davr:</b> ${davr}
━━━━━━━━━━━━━━━━━━━━━━
${statusBlock(jami, chiqarildi, otkazildi, vafot, aktiv)}
━━━━━━━━━━━━━━━━━━━━━━
📊 <b>Tashxis turi:</b>
  • Ishemik insult: <b>${ishemik}</b> ta
  • Gemorragik insult: <b>${gemorragik}</b> ta
  • TIA (Tranzitor ishemik ataka): <b>${tia}</b> ta
━━━━━━━━━━━━━━━━━━━━━━
🗺 <b>Viloyatlar kesimida:</b>
${viloyatBlock(rows)}
━━━━━━━━━━━━━━━━━━━━━━
💊 <b>Davolash turlari:</b>
${topItems(muolajaMap)}
━━━━━━━━━━━━━━━━━━━━━━`;
}

// ── Asosiy handler ───────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Davr: kecha 07:00 → bugun 07:00 (Toshkent UTC+5 = UTC+2da 02:00)
    const now = new Date();
    const toDate = new Date(now);
    toDate.setUTCHours(2, 0, 0, 0); // bugun 07:00 Toshkent
    if (now.getUTCHours() < 2) {
      // Agar trigger 02:30 UTC da kelsa va hali 02:00 dan oldin bo'lsa
      toDate.setDate(toDate.getDate());
    }
    const fromDate = new Date(toDate);
    fromDate.setDate(fromDate.getDate() - 1); // kecha 07:00 Toshkent

    const from = fromDate.toISOString();
    const to   = toDate.toISOString();

    console.log(`Hisobot davri: ${from} → ${to}`);

    // Parallel so'rovlar
    const [{ data: infs }, { data: ins }] = await Promise.all([
      sb.from('infarkt_qabul').select('status,infarkt_turi,muolaja_turi,viloyat')
        .gte('qabul_vaqt', from).lte('qabul_vaqt', to),
      sb.from('insult_qabul').select('status,insult_turi,muolaja_turi,viloyat')
        .gte('qabul_vaqt', from).lte('qabul_vaqt', to),
    ]);

    const infarktMsg = buildInfarktReport(infs || [], fromDate, toDate);
    const insultMsg  = buildInsultReport(ins  || [], fromDate, toDate);

    // Har ikki kanalga yuborish
    await Promise.all([
      sendTelegram(TG_INFARKT_TOKEN, TG_INFARKT_CHAT, infarktMsg),
      sendTelegram(TG_INSULT_TOKEN,  TG_INSULT_CHAT,  insultMsg),
    ]);

    return new Response(JSON.stringify({ ok: true, infarkt: infs?.length, insult: ins?.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
  }
});
