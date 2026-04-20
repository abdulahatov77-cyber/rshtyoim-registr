// supabase/functions/telegram-notify/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

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
📍 <b>Viloyat:</b> ${patient.viloyat || '—'}
🏥 <b>Muassasa:</b> ${patient.muassasa || '—'}
📋 <b>K/T No:</b> <code>${patient.kt_no || '—'}</code>
👤 <b>Bemor:</b> ${patient.fio || '—'}, ${age} yosh, ${patient.jins || '—'}
${type === 'infarkt' ? `🔴 <b>${patient.infarkt_turi || '—'}</b>
🩺 <b>Killip:</b> ${patient.killip || '—'}` : `🔵 <b>${patient.insult_turi || '—'}</b>
📊 <b>NIHSS:</b> ${patient.nihss_qabul ?? '—'} | <b>GCS:</b> ${patient.gcs_qabul ?? '—'}`}
💊 <b>Muolaja:</b> ${patient.muolaja_turi || '—'}
⏰ <b>Simptom:</b> ${patient.simptom_vaqt || '—'}
🕐 <b>Qabul:</b> ${qabul}
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
