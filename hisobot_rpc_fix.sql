-- =====================================================================
-- TUZATISH: column reference "viloyat" is ambiguous
-- 2026-08-07
--
-- Sabab: get_hisobot_marshrut_muassasa ichidagi `union all` subquery'sida
-- ustunlar alias'siz yozilgan edi (`select viloyat, muassasa, ... from
-- infarkt_qabul`). `viloyat` esa RETURNS TABLE da e'lon qilingan ustun
-- nomi — plpgsql uni o'zgaruvchi deb ham ko'radi va to'qnashuv chiqadi.
--
-- Yechim: barcha ustunlarga alias qo'yildi + `#variable_conflict use_column`
-- direktivasi qo'shildi (nom to'qnashsa ustun ustunlik qiladi).
--
-- Faqat shu bitta funksiya qayta yaratiladi, qolgan to'rttasiga tegilmaydi.
-- =====================================================================

drop function if exists public.get_hisobot_marshrut_muassasa(date, date, text, text);

create function public.get_hisobot_marshrut_muassasa(
  p_from date, p_to date,
  p_kasallik text,                 -- 'infarkt' | 'insult'
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, bosqich text, jami int,
  oz_hududidan int, boshqadan_qabul int,
  ozida_davolangan int, yub_1bosqich int, yub_filial int, yub_kardio int,
  yub_bosh int, yub_boshqa_viloyat int, yub_royxatdan_tashqari int,
  jami_yuborilgan int, yuborish_foiz numeric,
  fokus_bemor int, fokus_yetkazilgan int, yetkazish_foiz numeric,
  nazorat text
)
language plpgsql stable security definer
set search_path = public
as $$
#variable_conflict use_column
declare v_role text; v_vil text;
begin
  select p.role, p.viloyat into v_role, v_vil from public.profiles p where p.id = auth.uid();
  if v_role is null then raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi'; end if;
  if v_role not in ('super_admin','admin','rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  with src as (
    select i.viloyat            as vil,
           i.muassasa           as mua,
           i.murojaat_yoli      as murojaat,
           i.otkazilgan_muassasa as manzil,
           (i.infarkt_turi ilike '%stemi%'
            and i.infarkt_turi not ilike '%nstemi%'
            and i.infarkt_turi not ilike '%elevatsiyasiz%') as fokus,
           i.qabul_vaqt         as vaqt
    from public.infarkt_qabul i
    where p_kasallik = 'infarkt'
    union all
    select n.viloyat, n.muassasa, n.murojaat_yoli, n.otkazilgan_muassasa,
           (n.insult_turi ilike '%ishemik%'),
           n.qabul_vaqt
    from public.insult_qabul n
    where p_kasallik = 'insult'
  ),
  b as (
    select src.*
    from src
    where src.vaqt >= p_from
      and src.vaqt <  (p_to + 1)
      and (p_viloyat is null or src.vil = p_viloyat)
  ),
  g as (
    select b.*,
           case
             when coalesce(b.manzil,'') = ''                   then 'ozida'
             when mg.id is null                                then 'royxatdan_tashqari'
             when mg.nomi ilike '%kardiolog%'                  then 'kardio'
             when mg.daraja = 'markaz'                         then 'bosh'
             when mg.daraja = 'filial'                         then 'filial'
             when mg.viloyat is distinct from b.vil            then 'boshqa_viloyat'
             else 'bosqich1'
           end as yub,
           coalesce(mg.angiografiya_bor, false) as manzilda_angio
    from b
    left join public.muassasalar mg on mg.nomi = b.manzil
  )
  select
    g.vil, g.mua,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    count(*)::int,
    count(*) filter (where g.murojaat is null
                        or g.murojaat not ilike '%boshqa muassasa%')::int,
    count(*) filter (where g.murojaat ilike '%boshqa muassasa%')::int,
    count(*) filter (where g.yub = 'ozida')::int,
    count(*) filter (where g.yub = 'bosqich1')::int,
    count(*) filter (where g.yub = 'filial')::int,
    count(*) filter (where g.yub = 'kardio')::int,
    count(*) filter (where g.yub = 'bosh')::int,
    count(*) filter (where g.yub = 'boshqa_viloyat')::int,
    count(*) filter (where g.yub = 'royxatdan_tashqari')::int,
    count(*) filter (where g.yub <> 'ozida')::int,
    round(100.0 * count(*) filter (where g.yub <> 'ozida') / nullif(count(*), 0), 1),
    count(*) filter (where g.fokus)::int,
    count(*) filter (where g.fokus and g.manzilda_angio)::int,
    round(100.0 * count(*) filter (where g.fokus and g.manzilda_angio)
          / nullif(count(*) filter (where g.fokus), 0), 1),
    case when count(*) = count(*) filter (where g.yub = 'ozida')
                       + count(*) filter (where g.yub <> 'ozida')
         then 'OK' else '⚠' end
  from g
  left join public.muassasalar m on m.nomi = g.mua
  group by g.vil, g.mua, m.mskt_bor, m.angiografiya_bor
  order by g.vil, g.mua;
end $$;

grant execute on function public.get_hisobot_marshrut_muassasa(date, date, text, text) to authenticated;

-- ============ TEKSHIRUV ============
select p.proname as funksiya, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname like 'get_hisobot%'
order by p.proname;
