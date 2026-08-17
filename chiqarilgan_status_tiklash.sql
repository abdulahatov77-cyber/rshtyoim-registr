-- =====================================================================
-- CHIQARISH VARAQASI BOR, LEKIN STATUSI "active" QOLGAN YOZUVLAR
-- =====================================================================
-- Bunday yozuvlarda chiqarish varaqasi yozilgan, ya'ni bemor haqiqatan
-- chiqarilgan — faqat qabul jadvalidagi status yangilanmay qolgan.
-- Natija varaqadan olinadi, ya'ni taxmin qilinmaydi.
--
-- DIQQAT: otkazilgan_muassasa ustuniga TEGILMAYDI. Sababi ikkita:
--   1) o'tkazilgan muassasa nomi chiqarish varaqasida (boshqa_shifoxona)
--      allaqachon saqlangan;
--   2) o'sha ustunga yozilsa otkazish_imkoniyat_check trigger ishga
--      tushadi va imkoniyat belgilanmagan muassasalarda xato beradi.
--
-- TARTIB: avval 1-bo'lim (ko'rish), keyin 2-bo'lim (tuzatish)
-- =====================================================================


-- ============ 1. AVVAL KO'RING — nima o'zgaradi ============

SELECT 'infarkt' AS registr, q.kt_no, q.fio, q.muassasa,
       c.chiqish_holat AS varaqadagi_natija,
       c.chiqish_sana,
       CASE
         WHEN c.chiqish_holat = 'Vafot etdi' THEN 'vafot'
         WHEN c.chiqish_holat = 'Boshqa shifoxonaga o''tkazildi' THEN 'otkazildi'
         ELSE 'chiqarildi'
       END AS yangi_status
  FROM public.infarkt_qabul q
  JOIN public.infarkt_chiqarish c ON c.kt_no = q.kt_no
 WHERE q.status = 'active'
UNION ALL
SELECT 'insult', q.kt_no, q.fio, q.muassasa,
       c.natija, c.chiqish_sana,
       CASE
         WHEN c.natija = 'Vafot etdi' THEN 'vafot'
         WHEN c.natija = 'Boshqa shifoxonaga o''tkazildi' THEN 'otkazildi'
         ELSE 'chiqarildi'
       END
  FROM public.insult_qabul q
  JOIN public.insult_chiqarish c ON c.kt_no = q.kt_no
 WHERE q.status = 'active'
 ORDER BY 1, 4;


-- ============ 2. TUZATISH ============
-- Yuqoridagi ro'yxat to'g'ri bo'lsa — shu blokni ishga tushiring.

UPDATE public.infarkt_qabul q
   SET status = CASE
         WHEN c.chiqish_holat = 'Vafot etdi' THEN 'vafot'
         WHEN c.chiqish_holat = 'Boshqa shifoxonaga o''tkazildi' THEN 'otkazildi'
         ELSE 'chiqarildi'
       END
  FROM public.infarkt_chiqarish c
 WHERE c.kt_no = q.kt_no
   AND q.status = 'active';

UPDATE public.insult_qabul q
   SET status = CASE
         WHEN c.natija = 'Vafot etdi' THEN 'vafot'
         WHEN c.natija = 'Boshqa shifoxonaga o''tkazildi' THEN 'otkazildi'
         ELSE 'chiqarildi'
       END
  FROM public.insult_chiqarish c
 WHERE c.kt_no = q.kt_no
   AND q.status = 'active';


-- ============ 3. TEKSHIRUV — natija 0 va 0 bo'lishi kerak ============

SELECT (SELECT COUNT(*) FROM public.infarkt_qabul q
          JOIN public.infarkt_chiqarish c ON c.kt_no = q.kt_no
         WHERE q.status = 'active') AS infarkt_qoldiq,
       (SELECT COUNT(*) FROM public.insult_qabul q
          JOIN public.insult_chiqarish c ON c.kt_no = q.kt_no
         WHERE q.status = 'active') AS insult_qoldiq;
