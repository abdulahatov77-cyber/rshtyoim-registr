-- ============================================================
-- TAKRORIY KT_NO AJRATISH (2026-07-21)
-- 27 juftlikda keyinroq qabul qilingan bemorga muassasa
-- prefiksli yangi K/T raqam beriladi; chiqarish yozuvlari
-- sana bo'yicha o'z egasiga biriktiriladi.
-- OLDIN Supabase Database -> Backups da zaxira borligini tekshiring!
-- ============================================================
BEGIN;

-- ============ 1) INFARKT bemorlarini qayta raqamlash ============
UPDATE infarkt_qabul SET kt_no='KOSO-10208' WHERE kt_no='10208' AND fio='Tursunov Ibroxim Mannonovich';
UPDATE infarkt_qabul SET kt_no='QUYI-3214'  WHERE kt_no='3214'  AND fio='Kenjaeva Maya Suinovna';
UPDATE infarkt_qabul SET kt_no='QUYI-3247'  WHERE kt_no='3247'  AND fio='Nishonov Abduraxim Raxmonqulovich';
UPDATE infarkt_qabul SET kt_no='QUYI-3395'  WHERE kt_no='3395'  AND fio='Boirov Tolipboy';
UPDATE infarkt_qabul SET kt_no='OLTI-3811'  WHERE kt_no='3811'  AND fio='Toshboyeva Jamila Talliyevna';
UPDATE infarkt_qabul SET kt_no='OLOT-4057'  WHERE kt_no='4057'  AND fio='Yumitov Choriquli';
UPDATE infarkt_qabul SET kt_no='QOSH-4160'  WHERE kt_no='4160'  AND fio='Matyoqubov O''ktam';
UPDATE infarkt_qabul SET kt_no='BOKA-4640'  WHERE kt_no='4640'  AND fio='Sodiqov Mirlaziz';
UPDATE infarkt_qabul SET kt_no='BOKA-5003'  WHERE kt_no='5003'  AND fio='Maxmudova Sanobar';
UPDATE infarkt_qabul SET kt_no='4SON-5115'  WHERE kt_no='5115'  AND fio='Fortkova Nina Federovna';
UPDATE infarkt_qabul SET kt_no='4SON-5144'  WHERE kt_no='5144'  AND fio='Shagazatova Dilyorom Kamilovna';
UPDATE infarkt_qabul SET kt_no='QOQO-6151'  WHERE kt_no='6151'  AND fio='Melikuziev Valijon';
UPDATE infarkt_qabul SET kt_no='OLTA-6450'  WHERE kt_no='6450'  AND fio='Usarova Salima Jo''raevna';
UPDATE infarkt_qabul SET kt_no='PAXT-6569'  WHERE kt_no='6569'  AND fio='Yusupova Sanobarxon';
UPDATE infarkt_qabul SET kt_no='OLTA-6777'  WHERE kt_no='6777'  AND fio='Jo''raev Komiljon';
UPDATE infarkt_qabul SET kt_no='URGA-7255'  WHERE kt_no='7255'  AND fio='Sabirova Gavxarjon';
UPDATE infarkt_qabul SET kt_no='1SON-9713'  WHERE kt_no='9713'  AND fio='Kasimov Amanulla';

-- ============ 2) INSULT bemorlarini qayta raqamlash ============
UPDATE insult_qabul SET kt_no='KOGO-4138'      WHERE kt_no='4138'     AND fio='Nasimova Moxira';
UPDATE insult_qabul SET kt_no='OLOT-4286'      WHERE kt_no='4286'     AND fio='Xŏjakov Ashir';
UPDATE insult_qabul SET kt_no='MARG-4520'      WHERE kt_no='4520'     AND fio='Sultonov Madaminjon Sobirjonovich';
UPDATE insult_qabul SET kt_no='4SON-5269'      WHERE kt_no='5269'     AND fio='Abduraimov Oybek Vaxobovich';
UPDATE insult_qabul SET kt_no='4SON-5528'      WHERE kt_no='5528'     AND fio='Axmedova Salima Jurabayevna';
UPDATE insult_qabul SET kt_no='1SON-9040'      WHERE kt_no='9040'     AND fio='Nizamov Kaxraman Kamaliddinovich';
UPDATE insult_qabul SET kt_no='FARG-KT-13973'  WHERE kt_no='KT-13973' AND fio='Biryukova Olga';
UPDATE insult_qabul SET kt_no='AMUD-KT-2065'   WHERE kt_no='KT-2065'  AND fio='Matsapayev Ulugbek';
UPDATE insult_qabul SET kt_no='ULUG-KT-282'    WHERE kt_no='KT-282'   AND fio='Akbarov Asror';
UPDATE insult_qabul SET kt_no='SHOV-KT-6110'   WHERE kt_no='KT-6110'  AND fio='Jumaniyazov Rajabboy';

-- ============ 3) Chiqarish yozuvlarini o'z egasiga ko'chirish ============
-- (sana chegarasi = yangi raqam olgan bemorning qabul sanasi)
UPDATE insult_chiqarish  SET kt_no='ULUG-KT-282'   WHERE kt_no='KT-282'   AND chiqish_sana::date >= DATE '2026-04-06';
UPDATE insult_chiqarish  SET kt_no='FARG-KT-13973' WHERE kt_no='KT-13973' AND chiqish_sana::date >= DATE '2026-07-10';
UPDATE insult_chiqarish  SET kt_no='SHOV-KT-6110'  WHERE kt_no='KT-6110'  AND chiqish_sana::date >= DATE '2026-06-22';
UPDATE insult_chiqarish  SET kt_no='KOGO-4138'     WHERE kt_no='4138'     AND chiqish_sana::date >= DATE '2026-07-01';
UPDATE insult_chiqarish  SET kt_no='OLOT-4286'     WHERE kt_no='4286'     AND chiqish_sana::date >= DATE '2026-06-25';
UPDATE insult_chiqarish  SET kt_no='4SON-5269'     WHERE kt_no='5269'     AND chiqish_sana::date >= DATE '2026-06-15';
UPDATE insult_chiqarish  SET kt_no='4SON-5528'     WHERE kt_no='5528'     AND chiqish_sana::date >= DATE '2026-06-22';
UPDATE infarkt_chiqarish SET kt_no='QUYI-3247'     WHERE kt_no='3247'     AND chiqish_sana::date >= DATE '2026-06-26';
UPDATE infarkt_chiqarish SET kt_no='QUYI-3395'     WHERE kt_no='3395'     AND chiqish_sana::date >= DATE '2026-07-04';
UPDATE infarkt_chiqarish SET kt_no='OLTI-3811'     WHERE kt_no='3811'     AND chiqish_sana::date >= DATE '2026-07-07';
UPDATE infarkt_chiqarish SET kt_no='OLOT-4057'     WHERE kt_no='4057'     AND chiqish_sana::date >= DATE '2026-06-16';
UPDATE infarkt_chiqarish SET kt_no='QOSH-4160'     WHERE kt_no='4160'     AND chiqish_sana::date >= DATE '2026-07-17';
UPDATE infarkt_chiqarish SET kt_no='BOKA-4640'     WHERE kt_no='4640'     AND chiqish_sana::date >= DATE '2026-06-11';
UPDATE infarkt_chiqarish SET kt_no='QOQO-6151'     WHERE kt_no='6151'     AND chiqish_sana::date >= DATE '2026-06-09';
UPDATE infarkt_chiqarish SET kt_no='OLTA-6450'     WHERE kt_no='6450'     AND chiqish_sana::date >= DATE '2026-06-15';
UPDATE infarkt_chiqarish SET kt_no='OLTA-6777'     WHERE kt_no='6777'     AND chiqish_sana::date >= DATE '2026-06-24';

COMMIT;

-- ============ TEKSHIRUV (COMMIT dan keyin) ============
-- Dublikatlar qolmadimi? (bo'sh chiqishi kerak)
SELECT kt_no, count(*) FROM insult_qabul GROUP BY kt_no HAVING count(*) > 1
UNION ALL
SELECT kt_no, count(*) FROM infarkt_qabul GROUP BY kt_no HAVING count(*) > 1;
