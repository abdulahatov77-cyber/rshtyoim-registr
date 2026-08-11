-- =====================================================================
-- TERAPEVTIK OYNA v4 — foiz emas, SONLAR qaytariladi
-- 2026-08-11
--
-- v3 da RPC tayyor foiz qaytarardi. Yangi talab: katakda avval aniq
-- bemor soni, keyin qavsda foiz ("147 ta (51,6%)"). Shuning uchun RPC
-- endi har bir vaqt chegarasi uchun BEMORLAR SONINI qaytaradi, foizni
-- esa interfeys `son / jami * 100` formulasi bo'yicha o'zi hisoblaydi.
--
--   n4   — <=4 soat ichida kelganlar (klinik jihatdan <=4,5 oynasi;
--          forma soatni butun son bilan so'raydi)
--   n6   — <=6 soat
--   n12  — <=12 soat
--   n24p — 24 soatdan KEYIN kelganlar
--
-- Sanashda oraliqli eski yozuvlar ham qatnashadi: "0–3 soat ichida"
-- yozuvida yuqori chegara 3, ya'ni u <=4, <=6 va <=12 ga ANIQ kiradi.
-- Chegara oraliq ichiga tushib qolsa (masalan "3–6" va <=4) — sanalmaydi.
-- Ya'ni sonlar quyi baho: haqiqiy ko'rsatkich bundan past bo'lishi mumkin emas.
--
-- `vaqtsiz` ustuni — vaqti umuman aniqlanmagan bemorlar (kiritilmagan +
-- uyquda boshlangan). Foiz maxraji `jami` bo'lgani uchun bu son katta
-- bo'lsa foizlar pasayadi — shuning uchun u interfeysda ko'rsatiladi.
-- =====================================================================

drop function if exists public.get_hisobot_oyna(date, date, text);

create function public.get_hisobot_oyna(
  p_from date, p_to date,
  p_viloyat text default null
)
returns table (
  viloyat text, muassasa text, bosqich text,
  nozologiya text, tartib int,
  jami int, aniq int, oraliqli int, uyqu int, kiritilmagan int, vaqtsiz int,
  n4 int, n6 int, n12 int, n24p int,
  ortacha_soat numeric
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
  )
  select
    b.vil, b.mua,
    public.hisobot_bosqich(coalesce(m.mskt_bor,false), coalesce(m.angiografiya_bor,false)),
    b.noz, b.trt,
    count(*)::int,
    count(*) filter (where b.f_aniq)::int,
    count(*) filter (where b.f_oraliq)::int,
    count(*) filter (where b.f_uyqu)::int,
    count(*) filter (where not b.f_aniq and not b.f_oraliq and not b.f_uyqu)::int,
    count(*) filter (where b.yuqori is null)::int,          -- vaqtsiz
    count(*) filter (where b.yuqori <= 4)::int,
    count(*) filter (where b.yuqori <= 6)::int,
    count(*) filter (where b.yuqori <= 12)::int,
    count(*) filter (where b.past  >= 24)::int,
    round(avg(b.yuqori) filter (where b.f_aniq and b.yuqori <= 24), 1)
  from b
  left join public.muassasalar m on m.nomi = b.mua
  where b.vil is not null and b.noz <> 'Boshqa'
  group by b.vil, b.mua, b.noz, b.trt, m.mskt_bor, m.angiografiya_bor
  order by b.vil, b.mua, b.trt;
end $$;

grant execute on function public.get_hisobot_oyna(date, date, text) to authenticated;

-- ============ TEKSHIRUV ============
select p.proname as funksiya, p.prosecdef as security_definer,
       pg_get_function_identity_arguments(p.oid) as argumentlar
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'get_hisobot_oyna';
