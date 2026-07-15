-- ============================================================
-- Eski insult yozuvlarida "Birlamchi yoki takroriy?" ni to'ldirish (2026-07-15)
--
-- Sabab: bu maydon Yangi Insult formasiga endi qo'shildi. Undan oldin
-- kiritilgan yozuvlarda qiymat yo'q (NULL) — hisobot eksportida ustun bo'sh chiqadi.
--
-- ⚠️ DIQQAT: bu skript BARCHA to'ldirilmagan yozuvlarga "Birlamchi" yozadi.
--    Aslida takroriy bo'lgan bemorlar ham "Birlamchi" deb belgilanadi —
--    ya'ni hisobotdagi "Takroriy" soni haqiqatdan kam ko'rinadi.
--    Bu ataylab tanlangan soddalashtirish. Aniqroq variant kerak bo'lsa
--    quyidagi "VARIANT B" ni ko'ring.
--
-- Supabase SQL Editor da ishga tushiring.
-- ============================================================

-- ── 1. Avval nechta yozuv o'zgarishini ko'ring (hech narsani o'zgartirmaydi) ──
SELECT COUNT(*) AS toldiriladigan_yozuvlar
FROM insult_qabul
WHERE birlamchi_yoki_takroriy IS NULL
   OR birlamchi_yoki_takroriy = '';

-- ── 2. To'ldirish ────────────────────────────────────────────
-- Faqat bo'sh yozuvlarga tegadi — mavjud qiymatlar o'zgarmaydi.
UPDATE insult_qabul
SET birlamchi_yoki_takroriy = 'Birlamchi'
WHERE birlamchi_yoki_takroriy IS NULL
   OR birlamchi_yoki_takroriy = '';

-- ── 3. Tekshirish ────────────────────────────────────────────
SELECT birlamchi_yoki_takroriy, COUNT(*)
FROM insult_qabul
GROUP BY birlamchi_yoki_takroriy
ORDER BY 2 DESC;

-- ============================================================
-- VARIANT B (aniqroq — kerak bo'lsa 2-bandni buning bilan almashtiring):
-- Bemorning bazada oldinroq insult yozuvi bo'lsa "Takroriy", bo'lmasa "Birlamchi".
-- F.I.O + tug'ilgan yil bo'yicha solishtiradi.
--
-- UPDATE insult_qabul q
-- SET birlamchi_yoki_takroriy = CASE WHEN EXISTS (
--       SELECT 1 FROM insult_qabul oldin
--       WHERE lower(trim(oldin.fio)) = lower(trim(q.fio))
--         AND COALESCE(left(oldin.tugilgan_yil,4),'') = COALESCE(left(q.tugilgan_yil,4),'')
--         AND oldin.qabul_vaqt < q.qabul_vaqt
--     ) THEN 'Takroriy' ELSE 'Birlamchi' END
-- WHERE q.birlamchi_yoki_takroriy IS NULL
--    OR q.birlamchi_yoki_takroriy = '';
-- ============================================================

-- ============================================================
-- ✅ TUGADI
-- ============================================================
