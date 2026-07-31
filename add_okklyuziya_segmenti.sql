-- =====================================================================
-- OKKLYUZIYA SEGMENTI USTUNI (2026-07-31)
-- MSKT angiografiyada aniqlangan tomir okklyuziyasining segmenti.
-- Davolash taktikasi shu maydon + ASPECTS bali bo'yicha tavsiya etiladi:
--   ASPECTS ≥ 6 va M1/M2  → tromboekstraksiya ko'rsatmasini ko'rib chiqish
--   ASPECTS ≥ 6 va M3/M4  → TLT ko'rsatmasini ko'rib chiqish
--   ASPECTS < 6           → konservativ davolash
-- ISHGA TUSHIRISH: Supabase Dashboard -> SQL Editor
-- =====================================================================
ALTER TABLE public.insult_qabul
  ADD COLUMN IF NOT EXISTS okklyuziya_segmenti TEXT;

COMMENT ON COLUMN public.insult_qabul.okklyuziya_segmenti
  IS 'MSKT angiografiyada aniqlangan okklyuziya segmenti: M1 | M2 | M3 | M4 | Okklyuziya aniqlanmadi';

-- Tekshirish
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'insult_qabul'
  AND column_name IN ('okklyuziya_segmenti', 'aspects_ball', 'mskt_angiografiya');
