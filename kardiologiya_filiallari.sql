-- =====================================================================
-- KARDIOLOGIYA MARKAZI FILIALLARINI BARCHA VILOYATLARGA QO'SHISH (2026-07-26)
-- "Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi"
-- filiallari yozilmagan viloyatlarga qo'shiladi va angiografiya belgilanadi.
-- Ham forma ro'yxatiga (muassasa_overrides), ham imkoniyat jadvaliga yoziladi.
-- =====================================================================

-- 1) Yangi filiallar ro'yxati (mavjudlari: Qashqadaryo, Samarqand, Toshkent shahri bosh markaz)
with yangi(viloyat, nomi) as (values
  ('Andijon viloyati',              'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Andijon filiali'),
  ('Buxoro viloyati',               'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Buxoro filiali'),
  ('Farg''ona viloyati',            'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Farg''ona filiali'),
  ('Jizzax viloyati',               'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Jizzax filiali'),
  ('Namangan viloyati',             'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Namangan filiali'),
  ('Navoiy viloyati',               'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Navoiy filiali'),
  ('Qoraqalpog''iston Respublikasi','Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Qoraqalpog''iston filiali'),
  ('Sirdaryo viloyati',             'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Sirdaryo filiali'),
  ('Surxondaryo viloyati',          'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Surxondaryo filiali'),
  ('Toshkent viloyati',             'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Toshkent viloyati filiali'),
  ('Xorazm viloyati',               'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Xorazm filiali')
)
-- Forma ro'yxatiga (Admin Panel -> Muassasalar bilan bir xil mexanizm)
insert into public.muassasa_overrides (viloyat, nomi, action)
select y.viloyat, y.nomi, 'add'
from yangi y
where not exists (
  select 1 from public.muassasa_overrides o
  where o.nomi = y.nomi and o.action = 'add'
);

-- 2) Imkoniyat jadvaliga — angiografiya belgisi bilan
with yangi(viloyat, nomi) as (values
  ('Andijon viloyati',              'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Andijon filiali'),
  ('Buxoro viloyati',               'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Buxoro filiali'),
  ('Farg''ona viloyati',            'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Farg''ona filiali'),
  ('Jizzax viloyati',               'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Jizzax filiali'),
  ('Namangan viloyati',             'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Namangan filiali'),
  ('Navoiy viloyati',               'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Navoiy filiali'),
  ('Qoraqalpog''iston Respublikasi','Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Qoraqalpog''iston filiali'),
  ('Sirdaryo viloyati',             'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Sirdaryo filiali'),
  ('Surxondaryo viloyati',          'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Surxondaryo filiali'),
  ('Toshkent viloyati',             'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Toshkent viloyati filiali'),
  ('Xorazm viloyati',               'Respublika ixtisoslashtirilgan kardiologiya ilmiy-amaliy tibbiyot markazi Xorazm filiali')
)
insert into public.muassasalar (nomi, viloyat, angiografiya_bor, imkoniyat_updated_at)
select y.nomi, y.viloyat, true, now()
from yangi y
on conflict (nomi) do update
  set angiografiya_bor = true, imkoniyat_updated_at = now();

-- 3) Mavjud kardiologiya yozuvlarida ham angiografiya yoqilganiga ishonch
update public.muassasalar
set angiografiya_bor = true, imkoniyat_updated_at = now()
where (nomi ilike '%kardiolog%' or nomi ilike '%кардиолог%')
  and angiografiya_bor = false;

-- 4) Tekshirish — barcha kardiologiya yozuvlari
select viloyat, nomi, mskt_bor, angiografiya_bor
from public.muassasalar
where nomi ilike '%kardiolog%'
order by viloyat;
