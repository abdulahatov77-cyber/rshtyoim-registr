-- Eski "Boshqa muassasaga o'tkazildi" yozuvlarini orqaga to'ldirish:
-- Agar bemor RSHTYOIM filialiga o'tkazilgan bo'lsa — bu KAG (koronarografiya) uchun deb hisoblanadi
UPDATE infarkt_qabul
SET otkazish_sababi = 'Koronarografiya (KAG) uchun'
WHERE otkazilgan_muassasa IS NOT NULL
  AND otkazilgan_muassasa ILIKE '%RSHTYOIM%'
  AND otkazish_sababi IS NULL;

-- Qolgan o'tkazilgan yozuvlarni "Boshqa sabab" deb belgilash
UPDATE infarkt_qabul
SET otkazish_sababi = 'Boshqa sabab'
WHERE otkazilgan_muassasa IS NOT NULL
  AND otkazish_sababi IS NULL;
