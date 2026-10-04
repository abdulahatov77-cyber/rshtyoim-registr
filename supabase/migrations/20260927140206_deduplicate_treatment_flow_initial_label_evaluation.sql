CREATE OR REPLACE FUNCTION public.get_treatment_flow(p_disease text, p_viloyat text DEFAULT NULL::text, p_muassasa text DEFAULT NULL::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_disease not in ('infarkt','insult') then raise exception 'Invalid disease'; end if;
  if p_from > p_to then raise exception 'Invalid date range'; end if;
  with admissions as materialized (
    select id, kt_no, muolaja_turi, qabul_vaqt, status, viloyat, muassasa, infarkt_turi::text as disease_type,
      count(*) over(partition by kt_no) as key_count
    from public.infarkt_qabul where p_disease='infarkt'
    union all
    select id, kt_no, muolaja_turi, qabul_vaqt, status, viloyat, muassasa, insult_turi::text as disease_type,
      count(*) over(partition by kt_no) as key_count
    from public.insult_qabul where p_disease='insult'
  ), cohort as materialized (
    select * from admissions where
      (p_viloyat is null or viloyat=p_viloyat) and
      (p_muassasa is null or muassasa=p_muassasa) and
      (p_from is null or qabul_vaqt>=p_from) and (p_to is null or qabul_vaqt<=p_to)
  ), initial_labels as materialized (
    -- Resolve each distinct label once per invocation; no cross-request cache.
    select raw_label, public.treatment_flow_label(raw_label,p_disease) as label
    from (select distinct coalesce(muolaja_turi,'') as raw_label from cohort) distinct_labels
  ), discharges as (
    select id,infarkt_qabul_id as admission_id,kt_no,chiqish_sana,created_at,
      coalesce(nullif(chiqish_holat,''),natija::text) as outcome
    from public.infarkt_chiqarish where p_disease='infarkt'
    union all
    select id,insult_qabul_id,kt_no,chiqish_sana,created_at,natija
    from public.insult_chiqarish where p_disease='insult'
  ), paths as (
    select case when p_disease='infarkt' then
        case btrim(a.disease_type)
          when 'O''KS ST elevatsiya bilan (STEMI)' then 'STEMI'
          when 'STEMI' then 'STEMI'
          when 'O''KS ST elevatsiyasiz (NSTEMI)' then 'NSTEMI'
          when 'NSTEMI' then 'NSTEMI'
          when 'O''tkir miokard infarkti (AMI)' then 'AMI'
          when 'AMI' then 'AMI'
          else '__subtype_unknown__' end
        else case btrim(a.disease_type)
          when 'Ishemik insult' then 'Ishemik insult'
          when 'Gemorragik insult' then 'Gemorragik insult'
          when 'TIA (Tranzitor ishemik ataka)' then 'TIA'
          when 'TIA' then 'TIA'
          else '__subtype_unknown__' end end as subtype,
      labels.label as initial,
      case when a.key_count>1 and dy.event_count>0 then array['__ambiguous__']::text[]
        else coalesce(dy.steps,array[]::text[]) end as dynamics,
      -- Admission status owns the operational bucket, as in dashboard KPIs.
      case when a.status='active' then '__active__'
        when a.status='vafot' then 'Vafot etdi'
        when a.status='otkazildi' then 'Boshqa shifoxonaga o''tkazildi'
        when a.status='chiqarildi' then case lower(translate(coalesce(c.outcome,''),'‘’ʻʼ',repeat(chr(39),4)))
        when 'tuzaldi' then 'Tuzaldi'
        when 'yaxshilanib chiqarildi' then 'Tuzaldi'
        when 'o''zgarishsiz' then 'O''zgarishsiz'
        when 'o''zgarishsiz chiqarildi' then 'O''zgarishsiz'
        when 'reabilitatsiyaga yuborildi' then 'Reabilitatsiyaga yuborildi'
        when 'yomonlashib chiqarildi' then '__worse__'
        else '__unknown__' end else '__unknown__' end as outcome,
      (case when nullif(c.outcome,'') is null then false
        when lower(c.outcome)='vafot etdi' then a.status<>'vafot'
        when lower(translate(c.outcome,'‘’ʻʼ',repeat(chr(39),4)))='boshqa shifoxonaga o''tkazildi' then a.status<>'otkazildi'
        else a.status<>'chiqarildi' end)::int as status_conflicts,
      case when a.key_count>1 then null else dy.route end as dynamic_route,
      labels.label as initial_route,
      case when a.key_count=1 then coalesce(dy.routes,array[]::text[]) else array[]::text[] end as routing_events,
      (a.key_count>1)::int as ambiguous,
      coalesce(dy.invalid_count,0) as invalid_count
    from cohort a
    join initial_labels labels on labels.raw_label=coalesce(a.muolaja_turi,'')
    left join lateral (
      select * from discharges d where d.admission_id=a.id or
        (d.admission_id is null and a.key_count=1 and d.kt_no=a.kt_no)
      order by (d.admission_id=a.id) desc nulls last,d.chiqish_sana desc nulls last,d.created_at desc,d.id
      limit 1
    ) c on true
    left join lateral (
      select count(*) as event_count,
        array_agg(public.treatment_flow_label(d.muolaja_turi,p_disease) order by d.created_at,d.id)
          filter(where a.key_count=1 and d.created_at is not null
            and (a.qabul_vaqt is null or d.created_at>=a.qabul_vaqt)
            and (c.chiqish_sana is null or d.created_at<=c.chiqish_sana)
            and public.treatment_flow_label(d.muolaja_turi,p_disease) like '__route_%') as routes,
        count(*) filter(where d.created_at is null or d.created_at<a.qabul_vaqt or d.created_at>c.chiqish_sana) as invalid_count,
        array_agg(public.treatment_flow_label(d.muolaja_turi,p_disease) order by d.created_at,d.id)
          filter(where a.key_count=1 and d.created_at is not null
            and (a.qabul_vaqt is null or d.created_at>=a.qabul_vaqt)
            and (c.chiqish_sana is null or d.created_at<=c.chiqish_sana)
            and public.treatment_flow_label(d.muolaja_turi,p_disease) not like '__route_%') as steps,
        (array_agg(public.treatment_flow_label(d.muolaja_turi,p_disease) order by d.created_at desc,d.id desc)
          filter(where d.created_at is not null
            and (a.qabul_vaqt is null or d.created_at>=a.qabul_vaqt)
            and (c.chiqish_sana is null or d.created_at<=c.chiqish_sana)
            and public.treatment_flow_label(d.muolaja_turi,p_disease) like '__route_%'))[1] as route
      from public.dinamika_muolajalar d where d.kt_no=a.kt_no and d.registr_turi=p_disease
    ) dy on true
  ), grouped as (
    select initial,dynamics,outcome,coalesce(dynamic_route,
      case when initial_route like '__route_%' then initial_route end,'__route_unknown__') as route,
      routing_events,subtype,count(*) as n,sum(ambiguous) as ambiguous,sum(invalid_count) as invalid_count,
      sum(status_conflicts) as status_conflicts
    from paths group by 1,2,3,4,5,6
  ) select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(g) order by n desc,initial,dynamics,outcome),'[]'::jsonb),
    'total',coalesce(sum(n),0),'generatedAt',now()) into result from grouped g;
  return result;
end;
$function$
;
