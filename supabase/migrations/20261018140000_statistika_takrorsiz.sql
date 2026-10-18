-- Statistika: bog'langan (davomi_qabul_id) o'tkazilgan bemor viloyat/respublika jamida bir marta sanaladi
-- (2026-10-18, bazaga qo'llangan). A yozuvi tashlab ketiladi, agar uning davomi (B) shu kesimda bo'lsa:
-- respublikada — har doim, viloyatda — B ham o'sha viloyatda bo'lsa. Muassasa kesimida o'zgarish yo'q.
-- Tekshiruv (oldin → keyin): respublika infarkt 11709 → 11426, insult 22686 → 22627, vafot o'zgarmadi,
-- o'tkazilgan infarkt 2223 → 1962; Andijon viloyati infarkt 957 → 929; RSHTYOIM Andijon filiali o'zgarmadi.
-- Qaytarish: funksiyalardagi qabul_takror shartini olib tashlash (yoki davomi_qabul_id ni NULL qilish).
CREATE OR REPLACE FUNCTION public.qabul_takror(p_turi text, p_davomi uuid, p_viloyat text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_davomi IS NOT NULL AND CASE
    WHEN p_turi = 'infarkt' THEN EXISTS (SELECT 1 FROM infarkt_qabul b WHERE b.id = p_davomi AND (p_viloyat IS NULL OR b.viloyat = p_viloyat))
    ELSE EXISTS (SELECT 1 FROM insult_qabul b WHERE b.id = p_davomi AND (p_viloyat IS NULL OR b.viloyat = p_viloyat)) END;
$$;
GRANT EXECUTE ON FUNCTION public.qabul_takror(text, uuid, text) TO authenticated;

-- get_dashboard_stats (get_dashboard_snapshot ham shuni chaqiradi)
DO $do$
DECLARE d text; n int;
BEGIN
  d := pg_get_functiondef('public.get_dashboard_stats(text,text,timestamptz,timestamptz,timestamptz,timestamptz)'::regprocedure);
  IF position('qabul_takror' in d) > 0 THEN RETURN; END IF;
  n := length(d);
  d := replace(d, 'NULL::boolean AS f_mskt,    NULL::boolean AS f_tromb', 'NULL::boolean AS f_mskt,    NULL::boolean AS f_tromb,' || chr(10) || '         (p_muassasa IS NULL AND public.qabul_takror(''infarkt'', davomi_qabul_id, p_viloyat)) AS dup');
  IF length(d) = n THEN RAISE EXCEPTION 'inf joy topilmadi'; END IF;
  n := length(d);
  d := regexp_replace(d, '(''%tromboaspiratsiya%''\))(\s*FROM insult_qabul)', '\1,' || chr(10) || '         (p_muassasa IS NULL AND public.qabul_takror(''insult'', davomi_qabul_id, p_viloyat))\2');
  IF length(d) = n THEN RAISE EXCEPTION 'ins joy topilmadi'; END IF;
  IF regexp_count(d, 'COUNT\(\*\) FILTER \(WHERE t = ') <> 50 THEN RAISE EXCEPTION 'filter soni'; END IF;
  d := replace(d, 'COUNT(*) FILTER (WHERE t = ', 'COUNT(*) FILTER (WHERE NOT dup AND t = ');
  EXECUTE d;
END $do$;

-- get_viloyat_stats: har bir viloyat qatori o'z viloyati bo'yicha
DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.get_viloyat_stats(text,timestamptz,timestamptz)'::regprocedure);
  IF position('qabul_takror' in d) > 0 THEN RETURN; END IF;
  d := regexp_replace(d, '(SELECT viloyat, ''infarkt'' AS _type, qabul_vaqt FROM infarkt_qabul\s*WHERE)', '\1 NOT public.qabul_takror(''infarkt'', davomi_qabul_id, viloyat) AND');
  d := regexp_replace(d, '(SELECT viloyat, ''insult'' AS _type, qabul_vaqt FROM insult_qabul\s*WHERE)', '\1 NOT public.qabul_takror(''insult'', davomi_qabul_id, viloyat) AND');
  IF regexp_count(d, 'qabul_takror') <> 2 THEN RAISE EXCEPTION 'almashtirish'; END IF;
  EXECUTE d;
END $do$;

-- get_hisobot_yosh: viloyat kesimida takrorsiz, muassasa kesimida o'zgarishsiz
DO $do$
DECLARE d text;
BEGIN
  d := pg_get_functiondef('public.get_hisobot_yosh(date,date,text,text,text)'::regprocedure);
  IF position('qabul_takror' in d) > 0 THEN RETURN; END IF;
  d := replace(d, 'x.tugilgan_yil::text ty from public.infarkt_qabul x', 'x.tugilgan_yil::text ty, x.davomi_qabul_id dv from public.infarkt_qabul x');
  d := replace(d, 'x.tugilgan_yil::text from public.insult_qabul x', 'x.tugilgan_yil::text, x.davomi_qabul_id from public.insult_qabul x');
  d := replace(d, 'and (p_viloyat is null or q.v = p_viloyat)', 'and (p_viloyat is null or q.v = p_viloyat)' || chr(10) || '      and (p_kesim = ''muassasa'' or p_muassasa is not null or not public.qabul_takror(q.t, q.dv, q.v))');
  IF position('qabul_takror' in d) = 0 THEN RAISE EXCEPTION 'joy topilmadi'; END IF;
  EXECUTE d;
END $do$;
