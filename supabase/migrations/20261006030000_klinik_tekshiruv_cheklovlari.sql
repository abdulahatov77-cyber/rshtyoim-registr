-- Klinik mantiq cheklovlari (2026-10-05/06, bazaga qo'llangan va sinab ko'rilgan).
-- Forma tekshiruvini chetlab o'tadigan har qanday yo'l (import, boshqa klient) ham bloklansin.
--  * GCS ≤8 (koma) bo'lsa NIHSS kamida 7 (ong bandlari 1a+1b+1c o'zi 7 ball beradi);
--  * vafot natijasida mRS = 6.
-- Qoidani buzadigan mavjud yozuv yo'q edi (avval 69 va 21 ta tuzatilgan), shuning uchun darhol tasdiqlandi.
-- (Teskari qoida — mRS 6 faqat vafotda — bazada yo'q: 5 ta eski yozuv buzadi, faqat formada tekshiriladi.)
ALTER TABLE public.insult_qabul ADD CONSTRAINT insult_qabul_gcs_nihss_check CHECK (
  CASE WHEN nihss_qabul IS NOT NULL AND coalesce(gcs_bali, gcs_qabul::text) ~ '^\d+$'
       THEN NOT (coalesce(gcs_bali, gcs_qabul::text)::int <= 8 AND nihss_qabul < 7)
       ELSE true END);
ALTER TABLE public.insult_chiqarish ADD CONSTRAINT insult_chiqarish_vafot_mrs_check CHECK (
  natija IS DISTINCT FROM 'Vafot etdi' OR mrs_daraja IS NULL OR mrs_daraja LIKE '6%');
