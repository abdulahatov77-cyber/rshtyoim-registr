-- Infarkt bemorlarini boshqa muassasaga o'tkazish sababini ajratish uchun
-- (statistikada "koronarografiya uchun o'tkazilgan" sonini aniq hisoblash maqsadida)
ALTER TABLE infarkt_qabul ADD COLUMN IF NOT EXISTS otkazish_sababi TEXT;
