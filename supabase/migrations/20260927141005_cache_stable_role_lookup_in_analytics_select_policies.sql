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
    SELECT DISTINCT ON (role) id,role FROM public.profiles
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
      EXECUTE 'RESET ROLE';
      payload := payload || jsonb_build_object('visible_row_fingerprints',visibility);
      IF pass=1 THEN
        before_results := jsonb_set(before_results,ARRAY[profile_entry->>'role'],payload);
      ELSIF payload IS DISTINCT FROM before_results->(profile_entry->>'role') THEN
        RAISE EXCEPTION 'Performance migration changed results or visible rows for role %',profile_entry->>'role';
      END IF;
    END LOOP;
    IF pass=1 THEN
      EXECUTE $policy$ALTER POLICY "dm_select_v3" ON public."dinamika_muolajalar" USING ((((select public.get_user_role()) = ANY (ARRAY['super_admin'::text, 'admin'::text, 'rahbar'::text])) OR (EXISTS ( SELECT 1
   FROM infarkt_qabul q
  WHERE ((q.kt_no = dinamika_muolajalar.kt_no) AND (q.viloyat = get_user_viloyat())))) OR (EXISTS ( SELECT 1
   FROM insult_qabul q
  WHERE ((q.kt_no = dinamika_muolajalar.kt_no) AND (q.viloyat = get_user_viloyat()))))))$policy$;
      EXECUTE $policy$ALTER POLICY "inf_chiq_select_v3" ON public."infarkt_chiqarish" USING ((((select public.get_user_role()) = ANY (ARRAY['super_admin'::text, 'admin'::text, 'rahbar'::text])) OR (created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM infarkt_qabul q
  WHERE ((q.kt_no = infarkt_chiqarish.kt_no) AND (q.viloyat = get_user_viloyat()))))))$policy$;
      EXECUTE $policy$ALTER POLICY "ins_chiq_select_v3" ON public."insult_chiqarish" USING ((((select public.get_user_role()) = ANY (ARRAY['super_admin'::text, 'admin'::text, 'rahbar'::text])) OR (created_by = auth.uid()) OR (EXISTS ( SELECT 1
   FROM insult_qabul q
  WHERE ((q.kt_no = insult_chiqarish.kt_no) AND (q.viloyat = get_user_viloyat()))))))$policy$;
    END IF;
  END LOOP;
END
$verify$;
