-- Hisobot: reperfuziya nega qilinmadi (2026-11-11, bazaga qo'llangan).
-- "Oynada kelgan" ta'rifi formadagi savol bilan bir xil (js/supabase.js reperfuziyaNomzodi):
--   insult  — turi "ishemik" (TIA kirmaydi), simptomdan 4 soatgacha; qilingan = trombolizis/trombektomiya vaqti yoki muolaja nomi
--   infarkt — STEMI (NSTEMI emas), simptomdan 12 soatgacha; qilingan = PCI/TLT vaqti yoki muolaja nomi
-- "Boshqa sabab: izoh" ko'rinishidagi yozuvlar "Boshqa sabab" ga jamlanadi.
-- Har bir (registr, muassasa) uchun: oynada kelgan, qilingan, qilinmagan va sabablar (jsonb).
-- Rol chegarasi boshqa hisobotlar bilan bir xil: super_admin/rahbar — hammasi, admin — o'z viloyati, user — o'z muassasasi.
CREATE OR REPLACE FUNCTION public.get_hisobot_reperfuziya_sabab(p_from date, p_to date, p_viloyat text DEFAULT NULL, p_muassasa text DEFAULT NULL)
RETURNS TABLE(registr text, muassasa text, oynada int, qilingan int, qilinmagan int, sabab jsonb)
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
  with x as (
    select 'insult'::text r, q.muassasa m, q.viloyat v, q.qabul_vaqt qv, q.simptom_vaqt sv, q.reperfuziya_rad_sababi rs, 4 oyna,
           (coalesce(q.insult_turi,'') ~* 'ishemik' and coalesce(q.insult_turi,'') !~* 'tia|tranzitor') tur_ok,
           (q.trombolizis_vaqti is not null or q.trombektomiya_vaqti is not null
             or (coalesce(q.muolaja_turi,'') || ' ' || coalesce(q.dinamika_muolaja_turi,'')) ~* 'tlt|trombolit|trombektomiya|tromboekstr|tromboaspir') ok
    from public.insult_qabul q
    union all
    select 'infarkt', q.muassasa, q.viloyat, q.qabul_vaqt, q.simptom_vaqt, q.reperfuziya_rad_sababi, 12,
           (coalesce(q.infarkt_turi,'') ~* 'stemi' and coalesce(q.infarkt_turi,'') !~* 'nstemi|elevatsiyasiz'),
           (q.pci_vaqt is not null or q.tlt_vaqt is not null
             or (coalesce(q.muolaja_turi,'') || ' ' || coalesce(q.dinamika_muolaja_turi,'')) ~* 'stent|pci|tlt|trombolit')
    from public.infarkt_qabul q),
  f as (
    select x.r, coalesce(nullif(btrim(x.m), ''), 'Qayd etilmagan') m, x.ok,
           case when x.rs ~* '^\s*Boshqa sabab\s*:' then 'Boshqa sabab' else coalesce(nullif(btrim(x.rs), ''), 'Sabab yozilmagan') end s
    from x
    where x.tur_ok
      and (x.qv at time zone 'Asia/Tashkent')::date between p_from and p_to
      and (p_viloyat is null or x.v = p_viloyat)
      and (p_muassasa is null or lower(btrim(coalesce(x.m,''))) = lower(btrim(p_muassasa)))
      and (case when x.sv ~* '24\s*soatdan' then 999
                when x.sv ~ '[–—-]\s*\d+' then (regexp_match(x.sv, '[–—-]\s*(\d+)'))[1]::int
                when x.sv ~* '^\s*\d+\s*soat' then (regexp_match(x.sv, '^\s*(\d+)'))[1]::int end) <= x.oyna),
  sj as (select z.r, z.m, jsonb_object_agg(z.s, z.n) j from (select f.r, f.m, f.s, count(*) n from f where not f.ok group by f.r, f.m, f.s) z group by z.r, z.m)
  select f.r, f.m, count(*)::int, (count(*) filter (where f.ok))::int, (count(*) filter (where not f.ok))::int,
         coalesce((select sj.j from sj where sj.r = f.r and sj.m = f.m), '{}'::jsonb)
  from f group by f.r, f.m order by f.r, count(*) filter (where not f.ok) desc, f.m;
end $function$;
REVOKE ALL ON FUNCTION public.get_hisobot_reperfuziya_sabab(date, date, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_hisobot_reperfuziya_sabab(date, date, text, text) TO authenticated;
