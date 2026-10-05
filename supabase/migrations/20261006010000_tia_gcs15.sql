-- Ma'lumot tuzatish (2026-10-05, bazaga qo'llangan): GCS ≤8 va NIHSS <7 klinik jihatdan zid
-- (komada NIHSS ong bandlari o'zi kamida 7 ball beradi). 69 ta insult bemordan faqat 7 ta TIA
-- (vaqtinchalik ishemik ataka — bemor komada bo'lmaydi) uchun GCS 15 ga to'g'rilandi.
-- Qolgan 62 tada xato qaysi balda ekani noma'lum — muassasalar kasallik tarixidan tekshiradi.
-- Eski qiymatlar public.gcs_backup_20261005 jadvalida.
-- Qaytarish: UPDATE public.insult_qabul q SET gcs_bali = b.eski_gcs_bali::int, gcs_qabul = b.eski_gcs_qabul::int
--            FROM public.gcs_backup_20261005 b WHERE q.id = b.id;
CREATE TABLE IF NOT EXISTS public.gcs_backup_20261005 (id uuid PRIMARY KEY, kt_no text, eski_gcs_bali text, eski_gcs_qabul text, nihss text);
ALTER TABLE public.gcs_backup_20261005 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gcs_backup_20261005 FROM anon, authenticated;
WITH f AS (SELECT id, kt_no, gcs_bali::text gb, gcs_qabul::text gq, nihss_qabul::text n FROM public.insult_qabul
  WHERE insult_turi ILIKE 'TIA%' AND nihss_qabul::text ~ '^\d+$' AND nihss_qabul::int < 7
    AND coalesce(gcs_bali::text, gcs_qabul::text) ~ '^\d+$' AND coalesce(gcs_bali::text, gcs_qabul::text)::int <= 8),
b AS (INSERT INTO public.gcs_backup_20261005 SELECT id, kt_no, gb, gq, n FROM f ON CONFLICT (id) DO NOTHING RETURNING 1)
UPDATE public.insult_qabul q SET gcs_bali = 15, gcs_qabul = CASE WHEN q.gcs_qabul IS NOT NULL THEN 15 ELSE q.gcs_qabul END
FROM f WHERE q.id = f.id;
