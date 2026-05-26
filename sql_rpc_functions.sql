-- ============================================================
-- RSHTYOIM Dashboard RPC funksiyalari
-- Supabase SQL Editor da bir marta ishlatish kerak
-- ============================================================

-- 1. get_dashboard_stats — asosiy dashboard statistikasi (bitta RPC)
CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_viloyat   text DEFAULT NULL,
  p_muassasa  text DEFAULT NULL,
  p_today_start text DEFAULT NULL,
  p_today_end   text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    -- Umumiy sonlar
    'jami_infarkt',       (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa)),
    'jami_insult',        (SELECT COUNT(*) FROM insult_qabul  WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa)),
    'aktiv_infarkt',      (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'active'),
    'aktiv_insult',       (SELECT COUNT(*) FROM insult_qabul  WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'active'),
    'vafot_infarkt',      (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'vafot'),
    'vafot_insult',       (SELECT COUNT(*) FROM insult_qabul  WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'vafot'),
    'chiqarildi_infarkt', (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'chiqarildi'),
    'chiqarildi_insult',  (SELECT COUNT(*) FROM insult_qabul  WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'chiqarildi'),
    'otkazildi_infarkt',  (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'otkazildi'),
    'otkazildi_insult',   (SELECT COUNT(*) FROM insult_qabul  WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)  AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'otkazildi'),
    -- Bugungi sonlar
    'bugun_infarkt', (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND qabul_vaqt >= p_today_start::timestamptz AND qabul_vaqt < p_today_end::timestamptz),
    'bugun_insult',  (SELECT COUNT(*) FROM insult_qabul  WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND qabul_vaqt >= p_today_start::timestamptz AND qabul_vaqt < p_today_end::timestamptz),
    -- Kritik bemorlar
    'kritik_infarkt', (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'active' AND killip ILIKE '%III%' OR killip ILIKE '%IV%'),
    'kritik_insult',  (SELECT COUNT(*) FROM insult_qabul  WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND status = 'active' AND nihss_qabul >= 15),
    -- Infarkt klinik taqsimot
    'stemi',              (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%STEMI%' AND infarkt_turi NOT ILIKE '%NSTEMI%'),
    'stemi_davol',        (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%STEMI%' AND infarkt_turi NOT ILIKE '%NSTEMI%' AND status = 'chiqarildi'),
    'stemi_vafot',        (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%STEMI%' AND infarkt_turi NOT ILIKE '%NSTEMI%' AND status = 'vafot'),
    'nstemi',             (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%NSTEMI%'),
    'nstemi_davol',       (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%NSTEMI%' AND status = 'chiqarildi'),
    'nstemi_vafot',       (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%NSTEMI%' AND status = 'vafot'),
    'miokard',            (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%miokard%'),
    'miokard_davol',      (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%miokard%' AND status = 'chiqarildi'),
    'miokard_vafot',      (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND infarkt_turi ILIKE '%miokard%' AND status = 'vafot'),
    'koronar',            (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%KAG%' OR muolaja_turi ILIKE '%koronarangiografiya%')),
    'koronar_davol',      (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%KAG%' OR muolaja_turi ILIKE '%koronarangiografiya%') AND status = 'chiqarildi'),
    'koronar_vafot',      (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%KAG%' OR muolaja_turi ILIKE '%koronarangiografiya%') AND status = 'vafot'),
    'trombolizis',        (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%TLT%' OR muolaja_turi ILIKE '%trombolitik%')),
    'trombolizis_davol',  (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%TLT%' OR muolaja_turi ILIKE '%trombolitik%') AND status = 'chiqarildi'),
    'trombolizis_vafot',  (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%TLT%' OR muolaja_turi ILIKE '%trombolitik%') AND status = 'vafot'),
    'medikamentoz_inf',       (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND muolaja_turi ILIKE '%medikamentoz%'),
    'medikamentoz_inf_davol', (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND muolaja_turi ILIKE '%medikamentoz%' AND status = 'chiqarildi'),
    'medikamentoz_inf_vafot', (SELECT COUNT(*) FROM infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND muolaja_turi ILIKE '%medikamentoz%' AND status = 'vafot'),
    -- Insult klinik taqsimot
    'ishemik',                (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%ishemik%'),
    'ishemik_davol',          (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%ishemik%' AND status = 'chiqarildi'),
    'ishemik_vafot',          (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%ishemik%' AND status = 'vafot'),
    'gemorragik',             (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%gemorragik%'),
    'gemorragik_davol',       (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%gemorragik%' AND status = 'chiqarildi'),
    'gemorragik_vafot',       (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%gemorragik%' AND status = 'vafot'),
    'tia',                    (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%TIA%'),
    'tia_davol',              (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%TIA%' AND status = 'chiqarildi'),
    'tia_vafot',              (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND insult_turi ILIKE '%TIA%' AND status = 'vafot'),
    'mskt',                   (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND muolaja_turi ILIKE '%MSKT%'),
    'mskt_davol',             (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND muolaja_turi ILIKE '%MSKT%' AND status = 'chiqarildi'),
    'mskt_vafot',             (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND muolaja_turi ILIKE '%MSKT%' AND status = 'vafot'),
    'trombektomiya',          (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%trombektom%' OR muolaja_turi ILIKE '%tromboekstraksiya%')),
    'trombektomiya_davol',    (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%trombektom%' OR muolaja_turi ILIKE '%tromboekstraksiya%') AND status = 'chiqarildi'),
    'trombektomiya_vafot',    (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%trombektom%' OR muolaja_turi ILIKE '%tromboekstraksiya%') AND status = 'vafot'),
    'medikamentoz_ins',       (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%medikamentoz%' OR muolaja_turi ILIKE '%konservativ%')),
    'medikamentoz_ins_davol', (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%medikamentoz%' OR muolaja_turi ILIKE '%konservativ%') AND status = 'chiqarildi'),
    'medikamentoz_ins_vafot', (SELECT COUNT(*) FROM insult_qabul WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa) AND (muolaja_turi ILIKE '%medikamentoz%' OR muolaja_turi ILIKE '%konservativ%') AND status = 'vafot')
  ) INTO v_result;
  RETURN v_result;
END;
$$;


-- 2. get_trend_30 — so'nggi 30 kun kunlik dinamikasi (Toshkent UTC+5)
CREATE OR REPLACE FUNCTION get_trend_30(
  p_viloyat  text DEFAULT NULL,
  p_muassasa text DEFAULT NULL
)
RETURNS TABLE(sana text, infarkt_count bigint, insult_count bigint)
LANGUAGE sql STABLE AS $$
  WITH days AS (
    SELECT generate_series(
      (NOW() AT TIME ZONE 'Asia/Tashkent')::date - 29,
      (NOW() AT TIME ZONE 'Asia/Tashkent')::date,
      '1 day'::interval
    )::date AS d
  )
  SELECT
    to_char(d, 'YYYY-MM-DD') AS sana,
    COUNT(DISTINCT i.id) FILTER (WHERE i.id IS NOT NULL) AS infarkt_count,
    COUNT(DISTINCT n.id) FILTER (WHERE n.id IS NOT NULL) AS insult_count
  FROM days
  LEFT JOIN infarkt_qabul i ON
    (i.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date = d
    AND (p_viloyat  IS NULL OR i.viloyat  = p_viloyat)
    AND (p_muassasa IS NULL OR i.muassasa = p_muassasa)
  LEFT JOIN insult_qabul n ON
    (n.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date = d
    AND (p_viloyat  IS NULL OR n.viloyat  = p_viloyat)
    AND (p_muassasa IS NULL OR n.muassasa = p_muassasa)
  GROUP BY d ORDER BY d;
$$;


-- 3. get_trend_12month — so'nggi 12 oy oylik dinamikasi
CREATE OR REPLACE FUNCTION get_trend_12month(
  p_viloyat  text DEFAULT NULL,
  p_muassasa text DEFAULT NULL
)
RETURNS TABLE(oy text, infarkt_count bigint, insult_count bigint)
LANGUAGE sql STABLE AS $$
  WITH months AS (
    SELECT to_char(
      generate_series(
        date_trunc('month', NOW() AT TIME ZONE 'Asia/Tashkent') - '11 months'::interval,
        date_trunc('month', NOW() AT TIME ZONE 'Asia/Tashkent'),
        '1 month'::interval
      ), 'YYYY-MM'
    ) AS m
  )
  SELECT
    m,
    COUNT(DISTINCT i.id) FILTER (WHERE i.id IS NOT NULL) AS infarkt_count,
    COUNT(DISTINCT n.id) FILTER (WHERE n.id IS NOT NULL) AS insult_count
  FROM months
  LEFT JOIN infarkt_qabul i ON
    to_char(i.qabul_vaqt AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM') = m
    AND (p_viloyat  IS NULL OR i.viloyat  = p_viloyat)
    AND (p_muassasa IS NULL OR i.muassasa = p_muassasa)
  LEFT JOIN insult_qabul n ON
    to_char(n.qabul_vaqt AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM') = m
    AND (p_viloyat  IS NULL OR n.viloyat  = p_viloyat)
    AND (p_muassasa IS NULL OR n.muassasa = p_muassasa)
  GROUP BY m ORDER BY m;
$$;


-- 4. get_risk_factors — xavf omillari taqsimoti
CREATE OR REPLACE FUNCTION get_risk_factors(
  p_viloyat  text DEFAULT NULL,
  p_muassasa text DEFAULT NULL
)
RETURNS TABLE(registr text, omil text, cnt bigint)
LANGUAGE sql STABLE AS $$
  WITH inf_unnest AS (
    SELECT 'infarkt' AS reg, unnest(CASE WHEN xavf_omil IS NULL THEN ARRAY[]::text[] ELSE xavf_omil END) AS v
    FROM infarkt_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa)
  ),
  ins_unnest AS (
    SELECT 'insult' AS reg, unnest(CASE WHEN xavf_omil IS NULL THEN ARRAY[]::text[] ELSE xavf_omil END) AS v
    FROM insult_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa)
  ),
  combined AS (SELECT * FROM inf_unnest UNION ALL SELECT * FROM ins_unnest)
  SELECT reg AS registr, trim(v) AS omil, COUNT(*) AS cnt
  FROM combined
  WHERE trim(v) <> ''
  GROUP BY reg, trim(v)
  ORDER BY reg, cnt DESC;
$$;


-- 5. get_gender_mortality — jins bo'yicha vafot ko'rsatkichi
CREATE OR REPLACE FUNCTION get_gender_mortality(
  p_viloyat  text DEFAULT NULL,
  p_muassasa text DEFAULT NULL
)
RETURNS TABLE(registr text, jins text, jami bigint, vafot bigint)
LANGUAGE sql STABLE AS $$
  WITH norm AS (
    SELECT 'infarkt' AS reg,
      CASE
        WHEN lower(jins) IN ('erkak','e','m','male') THEN 'male'
        WHEN lower(jins) IN ('ayol','a','f','female') THEN 'female'
        ELSE NULL
      END AS g,
      status
    FROM infarkt_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa)
    UNION ALL
    SELECT 'insult',
      CASE
        WHEN lower(jins) IN ('erkak','e','m','male') THEN 'male'
        WHEN lower(jins) IN ('ayol','a','f','female') THEN 'female'
        ELSE NULL
      END,
      status
    FROM insult_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa)
  )
  SELECT reg AS registr, g AS jins,
    COUNT(*) AS jami,
    COUNT(*) FILTER (WHERE status = 'vafot') AS vafot
  FROM norm WHERE g IS NOT NULL
  GROUP BY reg, g;
$$;


-- 6. get_age_sex_pyramid — yosh-jins piramidasi
CREATE OR REPLACE FUNCTION get_age_sex_pyramid(
  p_viloyat  text DEFAULT NULL,
  p_muassasa text DEFAULT NULL
)
RETURNS TABLE(registr text, yosh_guruhi text, jins text, jami bigint, vafot bigint)
LANGUAGE sql STABLE AS $$
  WITH base AS (
    SELECT 'infarkt' AS reg, jins, status,
      EXTRACT(YEAR FROM AGE(
        COALESCE(qabul_vaqt, NOW()),
        COALESCE(tugilgan_sana::timestamptz, (tugilgan_yil::text || '-07-01')::date::timestamptz)
      ))::int AS yosh
    FROM infarkt_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa)
      AND (tugilgan_sana IS NOT NULL OR tugilgan_yil IS NOT NULL)
    UNION ALL
    SELECT 'insult', jins, status,
      EXTRACT(YEAR FROM AGE(
        COALESCE(qabul_vaqt, NOW()),
        COALESCE(tugilgan_sana::timestamptz, (tugilgan_yil::text || '-07-01')::date::timestamptz)
      ))::int
    FROM insult_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa)
      AND (tugilgan_sana IS NOT NULL OR tugilgan_yil IS NOT NULL)
  ),
  grouped AS (
    SELECT reg,
      CASE
        WHEN lower(jins) IN ('erkak','e','m','male') THEN 'male'
        WHEN lower(jins) IN ('ayol','a','f','female') THEN 'female'
        ELSE NULL
      END AS g,
      CASE
        WHEN yosh <= 29 THEN '≤29'
        WHEN yosh <= 44 THEN '30-44'
        WHEN yosh <= 59 THEN '45-59'
        WHEN yosh <= 74 THEN '60-74'
        ELSE '75+'
      END AS ag,
      status
    FROM base WHERE yosh IS NOT NULL AND yosh >= 0 AND yosh < 130
  )
  SELECT reg AS registr, ag AS yosh_guruhi, g AS jins,
    COUNT(*) AS jami,
    COUNT(*) FILTER (WHERE status = 'vafot') AS vafot
  FROM grouped WHERE g IS NOT NULL AND ag IS NOT NULL
  GROUP BY reg, ag, g;
$$;


-- 7. get_viloyat_stats — viloyat yoki muassasa bo'yicha taqsimot
CREATE OR REPLACE FUNCTION get_viloyat_stats(
  p_viloyat text DEFAULT NULL
)
RETURNS TABLE(nom text, jami bigint, infarkt_count bigint, insult_count bigint)
LANGUAGE sql STABLE AS $$
  WITH inf AS (
    SELECT CASE WHEN p_viloyat IS NOT NULL THEN muassasa ELSE viloyat END AS nom
    FROM infarkt_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat)
  ),
  ins AS (
    SELECT CASE WHEN p_viloyat IS NOT NULL THEN muassasa ELSE viloyat END AS nom
    FROM insult_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat)
  ),
  combined AS (
    SELECT nom, 1::bigint AS inf_c, 0::bigint AS ins_c FROM inf WHERE nom IS NOT NULL
    UNION ALL
    SELECT nom, 0, 1 FROM ins WHERE nom IS NOT NULL
  )
  SELECT nom, SUM(inf_c + ins_c) AS jami, SUM(inf_c) AS infarkt_count, SUM(ins_c) AS insult_count
  FROM combined
  GROUP BY nom
  HAVING SUM(inf_c + ins_c) > 0
  ORDER BY jami DESC;
$$;


-- Barcha funksiyalarga anon rolga ruxsat berish
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_trend_30        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_trend_12month   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_risk_factors    TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_gender_mortality TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_age_sex_pyramid TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_viloyat_stats   TO anon, authenticated;
