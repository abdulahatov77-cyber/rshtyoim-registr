-- ============================================================
-- SERVER TOMONDAN TELEGRAM XABAR (2026-07-21)
-- Bemor infarkt_qabul / insult_qabul jadvaliga INSERT bo'lishi
-- bilan Postgres trigger Vercel /api/telegram ga so'rov yuboradi.
-- Operator brauzerining versiyasiga umuman bog'liq emas.
--
-- ISHGA TUSHIRISH: Supabase Dashboard -> SQL Editor
-- MUHIM: pastdagi SERVER_KEY qiymati Vercel'dagi
--        TELEGRAM_SERVER_KEY env o'zgaruvchisi bilan BIR XIL bo'lsin.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- HTML escape (Telegram parse_mode=HTML uchun)
CREATE OR REPLACE FUNCTION tg_esc(s text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(coalesce(s, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

CREATE OR REPLACE FUNCTION notify_telegram_new_patient() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE
  SERVER_KEY constant text := 'SIZNING_MAXFIY_KALIT';  -- <<< ALMASHTIRING
  API_URL    constant text := 'https://rshtyoim-registr.vercel.app/api/telegram';
  j        jsonb := to_jsonb(NEW);
  p_type   text  := CASE WHEN TG_TABLE_NAME = 'infarkt_qabul' THEN 'infarkt' ELSE 'insult' END;
  emoji    text  := CASE WHEN TG_TABLE_NAME = 'infarkt_qabul' THEN '🫀' ELSE '🧠' END;
  line     constant text := '━━━━━━━━━━━━━━━━━━━━━━';
  nl       constant text := chr(10);
  tug      text := coalesce(j->>'tugilgan_sana', j->>'tugilgan_yil', '');
  age      text := '?';
  qabul    text := '—';
  kritik   text := '';
  detail   text;
  shifokor text;
  msg      text;
BEGIN
  -- Yosh
  IF left(tug, 4) ~ '^\d{4}$' THEN
    age := (date_part('year', now() AT TIME ZONE 'Asia/Tashkent')::int - left(tug, 4)::int)::text;
  END IF;

  -- Qabul vaqti (Toshkent)
  IF j->>'qabul_vaqt' IS NOT NULL THEN
    qabul := to_char((j->>'qabul_vaqt')::timestamptz AT TIME ZONE 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI');
  END IF;

  IF p_type = 'infarkt' THEN
    detail := '🔴 <b>' || tg_esc(coalesce(nullif(j->>'infarkt_turi', ''), '—')) || '</b>' || nl
           || '🩺 <b>Killip:</b> ' || tg_esc(coalesce(nullif(j->>'killip', ''), '—'));
    IF coalesce(j->>'killip', '') LIKE '%III%' OR coalesce(j->>'killip', '') LIKE '%IV%' THEN
      kritik := nl || '⚠️ <b>DIQQAT: KRITIK HOLAT!</b>';
    END IF;
    IF nullif(j->>'angio_natija', '') IS NOT NULL THEN
      detail := detail || nl || '🧪 <b>KAG natijasi:</b> ' || tg_esc(j->>'angio_natija');
    END IF;
  ELSE
    detail := '🔵 <b>' || tg_esc(coalesce(nullif(j->>'insult_turi', ''), '—')) || '</b>' || nl
           || '📊 <b>NIHSS:</b> ' || coalesce(j->>'nihss_qabul', '—')
           || ' | <b>GCS:</b> ' || coalesce(j->>'gcs_qabul', '—');
    IF (j->>'nihss_qabul') ~ '^\d+$' AND (j->>'nihss_qabul')::int >= 15 THEN
      kritik := nl || '⚠️ <b>DIQQAT: OG''IR HOLAT! (NIHSS ≥ 15)</b>';
    END IF;
  END IF;

  shifokor := tg_esc(coalesce(nullif(j->>'shifokor_fio', ''), '—'));
  IF nullif(j->>'shifokor_tel', '') IS NOT NULL THEN
    shifokor := shifokor || ' · 📞 ' || tg_esc(j->>'shifokor_tel');
  END IF;

  msg := emoji || ' <b>YANGI BEMOR QABUL QILINDI</b>' || nl || line || nl
      || '📍 <b>Viloyat:</b> '  || tg_esc(coalesce(nullif(j->>'viloyat', ''), '—'))  || nl
      || '🏥 <b>Muassasa:</b> ' || tg_esc(coalesce(nullif(j->>'muassasa', ''), '—')) || nl
      || '📋 <b>K/T No:</b> <code>' || tg_esc(coalesce(nullif(j->>'kt_no', ''), '—')) || '</code>' || nl
      || '👤 <b>Bemor:</b> ' || tg_esc(coalesce(nullif(j->>'fio', ''), '—'))
      || ', ' || age || ' yosh, ' || tg_esc(coalesce(nullif(j->>'jins', ''), '—')) || nl
      || detail || nl
      || '💊 <b>Muolaja:</b> ' || tg_esc(coalesce(nullif(j->>'muolaja_turi', ''), '—')) || nl
      || '⏰ <b>Simptom:</b> '  || tg_esc(coalesce(nullif(j->>'simptom_vaqt', ''), '—')) || nl
      || '🕐 <b>Qabul:</b> '    || qabul || nl
      || '👨‍⚕️ <b>Shifokor:</b> ' || shifokor || nl
      || line || kritik;

  PERFORM net.http_post(
    url     := API_URL,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-server-key', SERVER_KEY
    ),
    body    := jsonb_build_object('type', p_type, 'text', msg)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Xabar yuborishdagi xato bemorni saqlashga xalaqit bermasin
  RAISE WARNING 'notify_telegram_new_patient: %', SQLERRM;
  RETURN NEW;
END;
$fn$;

-- Triggerlar
DROP TRIGGER IF EXISTS trg_telegram_notify ON infarkt_qabul;
CREATE TRIGGER trg_telegram_notify
  AFTER INSERT ON infarkt_qabul
  FOR EACH ROW EXECUTE FUNCTION notify_telegram_new_patient();

DROP TRIGGER IF EXISTS trg_telegram_notify ON insult_qabul;
CREATE TRIGGER trg_telegram_notify
  AFTER INSERT ON insult_qabul
  FOR EACH ROW EXECUTE FUNCTION notify_telegram_new_patient();

-- ============================================================
-- ESLATMA: Excel'dan OMMAVIY IMPORT oldidan triggerni o'chiring,
-- aks holda har bir qator uchun alohida xabar ketadi:
--   ALTER TABLE insult_qabul  DISABLE TRIGGER trg_telegram_notify;
--   ALTER TABLE infarkt_qabul DISABLE TRIGGER trg_telegram_notify;
-- Import tugagach qayta yoqing:
--   ALTER TABLE insult_qabul  ENABLE TRIGGER trg_telegram_notify;
--   ALTER TABLE infarkt_qabul ENABLE TRIGGER trg_telegram_notify;
-- ============================================================
