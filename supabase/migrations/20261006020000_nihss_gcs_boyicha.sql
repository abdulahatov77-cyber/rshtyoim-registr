-- Ma'lumot tuzatish (2026-10-05, bazaga qo'llangan): GCS ≤8 bo'lganda NIHSS kamida 7 bo'lishi
-- kerak (ong bandlari 1a+1b+1c o'zi 7 ball beradi). Foydalanuvchi qarori: GCS to'g'ri deb olindi,
-- qolgan 62 insult bemorda NIHSS eng kichik mumkin qiymat 7 ga ko'tarildi.
-- DIQQAT: 7 — pastki chegara, haqiqiy NIHSS yuqoriroq bo'lishi mumkin. Aniq qiymatni muassasa
-- kasallik tarixidan kiritishi kerak.
-- Eski qiymatlar public.nihss_backup_20261005 jadvalida.
-- Qaytarish: UPDATE public.insult_qabul q SET nihss_qabul = b.eski_nihss::int
--            FROM public.nihss_backup_20261005 b WHERE q.id = b.id;
CREATE TABLE IF NOT EXISTS public.nihss_backup_20261005 (id uuid PRIMARY KEY, kt_no text, gcs text, eski_nihss text, yangi_nihss text);
ALTER TABLE public.nihss_backup_20261005 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nihss_backup_20261005 FROM anon, authenticated;
WITH f AS (SELECT id, kt_no, coalesce(gcs_bali::text, gcs_qabul::text) g, nihss_qabul::text n FROM public.insult_qabul
  WHERE nihss_qabul::text ~ '^\d+$' AND nihss_qabul::int < 7
    AND coalesce(gcs_bali::text, gcs_qabul::text) ~ '^\d+$' AND coalesce(gcs_bali::text, gcs_qabul::text)::int <= 8),
b AS (INSERT INTO public.nihss_backup_20261005 SELECT id, kt_no, g, n, '7' FROM f ON CONFLICT (id) DO NOTHING RETURNING 1)
UPDATE public.insult_qabul q SET nihss_qabul = 7 FROM f WHERE q.id = f.id;
