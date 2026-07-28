-- =====================================================================
-- MUASSASA IMKONIYATLARI (MSKT / Angiografiya) вЂ” 2026-07-25
--
-- Maqsad: bemorni tekshiruvga yo'naltirishda faqat kerakli apparat
-- (MSKT yoki angiografiya) mavjud muassasalar ro'yxatda chiqishi.
--
-- Eslatma: bu loyihada muassasalar ilgari faqat frontend config'da
-- edi вЂ” bu skript ularni bazadagi jadvalga ko'chiradi (nomi UNIQUE).
--
-- TARTIB:
--   1) Shu faylning 1-5 bo'limlarini ishga tushiring
--   2) Saytdagi "Muassasa imkoniyati" sahifasida galochkalarni tekshirib/to'ldirib chiqing
--   3) FAQAT SHUNDAN KEYIN 6-bo'limdagi triggerni yoqing
--      (aks holda imkoniyat belgilanmagan muassasalarga o'tkazish rad etiladi!)
-- =====================================================================

-- ============ 1. JADVAL ============
create table if not exists public.muassasalar (
  id                   bigserial primary key,
  nomi                 text not null unique,
  viloyat              text,
  mskt_bor             boolean not null default false,
  angiografiya_bor     boolean not null default false,
  imkoniyat_updated_at timestamptz
);

comment on column public.muassasalar.mskt_bor
  is 'MSKT (KT) apparati mavjud вЂ” marshrutizatsiya filtri uchun';
comment on column public.muassasalar.angiografiya_bor
  is 'Angiografiya (KAG/DSA) mavjud вЂ” marshrutizatsiya filtri uchun';

create index if not exists idx_muassasalar_mskt
  on public.muassasalar (mskt_bor) where mskt_bor;
create index if not exists idx_muassasalar_angio
  on public.muassasalar (angiografiya_bor) where angiografiya_bor;

-- O'qish hammaga (authenticated), yozish faqat RPC orqali
alter table public.muassasalar enable row level security;
drop policy if exists "muassasalar_select" on public.muassasalar;
create policy "muassasalar_select" on public.muassasalar
  for select to authenticated using (true);

-- ============ 2. DASTLABKI RO'YXAT (config.js dan, 205 ta) ============
insert into public.muassasalar (nomi, viloyat) values
  ('RSHTYOIM Andijon filiali', 'Andijon viloyati'),
  ('Andijon ShTB', 'Andijon viloyati'),
  ('Baliqchi TTB', 'Andijon viloyati'),
  ('Buloqboshi TTB', 'Andijon viloyati'),
  ('Bo''ston TTB', 'Andijon viloyati'),
  ('Izboskan TTB', 'Andijon viloyati'),
  ('Jalaquduq TTB', 'Andijon viloyati'),
  ('Marhamat TTB', 'Andijon viloyati'),
  ('Oltinko''l TTB', 'Andijon viloyati'),
  ('Paxtaobod TTB', 'Andijon viloyati'),
  ('Ulug''nor TTB', 'Andijon viloyati'),
  ('Xonobod ShTB', 'Andijon viloyati'),
  ('Xo''jaobod TTB', 'Andijon viloyati'),
  ('Qorasuv ShTB', 'Andijon viloyati'),
  ('Qo''rg''ontepa politravma markazi', 'Andijon viloyati'),
  ('Shahrixon politravma markazi', 'Andijon viloyati'),
  ('Asaka politravma markazi', 'Andijon viloyati'),
  ('RSHTYOIM Buxoro filiali', 'Buxoro viloyati'),
  ('Buxoro TTB', 'Buxoro viloyati'),
  ('Olot TTB', 'Buxoro viloyati'),
  ('Jondor TTB', 'Buxoro viloyati'),
  ('Qorovulbozor TTB', 'Buxoro viloyati'),
  ('Kogon ShTB', 'Buxoro viloyati'),
  ('G''ijduvon TTB', 'Buxoro viloyati'),
  ('Shofirkon TTB', 'Buxoro viloyati'),
  ('Peshku TTB', 'Buxoro viloyati'),
  ('Qorako''l politravma markazi', 'Buxoro viloyati'),
  ('Vobkent politravma markazi', 'Buxoro viloyati'),
  ('Romitan politravma markazi', 'Buxoro viloyati'),
  ('RSHTYOIM Jizzax filiali', 'Jizzax viloyati'),
  ('Arnasoy TTB', 'Jizzax viloyati'),
  ('Baxmal TTB', 'Jizzax viloyati'),
  ('Zarbdor TTB', 'Jizzax viloyati'),
  ('Zafarobod TTB', 'Jizzax viloyati'),
  ('Mirzacho''l TTB', 'Jizzax viloyati'),
  ('Paxtakor TTB', 'Jizzax viloyati'),
  ('Forish TTB', 'Jizzax viloyati'),
  ('Yangiobod TTB', 'Jizzax viloyati'),
  ('Sh. Rashidov TTB', 'Jizzax viloyati'),
  ('Gallaorol politravma markazi', 'Jizzax viloyati'),
  ('Do''stlik politravma markazi', 'Jizzax viloyati'),
  ('Zomin politravma markazi', 'Jizzax viloyati'),
  ('RSHTYOIM Qashqadaryo filiali', 'Qashqadaryo viloyati'),
  ('Qarshi ShTB', 'Qashqadaryo viloyati'),
  ('Qarshi TTB', 'Qashqadaryo viloyati'),
  ('Koson TTB', 'Qashqadaryo viloyati'),
  ('Qamashi TTB', 'Qashqadaryo viloyati'),
  ('Kitob TTB', 'Qashqadaryo viloyati'),
  ('Chiroqchi TTB', 'Qashqadaryo viloyati'),
  ('Yakkabog''-1 TTB', 'Qashqadaryo viloyati'),
  ('Yakkabog''-2 TTB', 'Qashqadaryo viloyati'),
  ('Mirishkor-1 TTB', 'Qashqadaryo viloyati'),
  ('Mirishkor-2 TTB', 'Qashqadaryo viloyati'),
  ('Muborak TTB', 'Qashqadaryo viloyati'),
  ('Nishon TTB', 'Qashqadaryo viloyati'),
  ('Shahrisabz ShTB', 'Qashqadaryo viloyati'),
  ('Dehqonobod TTB', 'Qashqadaryo viloyati'),
  ('Kasbi politravma markazi', 'Qashqadaryo viloyati'),
  ('Shahrisabz politravma markazi', 'Qashqadaryo viloyati'),
  ('G''uzor politravma markazi', 'Qashqadaryo viloyati'),
  ('Ko''kdala politravma markazi', 'Qashqadaryo viloyati'),
  ('RSHTYOIM Navoiy filiali', 'Navoiy viloyati'),
  ('Konimex TTB', 'Navoiy viloyati'),
  ('Karmana TTB', 'Navoiy viloyati'),
  ('Navbahor TTB', 'Navoiy viloyati'),
  ('Nurota TTB', 'Navoiy viloyati'),
  ('Tomdi TTB', 'Navoiy viloyati'),
  ('Uchquduq TTB', 'Navoiy viloyati'),
  ('Zarafshon politravma markazi', 'Navoiy viloyati'),
  ('Qiziltepa politravma markazi', 'Navoiy viloyati'),
  ('Xatirchi politravma markazi', 'Navoiy viloyati'),
  ('RSHTYOIM Namangan filiali', 'Namangan viloyati'),
  ('Namangan ShTB', 'Namangan viloyati'),
  ('Namangan TTB', 'Namangan viloyati'),
  ('Chust TTB', 'Namangan viloyati'),
  ('Norin TTB', 'Namangan viloyati'),
  ('Chortoq TTB', 'Namangan viloyati'),
  ('To''raqo''rg''on TTB', 'Namangan viloyati'),
  ('Kosonsoy TTB', 'Namangan viloyati'),
  ('Uychi TTB', 'Namangan viloyati'),
  ('Mingbuloq TTB', 'Namangan viloyati'),
  ('Pop politravma markazi', 'Namangan viloyati'),
  ('Uchqo''rg''on politravma markazi', 'Namangan viloyati'),
  ('Yangiqo''rg''on politravma markazi', 'Namangan viloyati'),
  ('RSHTYOIM Samarqand filiali', 'Samarqand viloyati'),
  ('Oqdaryo TTB', 'Samarqand viloyati'),
  ('Jomboy TTB', 'Samarqand viloyati'),
  ('Qo''shrabot TTB', 'Samarqand viloyati'),
  ('Narpay TTB', 'Samarqand viloyati'),
  ('Nurobod TTB', 'Samarqand viloyati'),
  ('Payariq TTB', 'Samarqand viloyati'),
  ('Pastdarg''om TTB', 'Samarqand viloyati'),
  ('Samarqand TTB', 'Samarqand viloyati'),
  ('Toyloq TTB', 'Samarqand viloyati'),
  ('Chelak TTB', 'Samarqand viloyati'),
  ('Bulung''ur politravma markazi', 'Samarqand viloyati'),
  ('Urgut politravma markazi', 'Samarqand viloyati'),
  ('Ishtixon politravma markazi', 'Samarqand viloyati'),
  ('Paxtachi politravma markazi', 'Samarqand viloyati'),
  ('Kattaqo''rg''on politravma markazi', 'Samarqand viloyati'),
  ('Kattaqo''rg''on TTB', 'Samarqand viloyati'),
  ('RSHTYOIM Surxondaryo filiali', 'Surxondaryo viloyati'),
  ('Termiz ShTB', 'Surxondaryo viloyati'),
  ('Angor TTB', 'Surxondaryo viloyati'),
  ('Oltinsoy TTB', 'Surxondaryo viloyati'),
  ('Boysun TTB', 'Surxondaryo viloyati'),
  ('Bandixon TTB', 'Surxondaryo viloyati'),
  ('Jarqo''rg''on TTB', 'Surxondaryo viloyati'),
  ('Qiziriq TTB', 'Surxondaryo viloyati'),
  ('Muzrabot TTB', 'Surxondaryo viloyati'),
  ('Uzun TTB', 'Surxondaryo viloyati'),
  ('Sho''rchi TTB', 'Surxondaryo viloyati'),
  ('Denov politravma markazi', 'Surxondaryo viloyati'),
  ('Qumqo''rg''on politravma markazi', 'Surxondaryo viloyati'),
  ('Sariosiyo politravma markazi', 'Surxondaryo viloyati'),
  ('Sherobod politravma markazi', 'Surxondaryo viloyati'),
  ('RSHTYOIM Sirdaryo filiali', 'Sirdaryo viloyati'),
  ('Yangiyer ShTB', 'Sirdaryo viloyati'),
  ('Boyovut TTB', 'Sirdaryo viloyati'),
  ('Sardoba TTB', 'Sirdaryo viloyati'),
  ('Sayxunobod TTB', 'Sirdaryo viloyati'),
  ('Mirzaobod TTB', 'Sirdaryo viloyati'),
  ('Shirin ShTB', 'Sirdaryo viloyati'),
  ('Xovos TTB', 'Sirdaryo viloyati'),
  ('Sirdaryo politravma markazi', 'Sirdaryo viloyati'),
  ('Oq Oltin politravma markazi', 'Sirdaryo viloyati'),
  ('RSHTYOIM Toshkent viloyat filiali', 'Toshkent viloyati'),
  ('Bo''ka TTB', 'Toshkent viloyati'),
  ('Zangiota TTB', 'Toshkent viloyati'),
  ('Qibray TTB', 'Toshkent viloyati'),
  ('Quyichirchiq TTB', 'Toshkent viloyati'),
  ('Nurafshon ShTB', 'Toshkent viloyati'),
  ('Oqqo''rg''on TTB', 'Toshkent viloyati'),
  ('Olmaliq ShTB', 'Toshkent viloyati'),
  ('Ohangaron ShTB', 'Toshkent viloyati'),
  ('Ohangaron TTB', 'Toshkent viloyati'),
  ('Parkent TTB', 'Toshkent viloyati'),
  ('Piskent TTB', 'Toshkent viloyati'),
  ('Toshkent TTB', 'Toshkent viloyati'),
  ('Chirchiq ShTB', 'Toshkent viloyati'),
  ('Yuqorichirchiq TTB', 'Toshkent viloyati'),
  ('Yangiyo''l ShTB', 'Toshkent viloyati'),
  ('Yangiyo''l TTB', 'Toshkent viloyati'),
  ('Angren politravma markazi', 'Toshkent viloyati'),
  ('Bekobod politravma markazi', 'Toshkent viloyati'),
  ('Bo''stonliq politravma markazi', 'Toshkent viloyati'),
  ('Chinoz politravma markazi', 'Toshkent viloyati'),
  ('RSHTYOIM Farg''ona filiali', 'Farg''ona viloyati'),
  ('Marg''ilon ShTB', 'Farg''ona viloyati'),
  ('Quvasoy ShTB', 'Farg''ona viloyati'),
  ('Oltiariq TTB', 'Farg''ona viloyati'),
  ('Farg''ona TTB', 'Farg''ona viloyati'),
  ('Qo''shtepa TTB', 'Farg''ona viloyati'),
  ('Toshloq TTB', 'Farg''ona viloyati'),
  ('Rishton TTB', 'Farg''ona viloyati'),
  ('Buvayda TTB', 'Farg''ona viloyati'),
  ('Uchko''prik TTB', 'Farg''ona viloyati'),
  ('Dang''ara TTB', 'Farg''ona viloyati'),
  ('Furqat TTB', 'Farg''ona viloyati'),
  ('O''zbekiston TTB', 'Farg''ona viloyati'),
  ('Beshariq TTB', 'Farg''ona viloyati'),
  ('So''x TTB', 'Farg''ona viloyati'),
  ('Qo''qon politravma markazi', 'Farg''ona viloyati'),
  ('Bog''dod politravma markazi', 'Farg''ona viloyati'),
  ('Yozyovon politravma markazi', 'Farg''ona viloyati'),
  ('Quva politravma markazi', 'Farg''ona viloyati'),
  ('RSHTYOIM Xorazm filiali', 'Xorazm viloyati'),
  ('Urganch TTB', 'Xorazm viloyati'),
  ('Tuproqqal''a TTB', 'Xorazm viloyati'),
  ('Bog''ot TTB', 'Xorazm viloyati'),
  ('Qo''shko''pir TTB', 'Xorazm viloyati'),
  ('Xonqa TTB', 'Xorazm viloyati'),
  ('Xiva TTB', 'Xorazm viloyati'),
  ('Shovot TTB', 'Xorazm viloyati'),
  ('Yangiariq TTB', 'Xorazm viloyati'),
  ('Yangibozor TTB', 'Xorazm viloyati'),
  ('Gurlan politravma markazi', 'Xorazm viloyati'),
  ('Xazorasp politravma markazi', 'Xorazm viloyati'),
  ('Xiva politravma markazi', 'Xorazm viloyati'),
  ('RSHTYOIM Qoraqalpog''iston filiali', 'Qoraqalpog''iston Respublikasi'),
  ('Nukus TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Amudaryo TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Beruniy TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Bo''zatov TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Kegeyli TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Qanliko''l TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Qorao''zak TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Mo''ynoq TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Taxiatosh TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Taxtako''pir TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Shumanay TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Ellikqal''a TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Xo''jayli TTB', 'Qoraqalpog''iston Respublikasi'),
  ('Qo''ng''irot politravma markazi', 'Qoraqalpog''iston Respublikasi'),
  ('Chimboy politravma markazi', 'Qoraqalpog''iston Respublikasi'),
  ('To''rtko''l politravma markazi', 'Qoraqalpog''iston Respublikasi'),
  ('Respublika Shoshilinch Tibbiy Yordam Ilmiy Markazi', 'Toshkent shahri'),
  ('1-sonli Respublika Klinik Shifoxonasi', 'Toshkent shahri'),
  ('Shahar Tez Tibbiy Yordam Klinik Shifoxonasi', 'Toshkent shahri'),
  ('1-sonli Shahar Klinik Shifoxonasi', 'Toshkent shahri'),
  ('4-sonli Shahar Klinik Shifoxonasi', 'Toshkent shahri'),
  ('7-sonli Shahar Klinik Shifoxonasi', 'Toshkent shahri'),
  ('TDTU 1-sonli klinikasi', 'Toshkent shahri'),
  ('TDTU 2-sonli klinikasi', 'Toshkent shahri'),
  ('TDTU 3-sonli klinikasi', 'Toshkent shahri')
on conflict (nomi) do nothing;

-- Bazada allaqachon ishlatilgan, lekin config ro'yxatida yo'q nomlarni ham qo'shamiz
insert into public.muassasalar (nomi, viloyat)
select distinct q.muassasa, q.viloyat
from (
  select muassasa, viloyat from public.infarkt_qabul where muassasa is not null
  union
  select muassasa, viloyat from public.insult_qabul where muassasa is not null
) q
on conflict (nomi) do nothing;

-- ============ 3. FILTRLANGAN RO'YXAT RPC ============
create or replace function public.get_muassasalar_filtered(
  p_talab   text default null,   -- null | 'mskt' | 'angiografiya' | 'mskt+angiografiya'
  p_viloyat text default null
)
returns table (
  id bigint,
  nomi text,
  viloyat text,
  mskt_bor boolean,
  angiografiya_bor boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select m.id, m.nomi, m.viloyat, m.mskt_bor, m.angiografiya_bor
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

-- ============ 4. ADMIN SAQLASH RPC (faqat super_admin) ============
-- p_items: [{"id":12,"mskt":true,"angio":false}, ...]
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
    select (e->>'id')::bigint     as id,
           (e->>'mskt')::boolean  as mskt,
           (e->>'angio')::boolean as angio
    from jsonb_array_elements(p_items) e
  )
  update public.muassasalar m
     set mskt_bor             = x.mskt,
         angiografiya_bor     = x.angio,
         imkoniyat_updated_at = now()
    from x
   where m.id = x.id;

  get diagnostics v_count = row_count;
  return v_count;
end $$;

grant execute on function public.set_muassasa_imkoniyat(jsonb) to authenticated;

-- ============ 5. DASTLABKI TO'LDIRISH ============
-- Angiografiya: RSHTYOIM filiallari + kardiologiya markazlari
update public.muassasalar
set angiografiya_bor = true, imkoniyat_updated_at = now()
where nomi ilike '%RSHTYOIM%'
   or nomi ilike '%Р РЁРўРЃРРњ%'
   or nomi ilike '%kardiolog%'
   or nomi ilike '%РєР°СЂРґРёРѕР»РѕРі%';

-- MSKT: politravma markazlari
update public.muassasalar
set mskt_bor = true, imkoniyat_updated_at = now()
where nomi ilike '%politravma%' or nomi ilike '%РїРѕР»РёС‚СЂР°РІРјР°%';

-- Natijani ko'rish
select viloyat, nomi, mskt_bor, angiografiya_bor
from public.muassasalar
where mskt_bor or angiografiya_bor
order by viloyat, nomi;

-- =====================================================================
-- 6. SERVER HIMOYASI (TRIGGER) вЂ” FAQAT GALOCHKALAR TO'LDIRILGACH YOQING!
--    Quyidagi blokni belgilab, kommentdan chiqarib ishga tushiring.
--    O'tkazish sababi (otkazish_sababi/muolaja_turi) MSKT yoki
--    angiografiya/KAG/endovaskulyar so'zini o'z ichiga olsa вЂ”
--    tanlangan muassasada shu imkoniyat bo'lishi tekshiriladi.
--    Muassasa jadvalda topilmasa (qo'lda kiritilgan nom) вЂ” bloklamaydi.
-- =====================================================================
/*
create or replace function public.trg_otkazish_imkoniyat_check()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_mskt  boolean;
  v_angio boolean;
  v_sabab text;
begin
  if new.otkazilgan_muassasa is null or new.otkazilgan_muassasa = '' then
    return new;
  end if;
  -- Faqat otkazilgan_muassasa YANGI qiymat olganda tekshiramiz
  if tg_op = 'UPDATE' and new.otkazilgan_muassasa is not distinct from old.otkazilgan_muassasa then
    return new;
  end if;

  select mskt_bor, angiografiya_bor into v_mskt, v_angio
  from public.muassasalar where nomi = new.otkazilgan_muassasa;

  if not found then
    return new; -- qo'lda kiritilgan/ro'yxatda yo'q muassasa вЂ” bloklamaymiz
  end if;

  -- MUHIM: otkazish_sababi faqat infarkt_qabul da bor. PL/pgSQL da NEW.<ustun>
  -- ni to'g'ridan-to'g'ri o'qish CASE ichida bo'lsa ham xato beradi
  -- (record "new" has no field ...) — shuning uchun jsonb orqali o'qiymiz.
  v_sabab := coalesce(to_jsonb(new)->>'otkazish_sababi', new.muolaja_turi, '');

  if v_sabab ilike '%MSKT%' and coalesce(v_mskt, false) = false then
    raise exception 'Tanlangan muassasada MSKT mavjud emas: %', new.otkazilgan_muassasa;
  end if;

  if (v_sabab ilike '%angiograf%' or v_sabab ilike '%KAG%' or v_sabab ilike '%endovaskul%')
     and coalesce(v_angio, false) = false then
    raise exception 'Tanlangan muassasada angiografiya mavjud emas: %', new.otkazilgan_muassasa;
  end if;

  return new;
end $fn$;

drop trigger if exists otkazish_imkoniyat_check on public.infarkt_qabul;
create trigger otkazish_imkoniyat_check
before insert or update on public.infarkt_qabul
for each row execute function public.trg_otkazish_imkoniyat_check();

drop trigger if exists otkazish_imkoniyat_check on public.insult_qabul;
create trigger otkazish_imkoniyat_check
before insert or update on public.insult_qabul
for each row execute function public.trg_otkazish_imkoniyat_check();
*/
