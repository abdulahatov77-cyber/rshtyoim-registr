-- =====================================================================
-- TERAPEVTIK OYNA v2 — oraliqli yozuvlar ham ishlatiladi
-- 2026-08-11
--
-- v1 da oraliqli ("0–3 soat ichida") yozuvlar butunlay tashlab yuborilgan
-- edi. Bu ortiqcha ehtiyotkorlik: oraliqda YUQORI CHEGARA ma'lum.
--
--   "0–3 soat ichida"  + ≤4 oyna  -> ANIQ KIRADI    (3 <= 4)
--   "6–12 soat ichida" + ≤6 oyna  -> ANIQ KIRMAYDI  (6 >= 6)
--   "3–6 soat ichida"  + ≤4 oyna  -> NOANIQ         (3 < 4 < 6)
--
-- Ya'ni har bir chegara uchun yozuv uch holatdan birida bo'ladi: ha, yo'q,
-- noaniq. Foiz "ha / (ha + yo'q)" bo'yicha hisoblanadi — noaniqlari
-- maxrajdan ham chiqariladi. Bu eng halol usul: mavjud ma'lumotning
-- hammasi ishlatiladi, lekin taxmin qilinmaydi.
--
-- Ikkinchi o'zgarish: "Uyquda boshlangan" alohida ustunga chiqarildi.
-- Bu noaniqlik emas, alohida klinik toifa — uyg'onish insulti, tanlash
-- MR (DWI/FLAIR) bo'yicha amalga oshiriladi.
--
-- Taqsimot ustunlari (0–3, 3–6, ...) avvalgidek faqat aniq soatli
-- yozuvlardan tuziladi — oraliqni ularga qo'shsak surat buziladi.
-- =====================================================================

-- ============ Quyi chegara ============
-- "3–6 soat ichida" -> 3 · "5 soat" -> 5 · "24 soatdan ortiq" -> 24
create or replace function public.hisobot_oyna_past(p_txt text)
returns numeric
language sql immutable as $$
  select case
    when p_txt is null                then null
    when p_txt ~* '24 soatdan'        then 24
    when p_txt ~ '^\s*(\d+)\s*[–—-]'  then (substring(p_txt from '^\s*(\d+)\s*[–—-]'))::numeric
    when p_txt ~ '^\s*\d+\s*soat'     then (substring(p_txt from '^\s*(\d+)'))::numeric
    else null
  end;
$$;

grant execute on function public.hisobot_oyna_past(text) to authenticated;


drop function if exists public.get_hisobot_oyna(date, date, text, text);

create function public.get_hisobot_oyna(
  p_from date, p_to date,
  p_kasallik text,                 -- 'infarkt' | 'insult'
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, bosqich text,
  jami int, aniq int, oraliqli int, uyqu int, kiritilmagan int,
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
    select src.vil, src.mua, src.sv,
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
    select b.*,
           -- Aniq soatli yozuvlarda taqsimot uchun soat
           case when b.f_aniq then b.yuqori end as h
    from b
  )
  select
    g.vil, g.mua,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    count(*)::int,
    count(*) filter (where g.f_aniq)::int,
    count(*) filter (where g.f_oraliq)::int,
    count(*) filter (where g.f_uyqu)::int,
    count(*) filter (where not g.f_aniq and not g.f_oraliq and not g.f_uyqu)::int,
    -- Taqsimot — faqat aniq soatli yozuvlar
    count(*) filter (where g.h <= 3)::int,
    count(*) filter (where g.h > 3  and g.h <= 6)::int,
    count(*) filter (where g.h > 6  and g.h <= 12)::int,
    count(*) filter (where g.h > 12 and g.h <= 24)::int,
    count(*) filter (where g.h > 24)::int,
    round(avg(g.h) filter (where g.h <= 24), 1),
    -- Foizlar: ha / (ha + yo'q). Noaniqlar ikkalasidan ham chiqariladi.
    round(100.0 * count(*) filter (where g.yuqori <= 4)
          / nullif(count(*) filter (where g.yuqori <= 4 or g.past >= 4), 0), 1),
    round(100.0 * count(*) filter (where g.yuqori <= 6)
          / nullif(count(*) filter (where g.yuqori <= 6 or g.past >= 6), 0), 1),
    round(100.0 * count(*) filter (where g.yuqori <= 12)
          / nullif(count(*) filter (where g.yuqori <= 12 or g.past >= 12), 0), 1)
  from g
  left join public.muassasalar m on m.nomi = g.mua
  where g.vil is not null
  group by g.vil, g.mua, m.mskt_bor, m.angiografiya_bor
  order by g.vil, g.mua;
end $$;

grant execute on function public.get_hisobot_oyna(date, date, text, text) to authenticated;


-- ============ TEKSHIRUV ============
select p.proname as funksiya, p.prosecdef as security_definer
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_hisobot_oyna', 'hisobot_oyna_past', 'hisobot_oyna_soat')
order by p.proname;
