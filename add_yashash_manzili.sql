-- ============================================================
-- Bemorning doimiy yashash manzili (2026-07-15)
-- Supabase SQL Editor da ishga tushiring.
-- ============================================================

-- fuqarolik: 'O''zbekiston' yoki 'Chet el'
ALTER TABLE infarkt_qabul ADD COLUMN IF NOT EXISTS fuqarolik TEXT DEFAULT 'O''zbekiston';
ALTER TABLE insult_qabul  ADD COLUMN IF NOT EXISTS fuqarolik TEXT DEFAULT 'O''zbekiston';

-- O'zbekiston fuqarosi uchun: yashash viloyati va tumani
ALTER TABLE infarkt_qabul ADD COLUMN IF NOT EXISTS yashash_viloyat TEXT;
ALTER TABLE insult_qabul  ADD COLUMN IF NOT EXISTS yashash_viloyat TEXT;

ALTER TABLE infarkt_qabul ADD COLUMN IF NOT EXISTS yashash_tuman TEXT;
ALTER TABLE insult_qabul  ADD COLUMN IF NOT EXISTS yashash_tuman TEXT;

-- Chet el fuqarosi uchun: davlat nomi
ALTER TABLE infarkt_qabul ADD COLUMN IF NOT EXISTS chet_el_davlati TEXT;
ALTER TABLE insult_qabul  ADD COLUMN IF NOT EXISTS chet_el_davlati TEXT;

-- Hisobot/filtr uchun index (tuman kesimida tahlil)
CREATE INDEX IF NOT EXISTS idx_infarkt_yashash_tuman ON infarkt_qabul (yashash_tuman);
CREATE INDEX IF NOT EXISTS idx_insult_yashash_tuman  ON insult_qabul  (yashash_tuman);
CREATE INDEX IF NOT EXISTS idx_infarkt_yashash_vil   ON infarkt_qabul (yashash_viloyat);
CREATE INDEX IF NOT EXISTS idx_insult_yashash_vil    ON insult_qabul  (yashash_viloyat);

-- ============================================================
-- ✅ TUGADI
-- ============================================================
