-- ============================================================
-- get_dashboard_stats tezlashtirish (2026-09-27)
--
-- Muammo: har qator uchun ~45 ta ILIKE '%..%' hisoblanardi — bir xil shart
-- (masalan STEMI) jami / davolangan / vafot uchun 3 martadan qayta baholanardi.
-- 32 mingta qatorda bu ~1 soniya beradi.
--
-- Yechim: shartlar qator boshiga BIR marta hisoblanadi (pastki so'rovda),
-- agregatlar tayyor bayroqlardan foydalanadi. Mantiq, xavfsizlik (SECURITY
-- INVOKER, RLS) va natija formati o'zgarmaydi.
--
-- TARTIB:
--   1-qism: yangi funksiyani get_dashboard_stats_v2 nomi bilan yaratish
--           (ilova hali eskisini ishlatadi — xavfsiz).
--   2-qism: natijani eskisi bilan solishtirish (Claude brauzerda tekshiradi).
--   3-qism: moslik tasdiqlangach nomlarni almashtirish (bir tranzaksiya).
--   4-qism: kerak bo'lsa orqaga qaytarish.
-- ============================================================


-- ============ 1-QISM: yangi funksiya ============
CREATE OR REPLACE FUNCTION public.get_dashboard_stats_v2(
  p_viloyat text DEFAULT NULL::text,
  p_muassasa text DEFAULT NULL::text,
  p_today_start timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_today_end timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_to timestamp with time zone DEFAULT NULL::timestamp with time zone
)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'extensions', 'pg_temp'
AS $function$
SELECT jsonb_build_object(
  'jami_infarkt',         COUNT(*) FILTER (WHERE t = 'inf'),
  'jami_insult',          COUNT(*) FILTER (WHERE t = 'ins'),
  'aktiv_infarkt',        COUNT(*) FILTER (WHERE t = 'inf' AND status = 'active'),
  'aktiv_insult',         COUNT(*) FILTER (WHERE t = 'ins' AND status = 'active'),
  'vafot_infarkt',        COUNT(*) FILTER (WHERE t = 'inf' AND status = 'vafot'),
  'vafot_insult',         COUNT(*) FILTER (WHERE t = 'ins' AND status = 'vafot'),
  'chiqarildi_infarkt',   COUNT(*) FILTER (WHERE t = 'inf' AND status = 'chiqarildi'),
  'chiqarildi_insult',    COUNT(*) FILTER (WHERE t = 'ins' AND status = 'chiqarildi'),
  'otkazildi_infarkt',    COUNT(*) FILTER (WHERE t = 'inf' AND status = 'otkazildi'),
  'otkazildi_insult',     COUNT(*) FILTER (WHERE t = 'ins' AND status = 'otkazildi'),
  'bugun_infarkt',        COUNT(*) FILTER (WHERE t = 'inf' AND bugun),
  'bugun_insult',         COUNT(*) FILTER (WHERE t = 'ins' AND bugun),
  'kritik_infarkt',       COUNT(*) FILTER (WHERE t = 'inf' AND kritik),
  'kritik_insult',        COUNT(*) FILTER (WHERE t = 'ins' AND kritik),
  'stemi',                COUNT(*) FILTER (WHERE t = 'inf' AND f_stemi),
  'stemi_davol',          COUNT(*) FILTER (WHERE t = 'inf' AND f_stemi AND status = 'chiqarildi'),
  'stemi_vafot',          COUNT(*) FILTER (WHERE t = 'inf' AND f_stemi AND status = 'vafot'),
  'nstemi',               COUNT(*) FILTER (WHERE t = 'inf' AND f_nstemi),
  'nstemi_davol',         COUNT(*) FILTER (WHERE t = 'inf' AND f_nstemi AND status = 'chiqarildi'),
  'nstemi_vafot',         COUNT(*) FILTER (WHERE t = 'inf' AND f_nstemi AND status = 'vafot'),
  'miokard',              COUNT(*) FILTER (WHERE t = 'inf' AND f_miokard),
  'miokard_davol',        COUNT(*) FILTER (WHERE t = 'inf' AND f_miokard AND status = 'chiqarildi'),
  'miokard_vafot',        COUNT(*) FILTER (WHERE t = 'inf' AND f_miokard AND status = 'vafot'),
  'koronar',              COUNT(*) FILTER (WHERE t = 'inf' AND f_koronar),
  'koronar_davol',        COUNT(*) FILTER (WHERE t = 'inf' AND f_koronar AND status = 'chiqarildi'),
  'koronar_vafot',        COUNT(*) FILTER (WHERE t = 'inf' AND f_koronar AND status = 'vafot'),
  'trombolizis',          COUNT(*) FILTER (WHERE t = 'inf' AND f_tlt),
  'trombolizis_davol',    COUNT(*) FILTER (WHERE t = 'inf' AND f_tlt AND status = 'chiqarildi'),
  'trombolizis_vafot',    COUNT(*) FILTER (WHERE t = 'inf' AND f_tlt AND status = 'vafot'),
  'medikamentoz_inf',     COUNT(*) FILTER (WHERE t = 'inf' AND f_med),
  'medikamentoz_inf_davol',COUNT(*) FILTER (WHERE t = 'inf' AND f_med AND status = 'chiqarildi'),
  'medikamentoz_inf_vafot',COUNT(*) FILTER (WHERE t = 'inf' AND f_med AND status = 'vafot'),
  'ishemik',              COUNT(*) FILTER (WHERE t = 'ins' AND f_ishemik),
  'ishemik_davol',        COUNT(*) FILTER (WHERE t = 'ins' AND f_ishemik AND status = 'chiqarildi'),
  'ishemik_vafot',        COUNT(*) FILTER (WHERE t = 'ins' AND f_ishemik AND status = 'vafot'),
  'gemorragik',           COUNT(*) FILTER (WHERE t = 'ins' AND f_gemorragik),
  'gemorragik_davol',     COUNT(*) FILTER (WHERE t = 'ins' AND f_gemorragik AND status = 'chiqarildi'),
  'gemorragik_vafot',     COUNT(*) FILTER (WHERE t = 'ins' AND f_gemorragik AND status = 'vafot'),
  'tia',                  COUNT(*) FILTER (WHERE t = 'ins' AND f_tia),
  'tia_davol',            COUNT(*) FILTER (WHERE t = 'ins' AND f_tia AND status = 'chiqarildi'),
  'tia_vafot',            COUNT(*) FILTER (WHERE t = 'ins' AND f_tia AND status = 'vafot'),
  'mskt',                 COUNT(*) FILTER (WHERE t = 'ins' AND f_mskt),
  'mskt_davol',           COUNT(*) FILTER (WHERE t = 'ins' AND f_mskt AND status = 'chiqarildi'),
  'mskt_vafot',           COUNT(*) FILTER (WHERE t = 'ins' AND f_mskt AND status = 'vafot'),
  'trombektomiya',        COUNT(*) FILTER (WHERE t = 'ins' AND f_tromb),
  'trombektomiya_davol',  COUNT(*) FILTER (WHERE t = 'ins' AND f_tromb AND status = 'chiqarildi'),
  'trombektomiya_vafot',  COUNT(*) FILTER (WHERE t = 'ins' AND f_tromb AND status = 'vafot'),
  'medikamentoz_ins',     COUNT(*) FILTER (WHERE t = 'ins' AND f_med),
  'medikamentoz_ins_davol',COUNT(*) FILTER (WHERE t = 'ins' AND f_med AND status = 'chiqarildi'),
  'medikamentoz_ins_vafot',COUNT(*) FILTER (WHERE t = 'ins' AND f_med AND status = 'vafot')
)
FROM (
  -- Infarkt: ILIKE shartlari qator boshiga bir martadan
  SELECT 'inf'::text AS t, status,
         (qabul_vaqt BETWEEN p_today_start AND p_today_end)          AS bugun,
         (killip LIKE '%III%' OR killip LIKE '%IV%')                  AS kritik,
         (infarkt_turi ILIKE '%STEMI%' AND infarkt_turi NOT ILIKE '%NSTEMI%') AS f_stemi,
         (infarkt_turi ILIKE '%NSTEMI%')                              AS f_nstemi,
         (infarkt_turi ILIKE '%miokard%')                             AS f_miokard,
         (muolaja_turi ILIKE '%KAG%' OR muolaja_turi ILIKE '%koronarangio%') AS f_koronar,
         (muolaja_turi ILIKE '%TLT%' OR muolaja_turi ILIKE '%trombolitik%')  AS f_tlt,
         (muolaja_turi ILIKE '%medikamentoz%')                        AS f_med,
         NULL::boolean AS f_ishemik, NULL::boolean AS f_gemorragik, NULL::boolean AS f_tia,
         NULL::boolean AS f_mskt,    NULL::boolean AS f_tromb
  FROM infarkt_qabul
  WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)
    AND (p_muassasa IS NULL OR muassasa = p_muassasa)
    AND (p_from     IS NULL OR qabul_vaqt >= p_from)
    AND (p_to       IS NULL OR qabul_vaqt <= p_to)
  UNION ALL
  -- Insult
  SELECT 'ins', status,
         (qabul_vaqt BETWEEN p_today_start AND p_today_end),
         (nihss_qabul IS NOT NULL AND nihss_qabul::numeric >= 15),
         NULL, NULL, NULL, NULL, NULL,
         (muolaja_turi ILIKE '%medikamentoz%'),
         (insult_turi ILIKE 'Ishemik insult'),
         (insult_turi ILIKE 'Gemorragik insult'),
         (insult_turi ILIKE 'TIA%'),
         (mskt = 'Ha – o''tkazildi'),
         (muolaja_turi ILIKE '%trombektom%' OR muolaja_turi ILIKE '%tromboekstraksiya%' OR muolaja_turi ILIKE '%tromboaspiratsiya%')
  FROM insult_qabul
  WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)
    AND (p_muassasa IS NULL OR muassasa = p_muassasa)
    AND (p_from     IS NULL OR qabul_vaqt >= p_from)
    AND (p_to       IS NULL OR qabul_vaqt <= p_to)
) x;
$function$;

-- Huquqlar eskisi bilan bir xil bo'lishi kerak (security_hardening_2026_08.sql):
revoke execute on function public.get_dashboard_stats_v2(text, text, timestamptz, timestamptz, timestamptz, timestamptz) from public, anon;
grant  execute on function public.get_dashboard_stats_v2(text, text, timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;


-- ============ 3-QISM: almashtirish (FAQAT solishtirish mos chiqqandan keyin) ============
-- begin;
--   alter function public.get_dashboard_stats(text, text, timestamptz, timestamptz, timestamptz, timestamptz)
--     rename to get_dashboard_stats_old;
--   alter function public.get_dashboard_stats_v2(text, text, timestamptz, timestamptz, timestamptz, timestamptz)
--     rename to get_dashboard_stats;
-- commit;


-- ============ 4-QISM: orqaga qaytarish ============
-- begin;
--   alter function public.get_dashboard_stats(text, text, timestamptz, timestamptz, timestamptz, timestamptz)
--     rename to get_dashboard_stats_v2;
--   alter function public.get_dashboard_stats_old(text, text, timestamptz, timestamptz, timestamptz, timestamptz)
--     rename to get_dashboard_stats;
-- commit;
