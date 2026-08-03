-- =====================================================================
-- MARSHRUT SAHIFASI UCHUN RPC'LAR — 2026-08-03 (v2)
--
-- Talab: avval muassasa_daraja.sql va v_marshrut VIEW yaratilgan bo'lsin.
--
-- v2 da nima o'zgardi:
--   Funksiyalar security definer qilindi. Sababi — v_marshrut 8000+ qator
--   va uchta jadval ustiga qurilgan; har qatorga RLS shartini qo'llash
--   authenticated roli uchun 8 soniyalik chegaradan oshib ketardi
--   ("canceling statement due to statement timeout").
--   Endi kirish huquqi funksiya ichida OCHIQ tekshiriladi: super_admin,
--   admin va rahbar hamma viloyatni ko'radi, qolganlar faqat o'zinikini.
-- =====================================================================

-- ============ 0. INDEKSLAR ============
create index if not exists idx_transfer_log_kt   on public.transfer_log      (kt_no);
create index if not exists idx_inf_chiq_kt       on public.infarkt_chiqarish (kt_no);
create index if not exists idx_ins_chiq_kt       on public.insult_chiqarish  (kt_no);
create index if not exists idx_inf_qabul_otkaz   on public.infarkt_qabul (status) where status = 'otkazildi';
create index if not exists idx_ins_qabul_otkaz   on public.insult_qabul  (status) where status = 'otkazildi';

-- ============ 1. XULOSA (KPI) ============
drop function if exists public.get_marshrut_xulosa(text, date, date);

create function public.get_marshrut_xulosa(
  p_viloyat text default null,
  p_from    date default null,
  p_to      date default null
)
returns table (
  bosqich           text,
  jami              bigint,
  eskalatsiya       bigint,
  deeskalatsiya     bigint,
  gorizontal        bigint,
  nomalum           bigint,
  imkoniyat_pasaydi bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_vil  text;
begin
  select p.role, p.viloyat into v_role, v_vil
    from public.profiles p where p.id = auth.uid();
  if v_role is null then
    raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi';
  end if;
  -- Viloyat admini va shifokor faqat o'z viloyatini ko'radi
  if v_role not in ('super_admin', 'admin', 'rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  select m.bosqich,
         count(*),
         count(*) filter (where mg.daraja_raqam > md.daraja_raqam),
         count(*) filter (where mg.daraja_raqam < md.daraja_raqam),
         count(*) filter (where mg.daraja_raqam = md.daraja_raqam),
         count(*) filter (where md.id is null or mg.id is null),
         count(*) filter (where (md.mskt_bor and not mg.mskt_bor)
                             or (md.angiografiya_bor and not mg.angiografiya_bor))
  from public.v_marshrut m
  left join public.muassasalar md on md.nomi = m.muassasa_dan
  left join public.muassasalar mg on mg.nomi = m.muassasa_ga
  where (p_viloyat is null or m.viloyat = p_viloyat)
    and (p_from    is null or m.sana >= p_from)
    and (p_to      is null or m.sana <= p_to)
  group by m.bosqich
  order by m.bosqich;
end $$;

grant execute on function public.get_marshrut_xulosa(text, date, date) to authenticated;


-- ============ 2. OQIM MATRITSASI ============
drop function if exists public.get_marshrut_matritsa(text, text, date, date, int);

create function public.get_marshrut_matritsa(
  p_bosqich text default null,     -- null | 'o''tkir' | 'chiqish' | 'reabilitatsiya'
  p_viloyat text default null,
  p_from    date default null,
  p_to      date default null,
  p_limit   int  default 50
)
returns table (
  muassasa_dan text,
  muassasa_ga  text,
  dan_daraja   text,
  ga_daraja    text,
  dan_mskt     boolean,
  ga_mskt      boolean,
  dan_angio    boolean,
  ga_angio     boolean,
  yonalish     text,
  bemorlar     bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_vil  text;
begin
  select p.role, p.viloyat into v_role, v_vil
    from public.profiles p where p.id = auth.uid();
  if v_role is null then
    raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi';
  end if;
  if v_role not in ('super_admin', 'admin', 'rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  select m.muassasa_dan,
         m.muassasa_ga,
         md.daraja,
         mg.daraja,
         md.mskt_bor,
         mg.mskt_bor,
         md.angiografiya_bor,
         mg.angiografiya_bor,
         case when md.id is null or mg.id is null    then 'nomalum'
              when mg.daraja_raqam > md.daraja_raqam then 'eskalatsiya'
              when mg.daraja_raqam < md.daraja_raqam then 'deeskalatsiya'
              else 'gorizontal' end,
         count(*)
  from public.v_marshrut m
  left join public.muassasalar md on md.nomi = m.muassasa_dan
  left join public.muassasalar mg on mg.nomi = m.muassasa_ga
  where (p_bosqich is null or m.bosqich = p_bosqich)
    and (p_viloyat is null or m.viloyat = p_viloyat)
    and (p_from    is null or m.sana >= p_from)
    and (p_to      is null or m.sana <= p_to)
  group by 1,2,3,4,5,6,7,8,9
  order by count(*) desc
  limit greatest(coalesce(p_limit, 50), 1);
end $$;

grant execute on function public.get_marshrut_matritsa(text, text, date, date, int) to authenticated;


-- ============ 3. AUDIT — imkoniyat pasaygan o'tkir marshrutlar ============
drop function if exists public.get_marshrut_audit(text, date, date, int);

create function public.get_marshrut_audit(
  p_viloyat text default null,
  p_from    date default null,
  p_to      date default null,
  p_limit   int  default 200
)
returns table (
  turi         text,
  kt_no        text,
  viloyat      text,
  sana         date,
  sabab        text,
  muassasa_dan text,
  muassasa_ga  text,
  muammo       text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_vil  text;
begin
  select p.role, p.viloyat into v_role, v_vil
    from public.profiles p where p.id = auth.uid();
  if v_role is null then
    raise exception 'Ruxsat yo''q: foydalanuvchi topilmadi';
  end if;
  if v_role not in ('super_admin', 'admin', 'rahbar') then
    p_viloyat := coalesce(v_vil, '__yoq__');
  end if;

  return query
  select m.turi, m.kt_no, m.viloyat, m.sana, m.sabab,
         m.muassasa_dan, m.muassasa_ga,
         btrim(
           case when md.mskt_bor and not mg.mskt_bor
                then 'MSKT yo''qoldi; ' else '' end ||
           case when md.angiografiya_bor and not mg.angiografiya_bor
                then 'angiografiya yo''qoldi; ' else '' end ||
           case when mg.daraja_raqam < md.daraja_raqam
                then 'daraja pasaydi; ' else '' end
         , '; ')
  from public.v_marshrut m
  join public.muassasalar md on md.nomi = m.muassasa_dan
  join public.muassasalar mg on mg.nomi = m.muassasa_ga
  where m.bosqich = 'o''tkir'
    and (p_viloyat is null or m.viloyat = p_viloyat)
    and (p_from    is null or m.sana >= p_from)
    and (p_to      is null or m.sana <= p_to)
    and ( (md.mskt_bor and not mg.mskt_bor)
       or (md.angiografiya_bor and not mg.angiografiya_bor) )
  order by m.sana desc
  limit greatest(coalesce(p_limit, 200), 1);
end $$;

grant execute on function public.get_marshrut_audit(text, date, date, int) to authenticated;


-- ============ 4. TEKSHIRUV ============
select * from public.get_marshrut_xulosa();
