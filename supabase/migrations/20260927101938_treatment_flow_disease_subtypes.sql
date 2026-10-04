-- Read-only, RLS-preserving dashboard aggregation. No patient identifiers leave this function.
-- Pure allowlist: never return arbitrary patient-entered text to analytics clients.
create or replace function public.treatment_flow_label(p_value text,p_disease text)
returns text language sql immutable security invoker set search_path = '' as $$
select case
 when nullif(btrim(p_value),'') is null then '__unknown__'
 when lower(p_value) like '%tkazildi%' or lower(p_value) like '%tkazilgan%' then
   case when lower(p_value) like '%mskt%' then '__route_mskt__'
     when lower(p_value) like '%angio%' or lower(p_value) like '%kag%' or lower(p_value) like '%endovask%' then '__route_angio__'
     when lower(p_value) like '%stabillash%' then '__route_stable__'
     when lower(p_value) like '%boshqa sabab%' then '__route_other__'
     else '__route_unknown__' end
 else coalesce((select canonical from (values
('infarkt','konservativ davolash','Medikamentoz davo'),
('infarkt','muolaja bajarilmadi','__not_performed__'),
('insult','medikamentoz davo','Medikamentoz (konservativ) davo'),
('insult','o''tkazilmadi','__not_performed__'),
('insult','muolaja o''tkazilmadi','__not_performed__'),
('insult','faqat цаг','Faqat serebral angiografiya'),
('insult','комбинир (траспир + трэкстр)','Kombinatsiyalangan muolaja: tromboaspiratsiya + tromboekstraksiya'),
('insult','цаг + тромбоэкстракция','Serebral angiografiya + tromboekstraksiya (mexanik trombektomiya)'),
('insult','serebral angiografiya + tlt (trombolizis)','Serebral angiografiya + Trombolitik terapiya (TLT, trombolizis)'),
('insult','цаг + тлт (тромболизис)','Serebral angiografiya + Trombolitik terapiya (TLT, trombolizis)'),
('insult','цаг + тромбоаспирация','Serebral angiografiya + tromboaspiratsiya'),
('insult','neyrojarrohlik amaliyoti (gemorragik insult)','Gemorragik insult bo''yicha jarrohlik amaliyoti'),
('insult','цаг + стентлаш','Serebral angiografiya + stentlash'),
('insult','цаг + тлбап','Serebral angiografiya + transluminal ballon angioplastika (TLBAP)'),
('infarkt','faqat kag (diagnostik koronar angiografiya)','Faqat KAG (diagnostik koronar angiografiya)'),
('infarkt','kag + stentlash (pci)','KAG + stentlash (PCI)'),
('infarkt','kag + ballon angioplastika (tlbap)','KAG + ballon angioplastika (TLBAP)'),
('infarkt','kag + trombolitik terapiya (tlt)','KAG + trombolitik terapiya (TLT)'),
('infarkt','faqat trombolitik terapiya (tlt)','Faqat trombolitik terapiya (TLT)'),
('infarkt','tlt + kag + stentlash (rescue pci)','TLT + KAG + stentlash (Rescue PCI)'),
('infarkt','tlt + kag + ballon angioplastika (rescue tlbap)','TLT + KAG + ballon angioplastika (Rescue TLBAP)'),
('infarkt','medikamentoz davo','Medikamentoz davo'),
('insult','medikamentoz (konservativ) davo','Medikamentoz (konservativ) davo'),
('insult','faqat serebral angiografiya','Faqat serebral angiografiya'),
('insult','serebral angiografiya + trombolitik terapiya (tlt, trombolizis)','Serebral angiografiya + Trombolitik terapiya (TLT, trombolizis)'),
('insult','serebral angiografiya + tromboaspiratsiya','Serebral angiografiya + tromboaspiratsiya'),
('insult','serebral angiografiya + tromboekstraksiya (mexanik trombektomiya)','Serebral angiografiya + tromboekstraksiya (mexanik trombektomiya)'),
('insult','serebral angiografiya + stentlash','Serebral angiografiya + stentlash'),
('insult','serebral angiografiya + transluminal ballon angioplastika (tlbap)','Serebral angiografiya + transluminal ballon angioplastika (TLBAP)'),
('insult','kombinatsiyalangan muolaja: tromboaspiratsiya + tromboekstraksiya','Kombinatsiyalangan muolaja: tromboaspiratsiya + tromboekstraksiya'),
('insult','gemorragik insult bo''yicha jarrohlik amaliyoti','Gemorragik insult bo''yicha jarrohlik amaliyoti'),
('insult','mskt angiografiya','MSKT angiografiya')) as labels(disease,normalized,canonical)
where disease=p_disease and normalized=lower(translate(replace(btrim(p_value),'–','—'),'‘’ʻʼ',repeat(chr(39),4))) limit 1),'__other__') end;
$$;
revoke all on function public.treatment_flow_label(text,text) from public,anon;
grant execute on function public.treatment_flow_label(text,text) to authenticated;
create or replace function public.get_treatment_flow(
  p_disease text, p_viloyat text default null, p_muassasa text default null,
  p_from timestamptz default null, p_to timestamptz default null
) returns jsonb language plpgsql stable security invoker set search_path = '' as $$
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
      public.treatment_flow_label(a.muolaja_turi,p_disease) as initial,
      case when a.key_count>1 and dy.event_count>0 then array['__ambiguous__']::text[]
        else coalesce(dy.steps,array[]::text[]) end as dynamics,
      case lower(translate(coalesce(c.outcome,''),'‘’ʻʼ',repeat(chr(39),4)))
        when 'tuzaldi' then 'Tuzaldi'
        when 'yaxshilanib chiqarildi' then 'Tuzaldi'
        when 'o''zgarishsiz' then 'O''zgarishsiz'
        when 'o''zgarishsiz chiqarildi' then 'O''zgarishsiz'
        when 'reabilitatsiyaga yuborildi' then 'Reabilitatsiyaga yuborildi'
        when 'boshqa shifoxonaga o''tkazildi' then 'Boshqa shifoxonaga o''tkazildi'
        when 'vafot etdi' then 'Vafot etdi'
        when 'yomonlashib chiqarildi' then '__worse__'
        else case when a.status='active' then '__active__'
          when a.status='vafot' then 'Vafot etdi'
          when a.status='otkazildi' then 'Boshqa shifoxonaga o''tkazildi'
          else '__unknown__' end end as outcome,
      case when a.key_count>1 then null else dy.route end as dynamic_route,
      public.treatment_flow_label(a.muolaja_turi,p_disease) as initial_route,
      case when a.key_count=1 then coalesce(dy.routes,array[]::text[]) else array[]::text[] end as routing_events,
      (a.key_count>1)::int as ambiguous,
      coalesce(dy.invalid_count,0) as invalid_count
    from cohort a
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
      routing_events,subtype,count(*) as n,sum(ambiguous) as ambiguous,sum(invalid_count) as invalid_count
    from paths group by 1,2,3,4,5,6
  ) select jsonb_build_object('rows',coalesce(jsonb_agg(to_jsonb(g) order by n desc,initial,dynamics,outcome),'[]'::jsonb),
    'total',coalesce(sum(n),0),'generatedAt',now()) into result from grouped g;
  return result;
end;
$$;
revoke all on function public.get_treatment_flow(text,text,text,timestamptz,timestamptz) from public,anon;
grant execute on function public.get_treatment_flow(text,text,text,timestamptz,timestamptz) to authenticated;


