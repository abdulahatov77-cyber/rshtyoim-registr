-- =====================================================================
-- MUASSASA DARAJASI — 2026-08-03
--
-- Maqsad: marshrutizatsiya tahlilida "qaysi darajadagi muassasadan qaysi
-- darajaga" oqimini o'lchash. Masalan: TTB -> filial (eskalatsiya) yoki
-- filial -> TTB (deeskalatsiya, chiqishdagi qaytarish).
--
-- Darajalar:
--   bosh_markaz     — Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi
--   filial          — RSHTYOIM viloyat filiallari
--   politravma      — politravma markazlari
--   ixtisoslashgan  — kardiologiya markazi, institut klinikalari, ilmiy markazlar
--   shtb            — shahar tibbiyot birlashmasi / shahar shifoxonasi
--   ttb             — tuman tibbiyot birlashmasi
--   boshqa          — qolganlari (qo'lda aniqlanadi)
--
-- TARTIB:
--   1) Shu faylni to'liq ishga tushiring
--   2) Oxiridagi hisobotga qarang — 'boshqa' va NULL qolganlarini
--      "Muassasa imkoniyati" sahifasida qo'lda belgilang
-- =====================================================================

-- ============ 1. USTUN ============
alter table public.muassasalar
  add column if not exists daraja text;

comment on column public.muassasalar.daraja
  is 'Muassasa darajasi — marshrut oqimi tahlili uchun (bosh_markaz/filial/politravma/ixtisoslashgan/shtb/ttb/boshqa)';

-- Faqat ruxsat etilgan qiymatlar
alter table public.muassasalar
  drop constraint if exists muassasalar_daraja_chk;
alter table public.muassasalar
  add constraint muassasalar_daraja_chk check (
    daraja is null or daraja in
      ('bosh_markaz','filial','politravma','ixtisoslashgan','shtb','ttb','boshqa')
  );

create index if not exists idx_muassasalar_daraja
  on public.muassasalar (daraja);

-- ============ 2. AVTOMATIK TASNIF (nom bo'yicha) ============
-- Tartib muhim: eng aniq shablon birinchi, umumiysi oxirida.
-- Faqat daraja hali belgilanmagan qatorlar to'ldiriladi — qo'lda
-- qo'yilgan qiymatlar ustidan yozilmaydi.

-- 2.1 Bosh markaz
update public.muassasalar
   set daraja = 'bosh_markaz'
 where daraja is null
   and nomi ilike '%Respublika Shoshilinch Tibbiy Yordam%'
   and nomi not ilike '%filial%';

-- 2.2 Filiallar
update public.muassasalar
   set daraja = 'filial'
 where daraja is null
   and (nomi ilike '%filial%' or nomi ilike '%RSHTYOIM%' or nomi ilike '%RSHTYoIM%');

-- 2.3 Politravma markazlari
update public.muassasalar
   set daraja = 'politravma'
 where daraja is null
   and nomi ilike '%politravma%';

-- 2.4 Ixtisoslashgan markazlar
update public.muassasalar
   set daraja = 'ixtisoslashgan'
 where daraja is null
   and (nomi ilike '%kardiolog%'
     or nomi ilike '%ilmiy-amaliy%'
     or nomi ilike '%ilmiy amaliy%'
     or nomi ilike '%institut%'
     or nomi ilike '%klinika%'
     or nomi ilike '%dispanser%'
     or nomi ilike '%TDTU%');

-- 2.5 Shahar tibbiyot birlashmalari
update public.muassasalar
   set daraja = 'shtb'
 where daraja is null
   and (nomi ilike '%ShTB%'
     or nomi ilike '%shahar tibbiyot%'
     or nomi ilike '%shahar shifoxona%'
     or nomi ilike '%shaxar%');

-- 2.6 Tuman tibbiyot birlashmalari
update public.muassasalar
   set daraja = 'ttb'
 where daraja is null
   and (nomi ilike '%TTB%'
     or nomi ilike '%tuman tibbiyot%'
     or nomi ilike '%tuman shifoxona%');

-- ============ 3. RPC: ro'yxatga daraja qo'shildi ============
-- Qaytariladigan ustunlar o'zgargani uchun avval o'chiramiz
drop function if exists public.get_muassasalar_filtered(text, text);

create function public.get_muassasalar_filtered(
  p_talab   text default null,   -- null | 'mskt' | 'angiografiya' | 'mskt+angiografiya'
  p_viloyat text default null
)
returns table (
  id bigint,
  nomi text,
  viloyat text,
  mskt_bor boolean,
  angiografiya_bor boolean,
  daraja text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.nomi, m.viloyat, m.mskt_bor, m.angiografiya_bor, m.daraja
  from public.muassasalar m
  where (p_viloyat is null or m.viloyat = p_viloyat)
    and (
      p_talab is null
      or (p_talab = 'mskt'              and m.mskt_bor)
      or (p_talab = 'angiografiya'      and m.angiografiya_bor)
      or (p_talab = 'mskt+angiografiya' and m.mskt_bor and m.angiografiya_bor)
    )
  order by m.viloyat, m.nomi;
$$;

grant execute on function public.get_muassasalar_filtered(text, text) to authenticated;

-- ============ 4. RPC: saqlashga daraja qo'shildi ============
-- p_items: [{"id":12,"mskt":true,"angio":false,"daraja":"ttb"}, ...]
-- daraja kaliti yuborilmasa — eski qiymat saqlanadi.
create or replace function public.set_muassasa_imkoniyat(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role  text;
  v_count integer;
begin
  select role into v_role from public.profiles where id = auth.uid();

  if v_role is distinct from 'super_admin' then
    raise exception 'Ruxsat yo''q: faqat super_admin o''zgartira oladi';
  end if;

  with x as (
    select (e->>'id')::bigint       as id,
           (e->>'mskt')::boolean    as mskt,
           (e->>'angio')::boolean   as angio,
           nullif(e->>'daraja','')  as daraja
    from jsonb_array_elements(p_items) e
  )
  update public.muassasalar m
     set mskt_bor             = x.mskt,
         angiografiya_bor     = x.angio,
         daraja               = coalesce(x.daraja, m.daraja),
         imkoniyat_updated_at = now()
    from x
   where m.id = x.id;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.set_muassasa_imkoniyat(jsonb) to authenticated;

-- ============ 5. HISOBOT ============
-- Qaysi daraja nechta, imkoniyatlari bilan
select coalesce(daraja, '(belgilanmagan)') as daraja,
       count(*)                             as muassasa,
       count(*) filter (where mskt_bor)         as mskt_bor,
       count(*) filter (where angiografiya_bor) as angio_bor
from public.muassasalar
group by 1
order by muassasa desc;

-- Qo'lda belgilash kerak bo'lganlar
select viloyat, nomi
from public.muassasalar
where daraja is null or daraja = 'boshqa'
order by viloyat, nomi;
