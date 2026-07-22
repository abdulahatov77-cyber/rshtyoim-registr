-- transfer_log ga o'tkazish soati ustuni (2026-07-22)
-- Yangi bemor formasida "Boshqa muassasaga o'tkazildi" tanlanganda
-- endi sana bilan birga soat ham kiritiladi.
-- Supabase Dashboard -> SQL Editor da ishga tushiring
ALTER TABLE transfer_log ADD COLUMN IF NOT EXISTS vaqt TIME;
