-- Filter-aware snapshot helpers; original analytical definitions retained.
CREATE OR REPLACE FUNCTION public.dashboard_get_age_sex_pyramid(p_viloyat text DEFAULT NULL::text, p_muassasa text DEFAULT NULL::text, p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
 RETURNS TABLE(registr text, yosh_guruhi text, jins text, jami bigint, vafot bigint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  WITH base AS (
    -- INFARKT
    SELECT 
      'infarkt'::text AS reg,
      CASE
        WHEN lower(jins) IN ('erkak','e','m','male') THEN 'male'
        WHEN lower(jins) IN ('ayol','a','f','female') THEN 'female'
        ELSE NULL
      END AS g,
      CASE
        WHEN tugilgan_sana IS NOT NULL AND tugilgan_sana ~ '^\d{4}-\d{2}-\d{2}$' THEN 
          EXTRACT(YEAR FROM AGE(
            COALESCE(qabul_vaqt, NOW())::date, 
            tugilgan_sana::date
          ))::int
        WHEN tugilgan_yil IS NOT NULL AND tugilgan_yil ~ '^\d{4}' THEN 
          EXTRACT(YEAR FROM COALESCE(qabul_vaqt, NOW()))::int 
          - SUBSTRING(tugilgan_yil FROM '^\d{4}')::int
        ELSE NULL
      END AS yosh,
      status
    FROM public.infarkt_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) 
      AND (p_muassasa IS NULL OR muassasa = p_muassasa)
 AND (p_from IS NULL OR qabul_vaqt >= p_from) AND (p_to IS NULL OR qabul_vaqt <= p_to)
      AND (tugilgan_sana IS NOT NULL OR tugilgan_yil IS NOT NULL)
      AND jins IS NOT NULL
    
    UNION ALL
    
    -- INSULT
    SELECT 
      'insult'::text,
      CASE
        WHEN lower(jins) IN ('erkak','e','m','male') THEN 'male'
        WHEN lower(jins) IN ('ayol','a','f','female') THEN 'female'
        ELSE NULL
      END,
      CASE
        WHEN tugilgan_sana IS NOT NULL AND tugilgan_sana ~ '^\d{4}-\d{2}-\d{2}$' THEN 
          EXTRACT(YEAR FROM AGE(
            COALESCE(qabul_vaqt, NOW())::date, 
            tugilgan_sana::date
          ))::int
        WHEN tugilgan_yil IS NOT NULL AND tugilgan_yil ~ '^\d{4}' THEN 
          EXTRACT(YEAR FROM COALESCE(qabul_vaqt, NOW()))::int 
          - SUBSTRING(tugilgan_yil FROM '^\d{4}')::int
        ELSE NULL
      END,
      status
    FROM public.insult_qabul
    WHERE (p_viloyat IS NULL OR viloyat = p_viloyat) 
      AND (p_muassasa IS NULL OR muassasa = p_muassasa)
 AND (p_from IS NULL OR qabul_vaqt >= p_from) AND (p_to IS NULL OR qabul_vaqt <= p_to)
      AND (tugilgan_sana IS NOT NULL OR tugilgan_yil IS NOT NULL)
      AND jins IS NOT NULL
  )
  SELECT 
    reg AS registr,
    CASE
      WHEN yosh <= 29 THEN '≤29'
      WHEN yosh <= 44 THEN '30-44'
      WHEN yosh <= 59 THEN '45-59'
      WHEN yosh <= 74 THEN '60-74'
      ELSE '75+'
    END AS yosh_guruhi,
    g AS jins,
    COUNT(*) AS jami,
    COUNT(*) FILTER (WHERE status = 'vafot') AS vafot
  FROM base
  WHERE yosh IS NOT NULL 
    AND yosh >= 0 
    AND yosh < 130
    AND g IS NOT NULL
  GROUP BY reg, yosh_guruhi, g;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_get_age_sex_pyramid(text,text,timestamptz,timestamptz) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_get_age_sex_pyramid(text,text,timestamptz,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.dashboard_get_demographics(p_viloyat text DEFAULT NULL::text, p_muassasa text DEFAULT NULL::text, p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
DECLARE
  cy int := date_part('year', now())::int;
  result json;
BEGIN
  WITH inf AS (
    SELECT
      jins,
      CASE
        WHEN tugilgan_yil  ~ '^[12][0-9]{3}' THEN left(tugilgan_yil, 4)::int
        WHEN tugilgan_sana ~ '^[12][0-9]{3}' THEN left(tugilgan_sana, 4)::int
        WHEN tugilgan_sana ~ '[12][0-9]{3}$' THEN right(tugilgan_sana, 4)::int
      END AS yr
    FROM public.infarkt_qabul
    WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)
      AND (p_muassasa IS NULL OR muassasa = p_muassasa)
 AND (p_from IS NULL OR qabul_vaqt >= p_from) AND (p_to IS NULL OR qabul_vaqt <= p_to)
  ),
  ins AS (
    SELECT
      jins,
      CASE
        WHEN tugilgan_yil  ~ '^[12][0-9]{3}' THEN left(tugilgan_yil, 4)::int
        WHEN tugilgan_sana ~ '^[12][0-9]{3}' THEN left(tugilgan_sana, 4)::int
        WHEN tugilgan_sana ~ '[12][0-9]{3}$' THEN right(tugilgan_sana, 4)::int
      END AS yr
    FROM public.insult_qabul
    WHERE (p_viloyat  IS NULL OR viloyat  = p_viloyat)
      AND (p_muassasa IS NULL OR muassasa = p_muassasa)
 AND (p_from IS NULL OR qabul_vaqt >= p_from) AND (p_to IS NULL OR qabul_vaqt <= p_to)
  ),
  inf_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE lower(coalesce(jins,'')) IN ('erkak','e','m','male'))   AS male,
      COUNT(*) FILTER (WHERE lower(coalesce(jins,'')) IN ('ayol','a','f','female'))  AS female,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr <= 29)                          AS a1,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr BETWEEN 30 AND 44)              AS a2,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr BETWEEN 45 AND 59)              AS a3,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr BETWEEN 60 AND 74)              AS a4,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr >= 75)                          AS a5
    FROM inf
  ),
  ins_agg AS (
    SELECT
      COUNT(*) FILTER (WHERE lower(coalesce(jins,'')) IN ('erkak','e','m','male'))   AS male,
      COUNT(*) FILTER (WHERE lower(coalesce(jins,'')) IN ('ayol','a','f','female'))  AS female,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr <= 29)                          AS a1,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr BETWEEN 30 AND 44)              AS a2,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr BETWEEN 45 AND 59)              AS a3,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr BETWEEN 60 AND 74)              AS a4,
      COUNT(*) FILTER (WHERE yr IS NOT NULL AND cy-yr >= 75)                          AS a5
    FROM ins
  )
  SELECT json_build_object(
    'infarkt', json_build_object(
      'male',   inf_agg.male,
      'female', inf_agg.female,
      'ages', json_build_object(
        '≤29',   inf_agg.a1,
        '30-44', inf_agg.a2,
        '45-59', inf_agg.a3,
        '60-74', inf_agg.a4,
        '75+',   inf_agg.a5
      )
    ),
    'insult', json_build_object(
      'male',   ins_agg.male,
      'female', ins_agg.female,
      'ages', json_build_object(
        '≤29',   ins_agg.a1,
        '30-44', ins_agg.a2,
        '45-59', ins_agg.a3,
        '60-74', ins_agg.a4,
        '75+',   ins_agg.a5
      )
    )
  )
  INTO result
  FROM inf_agg, ins_agg;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_get_demographics(text,text,timestamptz,timestamptz) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_get_demographics(text,text,timestamptz,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.dashboard_get_risk_factors(p_viloyat text DEFAULT NULL::text, p_muassasa text DEFAULT NULL::text, p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL)
 RETURNS TABLE(registr text, omil text, cnt bigint)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
  WITH inf_u AS (
    SELECT 'infarkt' AS reg, unnest(COALESCE(xavf_omil, ARRAY[]::text[])) AS v
    FROM public.infarkt_qabul WHERE (p_viloyat IS NULL OR viloyat=p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa)
 AND (p_from IS NULL OR qabul_vaqt >= p_from) AND (p_to IS NULL OR qabul_vaqt <= p_to)
  ),
  ins_u AS (
    SELECT 'insult', unnest(COALESCE(xavf_omil, ARRAY[]::text[]))
    FROM public.insult_qabul WHERE (p_viloyat IS NULL OR viloyat=p_viloyat) AND (p_muassasa IS NULL OR muassasa = p_muassasa)
 AND (p_from IS NULL OR qabul_vaqt >= p_from) AND (p_to IS NULL OR qabul_vaqt <= p_to)
  ),
  all_u AS (SELECT * FROM inf_u UNION ALL SELECT * FROM ins_u)
  SELECT reg, trim(v), COUNT(*) FROM all_u WHERE trim(v)<>'' GROUP BY reg, trim(v) ORDER BY reg, COUNT(*) DESC;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_get_risk_factors(text,text,timestamptz,timestamptz) FROM public,anon;
GRANT EXECUTE ON FUNCTION public.dashboard_get_risk_factors(text,text,timestamptz,timestamptz) TO authenticated;

-- One STABLE invocation: cards, flows, regions and sources share an MVCC snapshot.
-- Read-only and caller RLS. No patient records are changed.
create or replace function public.get_dashboard_snapshot(
  p_viloyat text default null, p_muassasa text default null,
  p_today_start timestamptz default null, p_today_end timestamptz default null,
  p_from timestamptz default null, p_to timestamptz default null
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_from>p_to then raise exception 'Invalid date range'; end if;
  with cohort as materialized (
    select 'infarkt' as disease,viloyat,muassasa,murojaat_yoli from public.infarkt_qabul
    where (p_viloyat is null or viloyat=p_viloyat) and (p_muassasa is null or muassasa=p_muassasa)
      and (p_from is null or qabul_vaqt>=p_from) and (p_to is null or qabul_vaqt<=p_to)
    union all
    select 'insult',viloyat,muassasa,murojaat_yoli from public.insult_qabul
    where (p_viloyat is null or viloyat=p_viloyat) and (p_muassasa is null or muassasa=p_muassasa)
      and (p_from is null or qabul_vaqt>=p_from) and (p_to is null or qabul_vaqt<=p_to)
  ), regions as (
    select coalesce(case when p_viloyat is null then viloyat else muassasa end,'Qayd etilmagan') as nom,
      count(*) as jami,count(*) filter(where disease='infarkt') as infarkt_count,
      count(*) filter(where disease='insult') as insult_count from cohort group by 1
  ), sources as (
    select translate(murojaat_yoli,'‘’ʻʼ',repeat(chr(39),4)) as source,
      count(*) filter(where disease='infarkt') as infarkt,
      count(*) filter(where disease='insult') as insult from cohort group by 1
  ) select jsonb_build_object(
    'generatedAt',now(),
    'demographics',public.dashboard_get_demographics(p_viloyat,p_muassasa,p_from,p_to),
    'ageSex',coalesce((select jsonb_agg(to_jsonb(a)) from public.dashboard_get_age_sex_pyramid(p_viloyat,p_muassasa,p_from,p_to) a),'[]'::jsonb),
    'risks',coalesce((select jsonb_agg(to_jsonb(r)) from public.dashboard_get_risk_factors(p_viloyat,p_muassasa,p_from,p_to) r),'[]'::jsonb),
    'stats',public.get_dashboard_stats(p_viloyat,p_muassasa,p_today_start,p_today_end,p_from,p_to),
    'flows',jsonb_build_object(
      'infarkt',public.get_treatment_flow('infarkt',p_viloyat,p_muassasa,p_from,p_to),
      'insult',public.get_treatment_flow('insult',p_viloyat,p_muassasa,p_from,p_to)),
    'regions',coalesce((select jsonb_agg(to_jsonb(r) order by nom) from regions r),'[]'::jsonb),
    'sources',coalesce((select jsonb_agg(to_jsonb(s)) from sources s),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.get_dashboard_snapshot(text,text,timestamptz,timestamptz,timestamptz,timestamptz) from public,anon;
grant execute on function public.get_dashboard_snapshot(text,text,timestamptz,timestamptz,timestamptz,timestamptz) to authenticated;


