-- =====================================================================
-- TERAPEVTIK OYNA v3 — nozologiya kesimida
-- 2026-08-11
--
-- v2 da natija registr darajasida (infarkt / insult) edi. Lekin oyna
-- har bir tashxis uchun boshqacha:
--   STEMI      — birlamchi PCI 12 soat
--   NSTEMI     — shoshilinch reperfuziya yo'q, invaziv strategiya 24–72 soat
--   Ishemik    — TLT 4,5 soat, trombektomiya 24 soatgacha
--   Gemorragik — reperfuziya oynasi yo'q; vaqt qon bosimi nazorati va
--                jarrohlik qarori uchun muhim
--   TIA        — o'tkir oyna yo'q
--
-- Shuning uchun bitta o'rtacha raqam chalg'itadi. Endi har bir muassasa
-- uchun nozologiya bo'yicha alohida qator qaytariladi.
--
-- p_kasallik parametri olib tashlandi — bitta chaqiruvda hammasi keladi.
--
-- Foizlar mantiqi v2 dagidek: "ha / (ha + yo'q)", oraliqli yozuvlar
-- yuqori/quyi chegara bo'yicha aniq javob bersa hisobga olinadi.
-- f24p — 24 soatdan KEYIN kelganlar ulushi (kech murojaat ko'rsatkichi).
-- =====================================================================

drop function if exists public.get_hisobot_oyna(date, date, text, text);
drop function if exists public.get_hisobot_oyna(date, date, text);

create function public.get_hisobot_oyna(
  p_from date, p_to date,
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, bosqich text,
  nozologiya text, tartib int,
  jami int, aniq int, oraliqli int, uyqu int, kiritilmagan int,
  s0_3 int, s3_6 int, s6_12 int, s12_24 int, s24p int,
  ortacha_soat numeric,
  f4 numeric, f6 numeric, f12 numeric, f24p numeric
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
    select i.viloyat as vil, i.muassasa as mua, i.simptom_vaqt as sv, i.qabul_vaqt as qv,
           case
             when i.infarkt_turi ilike '%nstemi%'
               or i.infarkt_turi ilike '%elevatsiyasiz%'      then 'NSTEMI'
             when i.infarkt_turi ilike '%stemi%'
               or i.infarkt_turi ilike '%elevatsiya bilan%'   then 'STEMI'
             when i.infarkt_turi ilike '%miokard%'            then 'AMI'
             else 'Boshqa'
           end as noz,
           case
             when i.infarkt_turi ilike '%nstemi%'
               or i.infarkt_turi ilike '%elevatsiyasiz%'      then 2
             when i.infarkt_turi ilike '%stemi%'
               or i.infarkt_turi ilike '%elevatsiya bilan%'   then 1
             when i.infarkt_turi ilike '%miokard%'            then 3
             else 9
           end as trt
    from public.infarkt_qabul i
    union all
    select n.viloyat, n.muassasa, n.simptom_vaqt, n.qabul_vaqt,
           case
             when n.insult_turi ilike '%tia%'
               or n.insult_turi ilike '%tranzitor%'           then 'TIA'
             when n.insult_turi ilike '%gemorragik%'
               or n.insult_turi ilike '%subaraxnoidal%'       then 'Gemorragik'
             when n.insult_turi ilike '%ishemik%'             then 'Ishemik'
             else 'Boshqa'
           end,
           case
             when n.insult_turi ilike '%tia%'
               or n.insult_turi ilike '%tranzitor%'           then 6
             when n.insult_turi ilike '%gemorragik%'
               or n.insult_turi ilike '%subaraxnoidal%'       then 5
             when n.insult_turi ilike '%ishemik%'             then 4
             else 9
           end
    from public.insult_qabul n
  ),
  b as (
    select src.vil, src.mua, src.noz, src.trt,
           (src.sv ~ '^\s*\d+\s*soat\s*$' or src.sv ~* '24 soatdan')  as f_aniq,
           (src.sv ilike '%ichida%')                                  as f_oraliq,
           (src.sv ilike '%uyqu%')                                    as f_uyqu,
           public.hisobot_oyna_past(src.sv)                           as past,
           public.hisobot_oyna_soat(src.sv)::numeric                  as yuqori
    from src
    where src.qv >= p_from
      and src.qv <  (p_to + 1)
      and (p_viloyat is null or src.vil = p_viloyat)
  ),
  g as (
    select b.*, case when b.f_aniq then b.yuqori end as h from b
  )
  select
    g.vil, g.mua,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    g.noz, g.trt,
    count(*)::int,
    count(*) filter (where g.f_aniq)::int,
    count(*) filter (where g.f_oraliq)::int,
    count(*) filter (where g.f_uyqu)::int,
    count(*) filter (where not g.f_aniq and not g.f_oraliq and not g.f_uyqu)::int,
    count(*) filter (where g.h <= 3)::int,
    count(*) filter (where g.h > 3  and g.h <= 6)::int,
    count(*) filter (where g.h > 6  and g.h <= 12)::int,
    count(*) filter (where g.h > 12 and g.h <= 24)::int,
    count(*) filter (where g.h > 24)::int,
    round(avg(g.h) filter (where g.h <= 24), 1),
    round(100.0 * count(*) filter (where g.yuqori <= 4)
          / nullif(count(*) filter (where g.yuqori <= 4  or g.past >= 4), 0), 1),
    round(100.0 * count(*) filter (where g.yuqori <= 6)
          / nullif(count(*) filter (where g.yuqori <= 6  or g.past >= 6), 0), 1),
    round(100.0 * count(*) filter (where g.yuqori <= 12)
          / nullif(count(*) filter (where g.yuqori <= 12 or g.past >= 12), 0), 1),
    round(100.0 * count(*) filter (where g.past >= 24)
          / nullif(count(*) filter (where g.yuqori <= 24 or g.past >= 24), 0), 1)
  from g
  left join public.muassasalar m on m.nomi = g.mua
  where g.vil is not null and g.noz <> 'Boshqa'
  group by g.vil, g.mua, g.noz, g.trt, m.mskt_bor, m.angiografiya_bor
  order by g.vil, g.mua, g.trt;
end $$;

grant execute on function public.get_hisobot_oyna(date, date, text) to authenticated;

-- ============ TEKSHIRUV ============
select p.proname as funksiya, p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as argumentlar
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_hisobot_oyna';
