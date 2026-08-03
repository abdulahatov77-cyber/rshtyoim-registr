-- =====================================================================
-- MUASSASA DARAJASI — 2026-08-03
--
-- Maqsad: marshrut oqimining YO'NALISHINI o'lchash — bemor pastdan
-- yuqoriga (eskalatsiya) yoki yuqoridan pastga (deeskalatsiya) ketdimi.
--
-- Ierarxiya (daraja_raqam):
--   4  markaz      — Respublika markazlari: RSHTYOIM bosh markazi,
--                    ixtisoslashgan respublika markazlari, institut klinikalari
--   3  filial      — Viloyat darajasi: RSHTYOIM filiallari,
--                    ixtisoslashgan markaz filiallari, viloyat dispanserlari
--   2  politravma  — Politravma markazlari (TTB dan yuqori, filialdan past)
--   1  ttb         — TTB / ShTB, tuman-shahar birlashmalari va qolganlari
--
-- Bu skript qayta-qayta ishga tushirilishi mumkin (idempotent).
-- Oldingi 7 darajali variant ishga tushirilgan bo'lsa — avtomatik ko'chiriladi.
--
-- TARTIB:
--   1) Shu faylni to'liq ishga tushiring
--   2) Oxiridagi hisobotga qarang
--   3) "Muassasa imkoniyati" sahifasida noto'g'ri tasniflanganlarini tuzating
-- =====================================================================

-- ============ 1. USTUN ============
alter table public.muassasalar
  add column if not exists daraja text;

comment on column public.muassasalar.daraja
  is 'Muassasa darajasi: markaz(4) / filial(3) / politravma(2) / ttb(1) — marshrut yo''nalishi tahlili uchun';

-- Eski 7 darajali sxemadan ko'chirish (agar oldingi variant ishga tushirilgan bo'lsa)
update public.muassasalar set daraja = 'markaz' where daraja = 'bosh_markaz';
update public.muassasalar set daraja = 'ttb'    where daraja in ('shtb', 'boshqa');
-- ixtisoslashgan: nomida "filial" bo'lsa viloyat darajasi, aks holda respublika
update public.muassasalar set daraja = 'filial'
 where daraja = 'ixtisoslashgan' and nomi ilike '%filial%';
update public.muassasalar set daraja = 'markaz'
 where daraja = 'ixtisoslashgan';

-- Endi cheklovni qo'yamiz (eski qiymatlar ko'chirilgandan KEYIN)
alter table public.muassasalar
  drop constraint if exists muassasalar_daraja_chk;
alter table public.muassasalar
  add constraint muassasalar_daraja_chk check (
    daraja is null or daraja in ('markaz','filial','politravma','ttb')
  );

-- Ierarxiya raqami — avtomatik hisoblanadi, qo'lda kiritilmaydi
alter table public.muassasalar
  drop column if exists daraja_raqam;
alter table public.muassasalar
  add column daraja_raqam smallint generated always as (
    case daraja
      when 'markaz'     then 4
      when 'filial'     then 3
      when 'politravma' then 2
      when 'ttb'        then 1
    end
  ) stored;

create index if not exists idx_muassasalar_daraja on public.muassasalar (daraja);

-- ============ 2. AVTOMATIK TASNIF (nom bo'yicha) ============
-- Tartib muhim. Faqat daraja belgilanmagan qatorlar to'ldiriladi —
-- qo'lda qo'yilgan qiymatlar ustidan yozilmaydi.

-- 2.1 Filial — birinchi bo'lib, chunki "ixtisoslashgan markaz filiali" ham shu yerga
update public.muassasalar
   set daraja = 'filial'
 where daraja is null
   and (nomi ilike '%filial%' or nomi ilike '%RSHTYOIM%' or nomi ilike '%RSHTYoIM%');

-- 2.2 Politravma markazlari
update public.muassasalar
   set daraja = 'politravma'
 where daraja is null
   and nomi ilike '%politravma%';

-- 2.3 Respublika darajasidagi markazlar
update public.muassasalar
   set daraja = 'markaz'
 where daraja is null
   and (nomi ilike '%Respublika Shoshilinch Tibbiy Yordam%'
     or nomi ilike '%respublika%'
     or nomi ilike '%kardiolog%'
     or nomi ilike '%ilmiy-amaliy%'
     or nomi ilike '%ilmiy amaliy%'
     or nomi ilike '%institut%'
     or nomi ilike '%klinika%'
     or nomi ilike '%TDTU%');

-- 2.4 Viloyat dispanserlari — viloyat darajasi
update public.muassasalar
   set daraja = 'filial'
 where daraja is null
   and (nomi ilike '%dispanser%' or nomi ilike '%viloyat%');

-- 2.5 Qolgan hammasi — tuman/shahar darajasi
update public.muassasalar
   set daraja = 'ttb'
 where daraja is null;

-- ============ 3. RPC: ro'yxatga daraja qo'shildi ============
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
  daraja text,
  daraja_raqam smallint
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.nomi, m.viloyat, m.mskt_bor, m.angiografiya_bor, m.daraja, m.daraja_raqam
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
-- daraja kaliti yuborilmasa yoki bo'sh bo'lsa — eski qiymat saqlanadi.
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
select daraja_raqam,
       coalesce(daraja, '(belgilanmagan)')       as daraja,
       count(*)                                  as muassasa,
       count(*) filter (where mskt_bor)          as mskt_bor,
       count(*) filter (where angiografiya_bor)  as angio_bor
from public.muassasalar
group by 1, 2
order by daraja_raqam desc nulls last;

-- Yuqori darajaga tasniflanganlar — tekshirib chiqish uchun
select daraja, viloyat, nomi
from public.muassasalar
where daraja in ('markaz', 'politravma')
order by daraja, viloyat, nomi;
