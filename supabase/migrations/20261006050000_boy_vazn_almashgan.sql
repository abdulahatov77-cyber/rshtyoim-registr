-- Ma'lumot tuzatish (2026-10-06, bazaga qo'llangan): bo'y va vazn almashib kiritilgan 76 ta yozuv
-- (infarkt 21, insult 55) to'g'rilandi: vazn 130..230 va bo'y 40..99 bo'lsa qiymatlar almashtirildi.
-- Noaniq 48 ta yozuv (infarkt 10, insult 38) o'zgartirilmadi.
-- Eski qiymatlar public.boy_vazn_backup_20261006 da.
-- Qaytarish: UPDATE public.infarkt_qabul q SET boy=b.eski_boy, vazn=b.eski_vazn FROM public.boy_vazn_backup_20261006 b WHERE b.t='infarkt' AND q.id=b.id;
--            (insult uchun ham xuddi shunday, b.t='insult')
CREATE TABLE IF NOT EXISTS public.boy_vazn_backup_20261006 (t text, id uuid, eski_boy int, eski_vazn numeric, PRIMARY KEY (t,id));
ALTER TABLE public.boy_vazn_backup_20261006 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.boy_vazn_backup_20261006 FROM anon, authenticated;
WITH f AS (SELECT id, boy, vazn FROM public.infarkt_qabul WHERE vazn BETWEEN 130 AND 230 AND boy BETWEEN 40 AND 99),
b AS (INSERT INTO public.boy_vazn_backup_20261006 SELECT 'infarkt', id, boy, vazn FROM f ON CONFLICT DO NOTHING RETURNING id)
UPDATE public.infarkt_qabul q SET boy = f.vazn::int, vazn = f.boy FROM f WHERE q.id = f.id;
WITH f AS (SELECT id, boy, vazn FROM public.insult_qabul WHERE vazn BETWEEN 130 AND 230 AND boy BETWEEN 40 AND 99),
b AS (INSERT INTO public.boy_vazn_backup_20261006 SELECT 'insult', id, boy, vazn FROM f ON CONFLICT DO NOTHING RETURNING id)
UPDATE public.insult_qabul q SET boy = f.vazn::int, vazn = f.boy FROM f WHERE q.id = f.id;
