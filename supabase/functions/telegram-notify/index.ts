// supabase/functions/telegram-notify/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

// Telegram HTML rejimi uchun maxsus belgilarni escape qilish
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

serve(async (req) => {
  try {
    const { patient, type } = await req.json();
    if (!BOT_TOKEN || !CHAT_ID) throw new Error('Telegram credentials missing');

    const emoji = type === 'infarkt' ? '🫀' : '🧠';
    const age = patient.tugilgan_yil
      ? new Date().getFullYear() - parseInt(patient.tugilgan_yil.toString().slice(0,4))
      : '?';

    let kritik = '';
    if (type === 'infarkt') {
      if (patient.killip?.includes('III') || patient.killip?.includes('IV'))
        kritik = '\n⚠️ <b>DIQQAT: KRITIK HOLAT!</b>';
    } else {
      if (patient.nihss_qabul >= 15)
        kritik = '\n⚠️ <b>DIQQAT: OG\'IR HOLAT! (NIHSS ≥ 15)</b>';
    }

    const qabul = patient.qabul_vaqt
      ? new Date(patient.qabul_vaqt).toLocaleString('uz-UZ')
      : '—';

    const text = `${emoji} <b>YANGI BEMOR QABUL QILINDI</b>
━━━━━━━━━━━━━━━━━━━━━━
📍 <b>Viloyat:</b> ${esc(patient.viloyat) || '—'}
🏥 <b>Muassasa:</b> ${esc(patient.muassasa) || '—'}
📋 <b>K/T No:</b> <code>${esc(patient.kt_no) || '—'}</code>
👤 <b>Bemor:</b> ${esc(patient.fio) || '—'}, ${age} yosh, ${esc(patient.jins) || '—'}
${type === 'infarkt' ? `🔴 <b>${esc(patient.infarkt_turi) || '—'}</b>
🩺 <b>Killip:</b> ${esc(patient.killip) || '—'}` : `🔵 <b>${esc(patient.insult_turi) || '—'}</b>
📊 <b>NIHSS:</b> ${esc(patient.nihss_qabul ?? '—')} | <b>GCS:</b> ${esc(patient.gcs_qabul ?? '—')}`}
💊 <b>Muolaja:</b> ${esc(patient.muolaja_turi) || '—'}
⏰ <b>Simptom:</b> ${esc(patient.simptom_vaqt) || '—'}
🕐 <b>Qabul:</b> ${esc(qabul)}
━━━━━━━━━━━━━━━━━━━━━━${kritik}`;

    const response = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Telegram API error: ${err}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
