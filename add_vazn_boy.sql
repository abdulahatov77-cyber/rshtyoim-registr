-- Bemor tana vazni (kg) va bo'y uzunligi (sm) ustunlari (2026-07-21)
-- Supabase Dashboard -> SQL Editor da ishga tushiring
ALTER TABLE insult_qabul  ADD COLUMN IF NOT EXISTS vazn NUMERIC;
ALTER TABLE insult_qabul  ADD COLUMN IF NOT EXISTS boy  INT;
ALTER TABLE infarkt_qabul ADD COLUMN IF NOT EXISTS vazn NUMERIC;
ALTER TABLE infarkt_qabul ADD COLUMN IF NOT EXISTS boy  INT;
