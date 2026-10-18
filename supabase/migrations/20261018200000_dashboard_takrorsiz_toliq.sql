-- Dashboard: bog'langan o'tkazilgan bemor viloyat/respublika kesimida bir marta sanaladi — BARCHA qismlarda
-- bir xil qoida bilan (2026-10-18, bazaga qo'llangan). 20261018140000 da faqat get_dashboard_stats
-- o'zgargani uchun Bosh sahifadagi solishtirish tekshiruvi xato bergan edi (20261018180000 da bekor qilingan).
--
-- Qoida (hamma joyda bir xil, faqat qatorning o'z ustunlari bilan):
--   A qatori tashlab ketiladi  <=>  p_muassasa IS NULL
--                                   AND davomi_qabul_id IS NOT NULL
--                                   AND (p_viloyat IS NULL OR davomi_viloyat IS NOT DISTINCT FROM p_viloyat)
--                                   AND foydalanuvchi roli super_admin / rahbar / admin
-- ya'ni respublikada — har doim, viloyatda — davomi (B) ham o'sha viloyatda bo'lsa, muassasa kesimida va
-- shifokor (user) uchun — hech qachon (shifokor o'z muassasasi raqamlarini avvalgidek ko'radi).
-- davomi_viloyat — B qabulining viloyati (bog'lashda yoziladi).
--
-- Sinov (2026-10-18): Bosh sahifaning o'z solishtirish tekshiruvlari (jami = davolash oqimi = hududlar =
-- murojaat yo'llari; vafot/faol/o'tkazilgan/chiqarilgan) 10 kesimda — super_admin (respublika, 3 viloyat,
-- muassasa, sana oralig'i), Andijon admini, 2 ta shifokor (RLS bilan) — xato 0. Shifokor raqamlari o'zgarmadi.
-- Natija: respublika infarkt 11710 → 11427, insult 22686 → 22627; Andijon 958 → 930.
-- O'zgargan: get_dashboard_stats, get_treatment_flow, get_dashboard_snapshot (hududlar, murojaat yo'llari),
-- dashboard_get_demographics, dashboard_get_age_sex_pyramid, dashboard_get_risk_factors, get_viloyat_stats,
-- qabul_davomi_bogla (davomi_viloyat ni ham yozadi). Bosh sahifadagi "Murojaat yo'li → viloyatlar" ochilmasi
-- (js/supabase.js getAdmissionSourceRegions) ham shu qoidani qo'llaydi.

ALTER TABLE public.infarkt_qabul ADD COLUMN IF NOT EXISTS davomi_viloyat text;
ALTER TABLE public.insult_qabul  ADD COLUMN IF NOT EXISTS davomi_viloyat text;
UPDATE public.infarkt_qabul a SET davomi_viloyat = b.viloyat FROM public.infarkt_qabul b WHERE a.davomi_qabul_id = b.id AND a.davomi_viloyat IS DISTINCT FROM b.viloyat;
UPDATE public.insult_qabul  a SET davomi_viloyat = b.viloyat FROM public.insult_qabul  b WHERE a.davomi_qabul_id = b.id AND a.davomi_viloyat IS DISTINCT FROM b.viloyat;

-- Bog'lash funksiyasi davomi_viloyat ni ham yozadi
DO $do$
DECLARE d text; o text := 'EXECUTE format(''UPDATE public.%I SET davomi_qabul_id = $1 WHERE id = $2 AND davomi_qabul_id IS NULL'', p_turi || ''_qabul'') USING b.id, a_id;';
BEGIN
  d := pg_get_functiondef('public.qabul_davomi_bogla(text,uuid,text)'::regprocedure);
  IF position('davomi_viloyat' in d) > 0 THEN RETURN; END IF;
  IF position(o in d) = 0 THEN RAISE EXCEPTION 'bogla: joy topilmadi'; END IF;
  d := replace(d, o, 'EXECUTE format(''UPDATE public.%1$I a SET davomi_qabul_id = $1, davomi_viloyat = (SELECT b.viloyat FROM public.%1$I b WHERE b.id = $1) WHERE a.id = $2 AND a.davomi_qabul_id IS NULL'', p_turi || ''_qabul'') USING b.id, a_id;');
  EXECUTE d;
END $do$;

DO $do$
DECLARE d text; n int;
  e text := '(p_muassasa IS NULL AND davomi_qabul_id IS NOT NULL AND (p_viloyat IS NULL OR davomi_viloyat IS NOT DISTINCT FROM p_viloyat) AND (SELECT public.auth_role()) IN (''super_admin'',''rahbar'',''admin''))';
BEGIN
  -- 1) get_dashboard_stats: dup ustuni qoidaga almashtiriladi, barcha COUNT lar NOT dup bilan
  d := pg_get_functiondef('public.get_dashboard_stats(text,text,timestamptz,timestamptz,timestamptz,timestamptz)'::regprocedure);
  d := replace(d, '(p_muassasa IS NULL AND public.qabul_takror(''infarkt'', davomi_qabul_id, p_viloyat))', e);
  d := replace(d, '(p_muassasa IS NULL AND public.qabul_takror(''insult'', davomi_qabul_id, p_viloyat))', e);
  IF (length(d) - length(replace(d, e, ''))) / length(e) <> 2 THEN RAISE EXCEPTION 'stats: dup ustuni 2 ta emas'; END IF;
  IF position('NOT dup AND' in d) = 0 THEN
    IF regexp_count(d, 'COUNT\(\*\) FILTER \(WHERE t = ') <> 50 THEN RAISE EXCEPTION 'stats: filter soni'; END IF;
    d := replace(d, 'COUNT(*) FILTER (WHERE t = ', 'COUNT(*) FILTER (WHERE NOT dup AND t = ');
  END IF;
  EXECUTE d;

  -- 2) get_treatment_flow: kogortadan chiqariladi
  d := pg_get_functiondef('public.get_treatment_flow(text,text,text,timestamptz,timestamptz)'::regprocedure);
  IF position('davomi_viloyat' in d) = 0 THEN
    n := regexp_count(d, 'otkazish_sababi,\s*count\(\*\) over\(partition by kt_no\) as key_count');
    IF n <> 2 THEN RAISE EXCEPTION 'flow: admissions %', n; END IF;
    d := regexp_replace(d, 'otkazish_sababi,(\s*)count\(\*\) over\(partition by kt_no\) as key_count',
                        'otkazish_sababi, davomi_qabul_id, davomi_viloyat,\1count(*) over(partition by kt_no) as key_count', 'g');
    IF position('(p_from is null or qabul_vaqt>=p_from) and (p_to is null or qabul_vaqt<=p_to)' in d) = 0 THEN RAISE EXCEPTION 'flow: cohort'; END IF;
    d := replace(d, '(p_from is null or qabul_vaqt>=p_from) and (p_to is null or qabul_vaqt<=p_to)',
                    '(p_from is null or qabul_vaqt>=p_from) and (p_to is null or qabul_vaqt<=p_to) and not ' || e);
    EXECUTE d;
  END IF;

  -- 3) get_dashboard_snapshot: hududlar va murojaat yo'llari kogortasi
  d := pg_get_functiondef('public.get_dashboard_snapshot(text,text,timestamptz,timestamptz,timestamptz,timestamptz)'::regprocedure);
  IF position('davomi_viloyat' in d) = 0 THEN
    n := regexp_count(d, 'and \(p_from is null or qabul_vaqt>=p_from\) and \(p_to is null or qabul_vaqt<=p_to\)');
    IF n <> 2 THEN RAISE EXCEPTION 'snapshot: %', n; END IF;
    d := replace(d, 'and (p_from is null or qabul_vaqt>=p_from) and (p_to is null or qabul_vaqt<=p_to)',
                    'and (p_from is null or qabul_vaqt>=p_from) and (p_to is null or qabul_vaqt<=p_to) and not ' || e);
    EXECUTE d;
  END IF;

  -- 4) demografiya, yosh piramidasi, xavf omillari
  d := pg_get_functiondef('public.dashboard_get_demographics(text,text,timestamptz,timestamptz)'::regprocedure);
  IF position('davomi_viloyat' in d) = 0 THEN
    n := regexp_count(d, 'AND \(p_to IS NULL OR qabul_vaqt <= p_to\)');
    IF n <> 2 THEN RAISE EXCEPTION 'demografiya: %', n; END IF;
    d := replace(d, 'AND (p_to IS NULL OR qabul_vaqt <= p_to)', 'AND (p_to IS NULL OR qabul_vaqt <= p_to) AND NOT ' || e);
    EXECUTE d;
  END IF;
  d := pg_get_functiondef('public.dashboard_get_age_sex_pyramid(text,text,timestamptz,timestamptz)'::regprocedure);
  IF position('davomi_viloyat' in d) = 0 THEN
    n := regexp_count(d, 'AND \(p_to IS NULL OR qabul_vaqt <= p_to\)');
    IF n <> 2 THEN RAISE EXCEPTION 'piramida: %', n; END IF;
    d := replace(d, 'AND (p_to IS NULL OR qabul_vaqt <= p_to)', 'AND (p_to IS NULL OR qabul_vaqt <= p_to) AND NOT ' || e);
    EXECUTE d;
  END IF;
  d := pg_get_functiondef('public.dashboard_get_risk_factors(text,text,timestamptz,timestamptz)'::regprocedure);
  IF position('davomi_viloyat' in d) = 0 THEN
    n := regexp_count(d, 'AND \(p_to IS NULL OR qabul_vaqt <= p_to\)');
    IF n <> 2 THEN RAISE EXCEPTION 'xavf: %', n; END IF;
    d := replace(d, 'AND (p_to IS NULL OR qabul_vaqt <= p_to)', 'AND (p_to IS NULL OR qabul_vaqt <= p_to) AND NOT ' || e);
    EXECUTE d;
  END IF;

  -- 5) get_viloyat_stats (p_muassasa yo'q — qoida p_viloyat bilan)
  d := pg_get_functiondef('public.get_viloyat_stats(text,timestamptz,timestamptz)'::regprocedure);
  IF position('davomi_viloyat' in d) = 0 THEN
    n := regexp_count(d, 'AND \(p_to   IS NULL OR qabul_vaqt <= p_to\)');
    IF n <> 2 THEN RAISE EXCEPTION 'viloyat_stats: %', n; END IF;
    d := replace(d, 'AND (p_to   IS NULL OR qabul_vaqt <= p_to)',
      'AND (p_to   IS NULL OR qabul_vaqt <= p_to) AND NOT (davomi_qabul_id IS NOT NULL AND (p_viloyat IS NULL OR davomi_viloyat IS NOT DISTINCT FROM p_viloyat) AND (SELECT public.auth_role()) IN (''super_admin'',''rahbar'',''admin''))');
    EXECUTE d;
  END IF;
END $do$;
