-- ============================================================
-- RSHTYOIM Registr — Backend tuzatishlari (2026-07-14)
-- Bu faylni Supabase SQL Editor'да BIR MARTA ishga tushiring.
-- Har bir blok mustaqil — xavfsiz qayta ishga tushirsa bo'ladi.
-- ============================================================

-- ------------------------------------------------------------
-- 1. tugilgan_sana ustunini qo'shish (yosh piramida/demografiya uchun)
--    RPC funksiyalari bu ustunga murojaat qiladi — yo'q bo'lsa xato beradi.
-- ------------------------------------------------------------
ALTER TABLE infarkt_qabul ADD COLUMN IF NOT EXISTS tugilgan_sana DATE;
ALTER TABLE insult_qabul  ADD COLUMN IF NOT EXISTS tugilgan_sana DATE;

-- ------------------------------------------------------------
-- 2. Yetishmayotgan indexlar (tezlik uchun)
--    muassasa deyarli har RPC da filtrlanadi — indekslanmagan edi.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_infarkt_muassasa ON infarkt_qabul (muassasa);
CREATE INDEX IF NOT EXISTS idx_insult_muassasa  ON insult_qabul  (muassasa);

-- Trend so'rovlari uchun expression index (UZT sana bo'yicha)
CREATE INDEX IF NOT EXISTS idx_infarkt_vaqt_uzt
  ON infarkt_qabul (((qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date));
CREATE INDEX IF NOT EXISTS idx_insult_vaqt_uzt
  ON insult_qabul (((qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date));

-- Bolalar (child) jadvallar kt_no bo'yicha join qilinadi
CREATE INDEX IF NOT EXISTS idx_kuzatuv_ktno ON kuzatuv (kt_no);

-- ------------------------------------------------------------
-- 3. Killip precedence xatosi tuzatilgan get_dashboard_stats
--    (kritik_infarkt: III yoki IV qavsga olindi)
--    ESLATMA: bu funksiya faqat shu bitta qatorда o'zgargan.
--    To'liq funksiyani sql_rpc_functions.sql dan qayta yuklang,
--    yoki quyidagi eslatmani bajaring.
-- ------------------------------------------------------------
-- get_dashboard_stats ичидa 'kritik_infarkt' qatoriда:
--   ... AND killip ILIKE '%III%' OR killip ILIKE '%IV%'
-- o'rniga:
--   ... AND (killip ILIKE '%III%' OR killip ILIKE '%IV%')
-- bo'lishi kerak. To'liq funksiya sql_rpc_functions.sql da tuzatilgan —
-- o'sha faylni qayta ishga tushiring.
