-- Ma'lumot tuzatish (2026-10-05, bazaga qo'llangan).
-- 1) Vafot etgan, lekin chiqarish varaqasi yo'q 10 bemorga varaqa yaratildi (infarkt 1, insult 9):
--    natija "Vafot etdi", insultda mRS 6. Sana — qabul yozuvi oxirgi o'zgartirilgan vaqt (taxminiy);
--    izohda "Avtomatik to'ldirildi" belgisi bor. Chiqarilgan 1 155 bemorga tegilmadi (natijani
--    faqat muassasa kasallik tarixidan biladi).
-- 2) Vafot etgan 21 insult bemorida mRS 0–5 yozilgan edi — hammasi 6 ga to'g'rilandi.
--    Eski qiymatlar public.mrs_backup_20261005 jadvalida (id, kt_no, eski_mrs, yangi_mrs).
--    Qaytarish: UPDATE public.insult_chiqarish c SET mrs_daraja = b.eski_mrs
--               FROM public.mrs_backup_20261005 b WHERE c.id = b.id;
-- Qolgan, avtomatik tuzatilmagan: mRS 6 yozilgan, lekin vafot etmagan 5 bemor (3 Tuzaldi, 2 Reabilitatsiya).

INSERT INTO public.infarkt_chiqarish (kt_no, chiqish_sana, chiqish_holat, olim_sababi, infarkt_qabul_id, izoh)
SELECT q.kt_no, q.updated_at, 'Vafot etdi', 'Vafot etdi', q.id,
       'Avtomatik to''ldirildi (2026-10-05): bemor holati "vafot" edi, varaqa yo''q edi. Sana — yozuv oxirgi o''zgartirilgan vaqt, aniq sanani tekshiring.'
FROM public.infarkt_qabul q
WHERE q.status='vafot' AND NOT EXISTS (SELECT 1 FROM public.infarkt_chiqarish c WHERE c.infarkt_qabul_id=q.id);

INSERT INTO public.insult_chiqarish (kt_no, viloyat, chiqish_sana, natija, mrs_daraja, insult_qabul_id, izoh)
SELECT q.kt_no, q.viloyat, q.updated_at, 'Vafot etdi',
       (SELECT mrs_daraja FROM public.insult_chiqarish WHERE mrs_daraja LIKE '6%' LIMIT 1), q.id,
       'Avtomatik to''ldirildi (2026-10-05): bemor holati "vafot" edi, varaqa yo''q edi. Sana — yozuv oxirgi o''zgartirilgan vaqt, aniq sanani tekshiring.'
FROM public.insult_qabul q
WHERE q.status='vafot' AND NOT EXISTS (SELECT 1 FROM public.insult_chiqarish c WHERE c.insult_qabul_id=q.id);

CREATE TABLE IF NOT EXISTS public.mrs_backup_20261005 (id uuid PRIMARY KEY, kt_no text, eski_mrs text, yangi_mrs text);
ALTER TABLE public.mrs_backup_20261005 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mrs_backup_20261005 FROM anon, authenticated;
WITH six AS (SELECT mrs_daraja m FROM public.insult_chiqarish WHERE mrs_daraja LIKE '6%' LIMIT 1),
f AS (SELECT c.id, c.kt_no, c.mrs_daraja eski FROM public.insult_chiqarish c JOIN public.insult_qabul q ON q.id=c.insult_qabul_id
      WHERE (q.status='vafot' OR c.natija='Vafot etdi') AND (c.mrs_daraja IS NULL OR c.mrs_daraja NOT LIKE '6%')),
b AS (INSERT INTO public.mrs_backup_20261005 SELECT f.id, f.kt_no, f.eski, (SELECT m FROM six) FROM f ON CONFLICT (id) DO NOTHING RETURNING 1)
UPDATE public.insult_chiqarish c SET mrs_daraja=(SELECT m FROM six) FROM f WHERE c.id=f.id;
