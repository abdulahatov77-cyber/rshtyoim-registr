-- Ma'lumot tuzatish (2026-10-06, bazaga qo'llangan): natijasi vafot emas (Tuzaldi / Reabilitatsiyaga
-- yuborildi), lekin mRS "6 – vafot" bo'lgan 5 ta insult chiqarish varaqasida mRS tozalandi
-- (foydalanuvchi qarori: bemorlar vafot etmagan). Muassasa to'g'ri mRS ni qayta kiritadi.
-- Eski qiymatlar public.mrs6_backup_20261006 da.
-- Qaytarish: UPDATE public.insult_chiqarish c SET mrs_daraja = b.eski_mrs
--            FROM public.mrs6_backup_20261006 b WHERE c.id = b.id;
CREATE TABLE IF NOT EXISTS public.mrs6_backup_20261006 (id uuid PRIMARY KEY, eski_mrs text);
ALTER TABLE public.mrs6_backup_20261006 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mrs6_backup_20261006 FROM anon, authenticated;
WITH f AS (SELECT id, mrs_daraja FROM public.insult_chiqarish WHERE mrs_daraja LIKE '6%' AND natija IS DISTINCT FROM 'Vafot etdi'),
b AS (INSERT INTO public.mrs6_backup_20261006 SELECT id, mrs_daraja FROM f ON CONFLICT DO NOTHING RETURNING id)
UPDATE public.insult_chiqarish c SET mrs_daraja = NULL FROM f WHERE c.id = f.id;
