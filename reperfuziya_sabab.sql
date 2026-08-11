-- =====================================================================
-- REPERFUZIYA QILINMAGANLIK SABABI
-- 2026-08-11
--
-- Nima uchun kerak:
--   2026-06-05 dan buyon 993 ta ishemik insult bemori trombolizis oynasida
--   (≤4 soat) yetib kelgan. Ulardan 409 tasiga MSKT qilingan, ammo
--   trombolizis atigi 23 tasiga (5,6%) o'tkazilgan.
--   386 ta holatning sababi bazada umuman yozilmagan — shuning uchun
--   nima qilish kerakligi (dori yetkazishmi, o'qitishmi, protokolmi)
--   noma'lum qolyapti.
--
--   Bu ustun shu bo'shliqni yopadi: bemor nomzod bo'lib, muolaja
--   qilinmasa, forma saqlashda sababni so'raydi.
-- =====================================================================

alter table public.infarkt_qabul
  add column if not exists reperfuziya_rad_sababi text;

alter table public.insult_qabul
  add column if not exists reperfuziya_rad_sababi text;

comment on column public.infarkt_qabul.reperfuziya_rad_sababi
  is 'Bemor reperfuziyaga nomzod bo''lib, muolaja qilinmagan bo''lsa — sababi. Formada tanlanadi.';
comment on column public.insult_qabul.reperfuziya_rad_sababi
  is 'Bemor reperfuziyaga nomzod bo''lib, muolaja qilinmagan bo''lsa — sababi. Formada tanlanadi.';

create index if not exists idx_inf_reperf_sabab
  on public.infarkt_qabul (reperfuziya_rad_sababi)
  where reperfuziya_rad_sababi is not null;
create index if not exists idx_ins_reperf_sabab
  on public.insult_qabul (reperfuziya_rad_sababi)
  where reperfuziya_rad_sababi is not null;

-- ============ TEKSHIRUV ============
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name = 'reperfuziya_rad_sababi'
order by table_name;
