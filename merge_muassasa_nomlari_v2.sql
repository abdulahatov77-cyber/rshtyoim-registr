-- =====================================================================
-- MUASSASA NOMLARINI ETALONGA KELTIRISH v2 (2026-07-28)
--
-- Nima uchun v2: birinchi urinishda `muassasalar` jadvalidagi HAR QANDAY nom
-- etalon deb olingandi. Lekin jadvalda variantlar ham bor edi
-- ("Tuproqqal'a TTB" va "Tuproqqa'la TTB" вЂ” apostrof joyi farq qiladi),
-- shuning uchun birlashtirish qaysi tomonga ketishini bilmay tasodifiy ishladi.
--
-- v2 da YAGONA ETALON вЂ” config.js dagi rasmiy ro'yxat (205 muassasa).
-- Admin panel ham aynan shu ro'yxat bilan solishtiradi, shuning uchun
-- "Viloyatga mos kelmaydi" ogohlantirishi yo'qoladi.
--
-- TARTIB: 1 (preview) -> 2 (birlashtirish) -> 3 (jadval tozalash) -> 4 (qolganlar)
-- =====================================================================

-- Normalizatsiya (apostrof/tirnoq turlari, katta-kichik harf, ortiqcha bo'shliq)
create or replace function public.norm_nom(t text) returns text
language sql immutable as $$
  select btrim(regexp_replace(
           lower(translate(coalesce(t, ''), e'\'`ВґК»КјвЂвЂ™"', '')),
           '\s+', ' ', 'g'));
$$;

-- Etalon ro'yxat (config.js dan, 205 ta)
create or replace view public.v_etalon_muassasa as
select * from (values
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
) as t(nomi, viloyat);

-- ============ 1) PREVIEW вЂ” qaysi nom qaysi etalonga keladi ============
with hammasi as (
  select viloyat, muassasa from public.infarkt_qabul where muassasa is not null
  union all
  select viloyat, muassasa from public.insult_qabul where muassasa is not null
),
notoliq as (
  select h.viloyat, h.muassasa, count(*) as bemor_soni
  from hammasi h
  where not exists (select 1 from public.v_etalon_muassasa e where e.nomi = h.muassasa)
  group by 1, 2
)
select n.viloyat, n.muassasa as hozirgi_nom,
       (select e.nomi from public.v_etalon_muassasa e
        where public.norm_nom(e.nomi) = public.norm_nom(n.muassasa) limit 1) as etalon_nom,
       n.bemor_soni,
       case when exists (select 1 from public.v_etalon_muassasa e
                         where public.norm_nom(e.nomi) = public.norm_nom(n.muassasa))
            then 'вњ… birlashtiriladi' else 'вќЊ qo''lda hal qilinadi' end as holat
from notoliq n
order by 5 desc, 4 desc;

-- ============ 2) BIRLASHTIRISH вЂ” butun blokni bitta Run bilan ============
update public.infarkt_qabul q set muassasa = e.nomi
from public.v_etalon_muassasa e
where q.muassasa is not null and q.muassasa <> e.nomi
  and public.norm_nom(q.muassasa) = public.norm_nom(e.nomi);

update public.insult_qabul q set muassasa = e.nomi
from public.v_etalon_muassasa e
where q.muassasa is not null and q.muassasa <> e.nomi
  and public.norm_nom(q.muassasa) = public.norm_nom(e.nomi);

update public.infarkt_qabul q set otkazilgan_muassasa = e.nomi
from public.v_etalon_muassasa e
where q.otkazilgan_muassasa is not null and q.otkazilgan_muassasa <> e.nomi
  and public.norm_nom(q.otkazilgan_muassasa) = public.norm_nom(e.nomi);

update public.insult_qabul q set otkazilgan_muassasa = e.nomi
from public.v_etalon_muassasa e
where q.otkazilgan_muassasa is not null and q.otkazilgan_muassasa <> e.nomi
  and public.norm_nom(q.otkazilgan_muassasa) = public.norm_nom(e.nomi);

update public.transfer_log t set muassasa_dan = e.nomi
from public.v_etalon_muassasa e
where t.muassasa_dan is not null and t.muassasa_dan <> e.nomi
  and public.norm_nom(t.muassasa_dan) = public.norm_nom(e.nomi);

update public.transfer_log t set muassasa_ga = e.nomi
from public.v_etalon_muassasa e
where t.muassasa_ga is not null and t.muassasa_ga <> e.nomi
  and public.norm_nom(t.muassasa_ga) = public.norm_nom(e.nomi);

-- ============ 3) IMKONIYAT JADVALINI TOZALASH ============
-- Etalon nomning variantlari (masalan "Tuproqqa'la TTB") jadvalda alohida
-- qator bo'lib turibdi вЂ” ularni o'chiramiz, imkoniyat belgilarini etalonga ko'chirib.
update public.muassasalar m
set mskt_bor         = m.mskt_bor or v.mskt_bor,
    angiografiya_bor = m.angiografiya_bor or v.angiografiya_bor,
    imkoniyat_updated_at = now()
from public.muassasalar v, public.v_etalon_muassasa e
where m.nomi = e.nomi
  and v.nomi <> e.nomi
  and public.norm_nom(v.nomi) = public.norm_nom(e.nomi)
  and (v.mskt_bor or v.angiografiya_bor);

delete from public.muassasalar v
using public.v_etalon_muassasa e
where v.nomi <> e.nomi
  and public.norm_nom(v.nomi) = public.norm_nom(e.nomi);

-- Admin paneldagi qo'shimcha ro'yxatdan ham variantlarni olib tashlaymiz
delete from public.muassasa_overrides o
using public.v_etalon_muassasa e
where o.action = 'add' and o.nomi <> e.nomi
  and public.norm_nom(o.nomi) = public.norm_nom(e.nomi);

-- ============ 4) QOLGANLAR вЂ” qo'lda hal qilinadi ============
-- Bu nomlar etalonga hech qanday moslik topmadi (kirillcha, tuman nomi va h.k.)
with hammasi as (
  select viloyat, muassasa from public.infarkt_qabul where muassasa is not null
  union all
  select viloyat, muassasa from public.insult_qabul where muassasa is not null
)
select h.viloyat, h.muassasa as nom, count(*) as bemor_soni
from hammasi h
where not exists (select 1 from public.v_etalon_muassasa e where e.nomi = h.muassasa)
group by 1, 2
order by 3 desc;
