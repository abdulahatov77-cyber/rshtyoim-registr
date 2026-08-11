-- =====================================================================
-- TERAPEVTIK OYNA — viloyat va muassasa kesimida
-- 2026-08-11
--
-- Bemor simptom boshlanganidan qancha vaqt o'tib kasalxonaga kelgan.
-- Manba: simptom_vaqt maydoni.
--
-- MUHIM: maydon ikki formatda saqlangan.
--   2026-06-04 dan keyin  — aniq soat ("3 soat")
--   undan oldin           — oraliq ("0–3 soat ichida")
-- Oraliqli yozuvda haqiqiy vaqt noma'lum (faqat yuqori chegara bilinadi),
-- shuning uchun foizlar FAQAT aniq vaqtli yozuvlar bo'yicha hisoblanadi.
-- `jami` va `aniq` ustunlari yonma-yon turadi — ma'lumot sifati ko'rinib
-- tursin uchun.
--
-- Klinik chegaralar:
--   insult  — trombolizis oynasi 4,5 soat (butun soatda ≤4 deb olinadi)
--   infarkt — birlamchi PCI oynasi 12 soat
-- =====================================================================

drop function if exists public.get_hisobot_oyna(date, date, text, text);

create function public.get_hisobot_oyna(
  p_from date, p_to date,
  p_kasallik text,                 -- 'infarkt' | 'insult'
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, bosqich text,
  jami int, aniq int, nomalum int,
  s0_3 int, s3_6 int, s6_12 int, s12_24 int, s24p int,
  ortacha_soat numeric,
  f4 numeric, f6 numeric, f12 numeric
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
    select i.viloyat as vil, i.muassasa as mua, i.simptom_vaqt as sv, i.qabul_vaqt as qv
    from public.infarkt_qabul i where p_kasallik = 'infarkt'
    union all
    select n.viloyat, n.muassasa, n.simptom_vaqt, n.qabul_vaqt
    from public.insult_qabul n where p_kasallik = 'insult'
  ),
  b as (
    select src.vil, src.mua,
           -- Faqat aniq vaqtli yozuvda soat hisoblanadi
           case when src.sv ~ '^\s*\d+\s*soat\s*$' or src.sv ilike '%24 soatdan%'
                then public.hisobot_oyna_soat(src.sv) end as h
    from src
    where src.qv >= p_from
      and src.qv <  (p_to + 1)
      and (p_viloyat is null or src.vil = p_viloyat)
  )
  select
    b.vil, b.mua,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    count(*)::int,
    count(b.h)::int,
    count(*) filter (where b.h is null)::int,
    count(*) filter (where b.h <= 3)::int,
    count(*) filter (where b.h > 3  and b.h <= 6)::int,
    count(*) filter (where b.h > 6  and b.h <= 12)::int,
    count(*) filter (where b.h > 12 and b.h <= 24)::int,
    count(*) filter (where b.h > 24)::int,
    round(avg(b.h) filter (where b.h <= 24), 1),
    round(100.0 * count(*) filter (where b.h <= 4)  / nullif(count(b.h), 0), 1),
    round(100.0 * count(*) filter (where b.h <= 6)  / nullif(count(b.h), 0), 1),
    round(100.0 * count(*) filter (where b.h <= 12) / nullif(count(b.h), 0), 1)
  from b
  left join public.muassasalar m on m.nomi = b.mua
  where b.vil is not null
  group by b.vil, b.mua, m.mskt_bor, m.angiografiya_bor
  order by b.vil, b.mua;
end $$;

grant execute on function public.get_hisobot_oyna(date, date, text, text) to authenticated;

-- ============ TEKSHIRUV ============
select p.proname as funksiya, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_hisobot_oyna';
