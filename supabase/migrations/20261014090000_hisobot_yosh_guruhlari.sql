-- Hisobot: yosh guruhlari bo'yicha infarkt/insult soni (qabul kunidagi yosh).
-- Guruhlar: <30, 30–39, 40–49, 50–59, 60+, noma'lum. Kesim: viloyat yoki muassasa.
-- Ruxsat boshqa hisobot funksiyalari bilan bir xil: super_admin/rahbar — hammasi,
-- admin — o'z viloyati, user — o'z muassasasi. 2026-10-14 da bazaga qo'llangan.
CREATE OR REPLACE FUNCTION public.get_hisobot_yosh(p_from date, p_to date, p_viloyat text DEFAULT NULL, p_muassasa text DEFAULT NULL, p_kesim text DEFAULT 'viloyat')
RETURNS TABLE(viloyat text, muassasa text, tur text, y30 int, y39 int, y49 int, y59 int, y60 int, nomalum int, jami int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare v_role text; v_vil text; v_mua text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('user', 'admin', 'rahbar', 'super_admin') then
    raise exception 'Ruxsat yo''q: akkaunt tasdiqlanmagan';
  end if;
  if v_role not in ('super_admin', 'rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;
  if v_role = 'user' then
    select coalesce(nullif(btrim(p.muassasa), ''), '__yoq__') into v_mua from public.profiles p where p.id = auth.uid();
    p_muassasa := v_mua;
  end if;
  return query
  with q as (
    select 'infarkt'::text t, x.viloyat v, x.muassasa m, x.qabul_vaqt qv, x.tugilgan_sana::text ts, x.tugilgan_yil::text ty from public.infarkt_qabul x
    union all
    select 'insult', x.viloyat, x.muassasa, x.qabul_vaqt, x.tugilgan_sana::text, x.tugilgan_yil::text from public.insult_qabul x),
  f as (
    select q.t, coalesce(nullif(q.v,''), 'Noma''lum') v, coalesce(nullif(q.m,''), 'Noma''lum') m,
      extract(year from age((q.qv at time zone 'Asia/Tashkent')::date,
        coalesce(case when q.ts ~ '^\d{4}-\d\d-\d\d' then substr(q.ts,1,10)::date end,
                 make_date(nullif(substring(coalesce(q.ty, q.ts) from '(19\d\d|20\d\d)'), '')::int, 7, 1))))::int y
    from q
    where (q.qv at time zone 'Asia/Tashkent')::date between p_from and p_to
      and (p_viloyat is null or q.v = p_viloyat)
      and (p_muassasa is null or lower(btrim(coalesce(q.m,''))) = lower(btrim(p_muassasa))))
  select f.v, case when p_kesim = 'muassasa' then f.m else null end, f.t,
    (count(*) filter (where f.y between 0 and 29))::int,
    (count(*) filter (where f.y between 30 and 39))::int,
    (count(*) filter (where f.y between 40 and 49))::int,
    (count(*) filter (where f.y between 50 and 59))::int,
    (count(*) filter (where f.y between 60 and 110))::int,
    (count(*) filter (where f.y is null or f.y < 0 or f.y > 110))::int,
    count(*)::int
  from f
  group by f.v, case when p_kesim = 'muassasa' then f.m else null end, f.t
  order by 1, 2, 3;
end $function$;
REVOKE ALL ON FUNCTION public.get_hisobot_yosh(date, date, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_hisobot_yosh(date, date, text, text, text) TO authenticated;
