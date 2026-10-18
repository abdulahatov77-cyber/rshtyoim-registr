-- Ma'lumot tuzatish (2026-10-18, bazaga qo'llangan, foydalanuvchi qarori): bo'y maydoniga vazn
-- yozilib qolgan 46 ta bemorda (bo'y 40..99 sm; infarkt 10, insult 36) bo'yga 100 qo'shildi.
-- Natija 159..190 sm. Bu taxminiy tiklash — haqiqiy bo'y bazada yo'q edi.
-- Eski qiymatlar public.boy_100_backup_20261018 da.
-- Qaytarish: UPDATE public.infarkt_qabul q SET boy=b.eski_boy FROM public.boy_100_backup_20261018 b WHERE b.t='infarkt' AND q.id=b.id;
--            (insult uchun ham xuddi shunday, b.t='insult')
CREATE TABLE IF NOT EXISTS public.boy_100_backup_20261018 (t text, id uuid, eski_boy int, PRIMARY KEY (t,id));
ALTER TABLE public.boy_100_backup_20261018 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.boy_100_backup_20261018 FROM anon, authenticated;
WITH f AS (SELECT id, boy FROM public.infarkt_qabul WHERE boy BETWEEN 40 AND 99),
b AS (INSERT INTO public.boy_100_backup_20261018 SELECT 'infarkt', id, boy FROM f ON CONFLICT DO NOTHING RETURNING id)
UPDATE public.infarkt_qabul q SET boy = f.boy + 100 FROM f WHERE q.id = f.id;
WITH f AS (SELECT id, boy FROM public.insult_qabul WHERE boy BETWEEN 40 AND 99),
b AS (INSERT INTO public.boy_100_backup_20261018 SELECT 'insult', id, boy FROM f ON CONFLICT DO NOTHING RETURNING id)
UPDATE public.insult_qabul q SET boy = f.boy + 100 FROM f WHERE q.id = f.id;
