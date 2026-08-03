-- =====================================================================
-- PQ-20 HISOBOTI — timeout tuzatildi (2026-08-04)
--
-- Muammo: get_pq20_hisobot security definer EMAS edi. Shu sababli
-- 20 000 qatorli infarkt_qabul + insult_qabul ustiga RLS shartlari
-- qo'llanardi va respublika bo'yicha 7 oylik so'rov 8 soniyalik
-- chegaradan oshib ketardi ("canceling statement due to statement timeout").
--
-- Yechim: security definer + viloyat cheklovi funksiya ICHIDA ochiq
-- tekshiriladi (marshrut RPC'laridagi kabi). Ya'ni himoya yo'qolmaydi,
-- faqat joyi o'zgaradi:
--   super_admin / admin / rahbar  — barcha viloyatlar
--   qolganlar                     — majburan o'z viloyati
--
-- SO'ROV MANTIG'I O'ZGARMADI — tanasi asl holicha, faqat plpgsql ichiga
-- o'ralgan. Raqamlar avvalgidek chiqadi.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_pq20_hisobot(
  p_muassasa text        DEFAULT NULL,
  p_viloyat  text        DEFAULT NULL,
  p_from     timestamptz DEFAULT NULL,
  p_to       timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_role   text;
  v_vil    text;
  v_result json;
BEGIN
  SELECT p.role, p.viloyat INTO v_role, v_vil
    FROM public.profiles p WHERE p.id = auth.uid();

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Ruxsat yo''q: foydalanuvchi topilmadi';
  END IF;

  -- Viloyat admini va shifokor faqat o'z viloyatini ko'radi.
  -- Frontend cheklovi yetarli emas — bu yerda majburan almashtiriladi.
  IF v_role NOT IN ('super_admin', 'admin', 'rahbar') THEN
    p_viloyat := COALESCE(v_vil, '__yoq__');
  END IF;

  SELECT (
WITH
-- ==================== INFARKT: manba ====================
inf_dyn AS (
  SELECT d.kt_no, lower(string_agg(COALESCE(d.muolaja_turi, ''), ' | ')) AS m_dyn
  FROM public.dinamika_muolajalar d
  WHERE lower(COALESCE(d.registr_turi, '')) = 'infarkt'
  GROUP BY d.kt_no
),
inf_raw AS (
  SELECT
    i.kt_no,
    i.status,
    CASE
      WHEN i.infarkt_turi ILIKE '%nstemi%' OR i.infarkt_turi ILIKE '%elevatsiyasiz%'    THEN 'NSTEMI'
      WHEN i.infarkt_turi ILIKE '%stemi%'  OR i.infarkt_turi ILIKE '%elevatsiya bilan%' THEN 'STEMI'
      WHEN i.infarkt_turi ILIKE '%miokard%'                                             THEN 'AMI'
      ELSE 'BOSHQA'
    END AS noz,
    lower(
      COALESCE(i.muolaja_turi, '') || ' | ' ||
      COALESCE(i.dinamika_muolaja_turi, '') || ' | ' ||
      COALESCE(dn.m_dyn, '')
    ) AS mm
  FROM public.infarkt_qabul i
  LEFT JOIN inf_dyn dn ON dn.kt_no = i.kt_no
  WHERE (p_muassasa IS NULL OR i.muassasa = p_muassasa)
    AND (p_viloyat  IS NULL OR i.viloyat  = p_viloyat)
    AND (p_from     IS NULL OR i.qabul_vaqt >= p_from)
    AND (p_to       IS NULL OR i.qabul_vaqt <= p_to)
),
inf_f AS (
  SELECT
    noz,
    (COALESCE(status,'') = 'vafot')                              AS vafot,
    (mm ~ '\mkag\M' OR mm ~ 'koronar angiografiya')              AS f_kag,
    (mm ~ 'stentlash|\mstent\M')                                 AS f_stent,
    (mm ~ 'ballon angioplastika|\mtlbap\M')                      AS f_tlbap,
    (mm ~ 'trombolitik|\mtlt\M')                                 AS f_tlt,
    (mm ~ 'medikamentoz')                                        AS f_medik,
    (mm ~ 'o''tkazildi|otkazildi')                               AS f_transfer
  FROM inf_raw
  WHERE noz <> 'BOSHQA'
),
inf_c AS (
  SELECT
    noz, vafot, f_transfer, f_medik,
    f_kag, f_stent, f_tlbap, f_tlt,
    (f_kag OR f_stent OR f_tlbap OR f_tlt)                       AS aralashuv,
    (f_kag AND f_stent)                                          AS kag_stent,
    (f_kag AND f_tlbap AND NOT f_stent)                          AS kag_tlbap,
    (f_tlt AND f_kag AND (f_stent OR f_tlbap))                   AS tlt_toka
  FROM inf_f
),
inf_agg AS (
  SELECT
    noz,
    COUNT(*)                                                      AS bemorlar,
    COUNT(*) FILTER (WHERE aralashuv)                             AS amaliyot,
    COUNT(*) FILTER (WHERE vafot)                                 AS olgan,
    COUNT(*) FILTER (WHERE f_medik AND NOT aralashuv)             AS medik,
    COUNT(*) FILTER (WHERE f_medik AND NOT aralashuv AND vafot)   AS medik_olgan,
    COUNT(*) FILTER (WHERE f_kag)                                 AS kag,
    COUNT(*) FILTER (WHERE f_kag AND vafot)                       AS kag_olgan,
    COUNT(*) FILTER (WHERE kag_tlbap)                             AS kag_tlbap,
    COUNT(*) FILTER (WHERE kag_tlbap AND vafot)                   AS kag_tlbap_olgan,
    COUNT(*) FILTER (WHERE kag_stent)                             AS kag_stent,
    COUNT(*) FILTER (WHERE kag_stent AND vafot)                   AS kag_stent_olgan,
    COUNT(*) FILTER (WHERE f_tlt)                                 AS tlt,
    COUNT(*) FILTER (WHERE f_tlt AND vafot)                       AS tlt_olgan,
    COUNT(*) FILTER (WHERE tlt_toka)                              AS tlt_toka,
    COUNT(*) FILTER (WHERE tlt_toka AND vafot)                    AS tlt_toka_olgan,
    COUNT(*) FILTER (WHERE NOT aralashuv AND NOT f_medik AND f_transfer)     AS otkazildi,
    COUNT(*) FILTER (WHERE NOT aralashuv AND NOT f_medik AND NOT f_transfer) AS boshqa
  FROM inf_c
  GROUP BY noz
),
inf_rows AS (
  SELECT * FROM (
    SELECT 1 AS ord, 'O''tkir miokard infarkti (AMI)'::text AS nozologiya, a.* FROM inf_agg a WHERE noz = 'AMI'
    UNION ALL
    SELECT 2, 'O''KS ST elevatsiya bilan (STEMI)',   a.* FROM inf_agg a WHERE noz = 'STEMI'
    UNION ALL
    SELECT 3, 'O''KS ST elevatsiyasiz (NSTEMI)',     a.* FROM inf_agg a WHERE noz = 'NSTEMI'
  ) t
),
inf_jami AS (
  SELECT
    99 AS ord, 'Jami'::text AS nozologiya, 'JAMI'::text AS noz,
    SUM(bemorlar)::bigint, SUM(amaliyot)::bigint, SUM(olgan)::bigint,
    SUM(medik)::bigint, SUM(medik_olgan)::bigint,
    SUM(kag)::bigint, SUM(kag_olgan)::bigint,
    SUM(kag_tlbap)::bigint, SUM(kag_tlbap_olgan)::bigint,
    SUM(kag_stent)::bigint, SUM(kag_stent_olgan)::bigint,
    SUM(tlt)::bigint, SUM(tlt_olgan)::bigint,
    SUM(tlt_toka)::bigint, SUM(tlt_toka_olgan)::bigint,
    SUM(otkazildi)::bigint, SUM(boshqa)::bigint
  FROM inf_rows
),
inf_all AS (
  SELECT * FROM inf_rows UNION ALL SELECT * FROM inf_jami
),

-- ==================== INSULT: manba ====================
ins_dyn AS (
  SELECT d.kt_no, lower(string_agg(COALESCE(d.muolaja_turi, ''), ' | ')) AS m_dyn
  FROM public.dinamika_muolajalar d
  WHERE lower(COALESCE(d.registr_turi, '')) = 'insult'
  GROUP BY d.kt_no
),
ins_raw AS (
  SELECT
    n.kt_no,
    n.status,
    CASE
      WHEN n.insult_turi ILIKE '%tranzitor%' OR n.insult_turi ILIKE '%tia%' THEN 'TIA'
      WHEN n.insult_turi ILIKE '%gemorragik%'                               THEN 'GEMORRAGIK'
      WHEN n.insult_turi ILIKE '%ishemik%'                                  THEN 'ISHEMIK'
      ELSE 'BOSHQA'
    END AS noz,
    -- mskt maydonida 4 xil matn bor (qisqa va uzun tire bilan): 'Ha – o''tkazildi',
    -- 'Ha — o''tkazildi', 'Yo''q – boshqa sabab', 'Yo''q — boshqa sabab'.
    -- Shuning uchun faqat boshidagi "Ha" ga qaraymiz — tirega bog'liq emas.
    (n.mskt ~* '^\s*ha') AS f_mskt,
    (n.mskt_angiografiya ~* '^ha')                                              AS f_mskt_angio,
    lower(
      COALESCE(n.muolaja_turi, '') || ' | ' ||
      COALESCE(n.dinamika_muolaja_turi, '') || ' | ' ||
      COALESCE(dn.m_dyn, '')
    ) AS mm
  FROM public.insult_qabul n
  LEFT JOIN ins_dyn dn ON dn.kt_no = n.kt_no
  WHERE (p_muassasa IS NULL OR n.muassasa = p_muassasa)
    AND (p_viloyat  IS NULL OR n.viloyat  = p_viloyat)
    AND (p_from     IS NULL OR n.qabul_vaqt >= p_from)
    AND (p_to       IS NULL OR n.qabul_vaqt <= p_to)
),
ins_f AS (
  SELECT
    noz,
    (COALESCE(status,'') = 'vafot')                    AS vafot,
    f_mskt, f_mskt_angio,
    (mm ~ 'serebral angiografiya')                     AS f_ser_angio,
    (mm ~ 'tromboaspir')                               AS f_aspir,
    (mm ~ 'tromboekstr|trombektomiya')                 AS f_ekstr,
    (mm ~ 'trombolitik|\mtlt\M')                       AS f_tlt,
    (mm ~ 'jarrohlik|trepanatsiya|freza')              AS f_surgery,
    (mm ~ 'stentlash')                                 AS f_stent,
    (mm ~ 'ballon angioplastika|\mtlbap\M')            AS f_tlbap,
    (mm ~ 'medikamentoz|konservativ')                  AS f_medik,
    (mm ~ 'o''tkazildi|otkazildi')                     AS f_transfer
  FROM ins_raw
  WHERE noz IN ('GEMORRAGIK', 'ISHEMIK')
),
ins_c AS (
  SELECT *,
    -- MSKT va MSKT angiografiya TEKSHIRUV -> "amaliyot" ga kirmaydi.
    -- Faqat invaziv/endovaskulyar aralashuvlar va jarrohlik hisobga olinadi.
    (f_ser_angio OR f_aspir OR f_ekstr
      OR f_tlt OR f_surgery OR f_stent OR f_tlbap)     AS aralashuv,
    (f_aspir OR f_ekstr)                               AS trombo,
    (f_tlt AND (f_aspir OR f_ekstr))                   AS tlt_trombo,
    (f_stent OR f_tlbap)                               AS boshqa_endo
  FROM ins_f
),
ins_agg AS (
  SELECT
    noz,
    COUNT(*)                                                      AS bemorlar,
    COUNT(*) FILTER (WHERE aralashuv)                             AS amaliyot,
    COUNT(*) FILTER (WHERE vafot)                                 AS olgan,
    COUNT(*) FILTER (WHERE f_mskt)                                AS mskt,
    COUNT(*) FILTER (WHERE f_mskt AND vafot)                      AS mskt_olgan,
    COUNT(*) FILTER (WHERE f_mskt_angio)                          AS mskt_angio,
    COUNT(*) FILTER (WHERE f_mskt_angio AND vafot)                AS mskt_angio_olgan,
    COUNT(*) FILTER (WHERE f_medik AND NOT aralashuv)             AS medik,
    COUNT(*) FILTER (WHERE f_medik AND NOT aralashuv AND vafot)   AS medik_olgan,
    COUNT(*) FILTER (WHERE f_surgery)                             AS trepanatsiya,
    COUNT(*) FILTER (WHERE f_surgery AND vafot)                   AS trepanatsiya_olgan,
    COUNT(*) FILTER (WHERE f_tlt)                                 AS tlt,
    COUNT(*) FILTER (WHERE f_tlt AND vafot)                       AS tlt_olgan,
    COUNT(*) FILTER (WHERE trombo)                                AS trombo,
    COUNT(*) FILTER (WHERE trombo AND vafot)                      AS trombo_olgan,
    COUNT(*) FILTER (WHERE tlt_trombo)                            AS tlt_trombo,
    COUNT(*) FILTER (WHERE tlt_trombo AND vafot)                  AS tlt_trombo_olgan,
    COUNT(*) FILTER (WHERE boshqa_endo)                           AS boshqa_endo,
    COUNT(*) FILTER (WHERE NOT aralashuv AND NOT f_medik AND f_transfer)     AS otkazildi,
    COUNT(*) FILTER (WHERE NOT aralashuv AND NOT f_medik AND NOT f_transfer) AS boshqa
  FROM ins_c
  GROUP BY noz
),
ins_rows AS (
  SELECT * FROM (
    SELECT 1 AS ord, 'Gemorragik insult'::text AS nozologiya, a.* FROM ins_agg a WHERE noz = 'GEMORRAGIK'
    UNION ALL
    SELECT 2, 'Ishemik insult', a.* FROM ins_agg a WHERE noz = 'ISHEMIK'
  ) t
),
ins_jami AS (
  SELECT
    99 AS ord, 'Jami'::text AS nozologiya, 'JAMI'::text AS noz,
    SUM(bemorlar)::bigint, SUM(amaliyot)::bigint, SUM(olgan)::bigint,
    SUM(mskt)::bigint, SUM(mskt_olgan)::bigint,
    SUM(mskt_angio)::bigint, SUM(mskt_angio_olgan)::bigint,
    SUM(medik)::bigint, SUM(medik_olgan)::bigint,
    SUM(trepanatsiya)::bigint, SUM(trepanatsiya_olgan)::bigint,
    SUM(tlt)::bigint, SUM(tlt_olgan)::bigint,
    SUM(trombo)::bigint, SUM(trombo_olgan)::bigint,
    SUM(tlt_trombo)::bigint, SUM(tlt_trombo_olgan)::bigint,
    SUM(boshqa_endo)::bigint, SUM(otkazildi)::bigint, SUM(boshqa)::bigint
  FROM ins_rows
),
ins_all AS (
  SELECT * FROM ins_rows UNION ALL SELECT * FROM ins_jami
),

-- ==================== HISOBOTDAN TASHQARIDAGILAR ====================
tashqari AS (
  SELECT
    (SELECT COUNT(*) FROM inf_raw WHERE noz = 'BOSHQA')                        AS infarkt_boshqa_nozologiya,
    (SELECT COUNT(*) FROM ins_raw WHERE noz = 'TIA')                           AS insult_tia,
    (SELECT COUNT(*) FROM ins_raw WHERE noz = 'BOSHQA')                        AS insult_boshqa_nozologiya
)

SELECT json_build_object(
  'parametrlar', json_build_object(
    'muassasa', p_muassasa,
    'viloyat',  p_viloyat,
    'from',     p_from,
    'to',       p_to
  ),
  'infarkt', (
    SELECT json_agg(json_build_object(
      'nozologiya',       nozologiya,
      'bemorlar',         bemorlar,
      'amaliyot',         amaliyot,
      'olgan',            olgan,
      'letallik',         CASE WHEN bemorlar > 0 THEN ROUND(olgan * 100.0 / bemorlar, 1) ELSE 0 END,
      'medik',            medik,            'medik_olgan',      medik_olgan,
      'kag',              kag,              'kag_olgan',        kag_olgan,
      'kag_tlbap',        kag_tlbap,        'kag_tlbap_olgan',  kag_tlbap_olgan,
      'kag_stent',        kag_stent,        'kag_stent_olgan',  kag_stent_olgan,
      'kag_aksh',         0,                'kag_aksh_olgan',   0,
      'kag_stent_aksh',   0,                'kag_stent_aksh_olgan', 0,
      'tlt',              tlt,              'tlt_olgan',        tlt_olgan,
      'tlt_toka',         tlt_toka,         'tlt_toka_olgan',   tlt_toka_olgan,
      'tlt_aksh',         0,                'tlt_aksh_olgan',   0,
      'aksh',             0,                'aksh_olgan',       0,
      'nazorat_otkazildi', otkazildi,
      'nazorat_boshqa',    boshqa
    ) ORDER BY ord) FROM inf_all
  ),
  'insult', (
    SELECT json_agg(json_build_object(
      'nozologiya',       nozologiya,
      'bemorlar',         bemorlar,
      'amaliyot',         amaliyot,
      'olgan',            olgan,
      'letallik',         CASE WHEN bemorlar > 0 THEN ROUND(olgan * 100.0 / bemorlar, 1) ELSE 0 END,
      'mskt',             mskt,             'mskt_olgan',       mskt_olgan,
      'mskt_angio',       mskt_angio,       'mskt_angio_olgan', mskt_angio_olgan,
      'medik',            medik,            'medik_olgan',      medik_olgan,
      'trepanatsiya',     trepanatsiya,     'trepanatsiya_olgan', trepanatsiya_olgan,
      'tlt',              tlt,              'tlt_olgan',        tlt_olgan,
      'trombo',           trombo,           'trombo_olgan',     trombo_olgan,
      'tlt_trombo',       tlt_trombo,       'tlt_trombo_olgan', tlt_trombo_olgan,
      'nazorat_boshqa_endo', boshqa_endo,
      'nazorat_otkazildi',   otkazildi,
      'nazorat_boshqa',      boshqa
    ) ORDER BY ord) FROM ins_all
  ),
  'tashqari', (SELECT row_to_json(t) FROM tashqari t)
)
  ) INTO v_result;

  RETURN v_result;
END
$fn$;

GRANT EXECUTE ON FUNCTION public.get_pq20_hisobot(text, text, timestamptz, timestamptz) TO authenticated;

-- ============ TEKSHIRUV ============
-- DIQQAT: funksiyani bu yerdan chaqirmang — SQL Editor'da auth.uid() NULL
-- bo'ladi va "Ruxsat yo'q" xatosi butun tranzaksiyani bekor qiladi.
SELECT p.proname       AS funksiya,
       p.prosecdef     AS security_definer,
       l.lanname       AS til
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language  l ON l.oid = p.prolang
WHERE n.nspname = 'public' AND p.proname = 'get_pq20_hisobot';
