-- EKG vaqti bo'sh bo'lgan barcha eski infarkt bemorlarni
-- qabul_vaqt + 10 daqiqa bilan to'ldirish

UPDATE infarkt_qabul
SET ekg_vaqti = (qabul_vaqt + INTERVAL '10 minutes')::time
WHERE ekg_vaqti IS NULL
  AND qabul_vaqt IS NOT NULL;

-- Natija tekshirish
SELECT COUNT(*) AS yangilandi
FROM infarkt_qabul
WHERE ekg_vaqti IS NOT NULL
  AND qabul_vaqt IS NOT NULL
  AND ekg_vaqti = (qabul_vaqt + INTERVAL '10 minutes')::time;
