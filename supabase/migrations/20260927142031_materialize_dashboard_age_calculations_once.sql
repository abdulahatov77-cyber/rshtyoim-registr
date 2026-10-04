SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='60s';
SET LOCAL search_path=public,pg_catalog;
DO $verify$
DECLARE
  profiles_to_test jsonb;
  profile_entry jsonb;
  before_results jsonb := '{}'::jsonb;
  payload jsonb;
  visibility jsonb;
  field_name text;
  pass integer;
BEGIN
  SELECT jsonb_agg(to_jsonb(p)) INTO profiles_to_test FROM (
    SELECT DISTINCT ON (role) id,role,viloyat,muassasa FROM public.profiles
    WHERE role IN ('super_admin','admin','user','rahbar') ORDER BY role,id
  ) p;
  IF jsonb_array_length(profiles_to_test) <> 4 THEN
    RAISE EXCEPTION 'All four representative roles required';
  END IF;
  FOR pass IN 1..2 LOOP
    FOR profile_entry IN SELECT value FROM jsonb_array_elements(profiles_to_test) LOOP
      PERFORM set_config('request.jwt.claim.sub',profile_entry->>'id',true);
      EXECUTE 'SET LOCAL ROLE authenticated';
      SELECT public.get_dashboard_snapshot() INTO payload;
      -- Only normalize unordered collection presentation, never dynamic event order.
      FOREACH field_name IN ARRAY ARRAY['ageSex','risks','regions','sources'] LOOP
        payload := jsonb_set(payload,ARRAY[field_name],
          coalesce((SELECT jsonb_agg(v ORDER BY v) FROM jsonb_array_elements(payload->field_name) v),'[]'::jsonb));
      END LOOP;
      FOREACH field_name IN ARRAY ARRAY['infarkt','insult'] LOOP
        payload := jsonb_set(payload,ARRAY['flows',field_name,'rows'],
          coalesce((SELECT jsonb_agg(v ORDER BY v) FROM jsonb_array_elements(payload->'flows'->field_name->'rows') v),'[]'::jsonb));
      END LOOP;
      SELECT jsonb_build_object(
        'infarkt', (SELECT md5(coalesce(string_agg(id::text,',' ORDER BY id),'')) FROM public.infarkt_chiqarish),
        'insult', (SELECT md5(coalesce(string_agg(id::text,',' ORDER BY id),'')) FROM public.insult_chiqarish),
        'dynamic', (SELECT md5(coalesce(string_agg(id::text,',' ORDER BY id),'')) FROM public.dinamika_muolajalar)
      ) INTO visibility;
      SELECT payload || jsonb_build_object('filtered_helpers',
        (SELECT jsonb_agg(jsonb_build_object('scope',v.label,
          'demo',public.dashboard_get_demographics(v.region,v.facility,v.df,v.dt),
          'ages',(SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY to_jsonb(a)),'[]'::jsonb)
            FROM public.dashboard_get_age_sex_pyramid(v.region,v.facility,v.df,v.dt) a)) ORDER BY v.label)
        FROM (VALUES
          ('year',null::text,null::text,'2025-01-01T00:00:00+05:00'::timestamptz,'2025-12-31T23:59:59.999999+05:00'::timestamptz),
          ('region','Andijon viloyati',null,null,null),
          ('facility',profile_entry->>'viloyat',profile_entry->>'muassasa',null,null),
          ('empty','__no_matching_region__',null,null,null)
        )v(label,region,facility,df,dt))) INTO payload;
      EXECUTE 'RESET ROLE';
      payload := payload || jsonb_build_object('visible_row_fingerprints',visibility);
      IF pass=1 THEN
        before_results := jsonb_set(before_results,ARRAY[profile_entry->>'role'],payload);
      ELSIF payload IS DISTINCT FROM before_results->(profile_entry->>'role') THEN
        RAISE EXCEPTION 'Performance migration changed results or visible rows for role %',profile_entry->>'role';
      END IF;
    END LOOP;
    IF pass=1 THEN
      EXECUTE $helpers$CREATE OR REPLACE FUNCTION public.dashboard_get_age_sex_pyramid(p_viloyat text DEFAULT NULL::text, p_muassasa text DEFAULT NULL::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(registr text, yosh_guruhi text, jins text, jami bigint, vafot bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  WITH base AS MATERIALIZED (
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

CREATE OR REPLACE FUNCTION public.dashboard_get_demographics(p_viloyat text DEFAULT NULL::text, p_muassasa text DEFAULT NULL::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
DECLARE
  cy int := date_part('year', now())::int;
  result json;
BEGIN
  WITH inf AS MATERIALIZED (
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
  ins AS MATERIALIZED (
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
$function$;$helpers$;
    END IF;
  END LOOP;
END
$verify$;
