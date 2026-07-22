-- ============================================================
-- KT AJRATISHNI YAKUNLASH (RECOVERY v3, aniq ro'yxat) — 2026-07-22
--
-- Formula bo'yicha qidirish soxta juftliklar topdi (RISH-6040) —
-- endi faqat ANIQ 28 juftlik ro'yxati bilan ishlaydi (kt_no + FIO).
-- Yangi raqam olgan bemor: FIO mos VA kt_no '...-eski_raqam'
-- ko'rinishida bo'lgani.
--
-- Chiqarish ko'chirishda unikal indeks himoyasi hisobga olingan:
-- agar yangi raqamda allaqachon varaqa bo'lsa — tegilmaydi
-- (3-bo'lim bunday qoldiqlarni ro'yxatlaydi).
--
-- TARTIB: 1 (preview, 28 qator kutiladi) -> 2 (bitta Run) -> 3
-- ============================================================

-- ============================================================
-- 1) PREVIEW — juftliklar bazadan topilishi (yozmaydi)
-- ============================================================
WITH dup(turi, old_kt, fio1, fio2) AS (VALUES
  ('infarkt','10208','Tursunov Ibroxim Mannonovich','Yarboyeva Umida Xolmanovna'),
  ('infarkt','19136','Nizamov Nasretdin Zayniddinovich','Kalimulina Zumara'),
  ('infarkt','3214','Kenjaeva Maya Suinovna','Domrachev Igor Vladimirovich'),
  ('infarkt','3247','Nishonov Abduraxim Raxmonqulovich','Shomuratov Murodbek'),
  ('infarkt','3395','Nortalikov G''ofur Abdullayevich','Boirov Tolipboy'),
  ('infarkt','3811','Toshboyeva Jamila Talliyevna','Qadirova Gulchexra'),
  ('infarkt','4057','Yumitov Choriquli','Xayitova Sasnobar Otaboyevna'),
  ('infarkt','4160','Matyoqubov O''ktam','Sattorov Komiljon Davronovich'),
  ('infarkt','4640','Sodiqov Mirlaziz','Azimov Botirali'),
  ('infarkt','5003','Maxmudova Sanobar','Ummatova Farida'),
  ('infarkt','5115','Fortkova Nina Federovna','Raxmatova Saodat Mirzaboyevna'),
  ('infarkt','5144','Shagazatova Dilyorom Kamilovna','Teshayev Juma'),
  ('infarkt','6151','Shajmardonov Anvar','Melikuziev Valijon'),
  ('infarkt','6450','Sayidova Ra''no Daminovna','Usarova Salima Jo''raevna'),
  ('infarkt','6569','Yusupova Sanobarxon','Po''latov Maxammad'),
  ('infarkt','6777','Muminov Botir','Jo''raev Komiljon'),
  ('infarkt','7255','Mamajonova Marxabo','Sabirova Gavxarjon'),
  ('infarkt','9713','Kasimov Amanulla','Xo''jaqulov Dilmurod'),
  ('insult','4138','Nasimova Moxira','Toshtemiroa Xasanboj'),
  ('insult','4286','Xŏjakov Ashir','Rajabova Turdiniso Xxx'),
  ('insult','4520','Sultonov Madaminjon Sobirjonovich','Xolmatov Isroiljon'),
  ('insult','5269','Abduraimov Oybek Vaxobovich','Nazirov Xabiljon'),
  ('insult','5528','Axmedova Salima Jurabayevna','Shokirov Iskandar'),
  ('insult','9040','Nizamov Kaxraman Kamaliddinovich','Musayeva Karima'),
  ('insult','KT-13973','Biryukova Olga','Xamidova Shirmonxon'),
  ('insult','KT-2065','Matsapayev Ulugbek','Bobojanova Malika'),
  ('insult','KT-282','Kuchorova Marziya Musayevna','Akbarov Asror'),
  ('insult','KT-6110','Jumaniyazov Rajabboy','Uzakov Abdirofi')
),
m AS (
  SELECT d.turi, d.old_kt, a.kt_no AS new_kt, a.fio, a.qabul_vaqt
  FROM dup d JOIN infarkt_qabul a
    ON d.turi = 'infarkt' AND a.kt_no LIKE '%-' || d.old_kt AND a.fio IN (d.fio1, d.fio2)
  UNION ALL
  SELECT d.turi, d.old_kt, a.kt_no, a.fio, a.qabul_vaqt
  FROM dup d JOIN insult_qabul a
    ON d.turi = 'insult' AND a.kt_no LIKE '%-' || d.old_kt AND a.fio IN (d.fio1, d.fio2)
)
SELECT turi, old_kt, new_kt, fio AS yangi_raqam_olgan_bemor,
       qabul_vaqt AT TIME ZONE 'Asia/Tashkent' AS qabul
FROM m
ORDER BY turi, old_kt;

-- ============================================================
-- 2) KO'CHIRISHNI YAKUNLASH — bitta so'rov, bitta Run
-- ============================================================
WITH dup(turi, old_kt, fio1, fio2) AS (VALUES
  ('infarkt','10208','Tursunov Ibroxim Mannonovich','Yarboyeva Umida Xolmanovna'),
  ('infarkt','19136','Nizamov Nasretdin Zayniddinovich','Kalimulina Zumara'),
  ('infarkt','3214','Kenjaeva Maya Suinovna','Domrachev Igor Vladimirovich'),
  ('infarkt','3247','Nishonov Abduraxim Raxmonqulovich','Shomuratov Murodbek'),
  ('infarkt','3395','Nortalikov G''ofur Abdullayevich','Boirov Tolipboy'),
  ('infarkt','3811','Toshboyeva Jamila Talliyevna','Qadirova Gulchexra'),
  ('infarkt','4057','Yumitov Choriquli','Xayitova Sasnobar Otaboyevna'),
  ('infarkt','4160','Matyoqubov O''ktam','Sattorov Komiljon Davronovich'),
  ('infarkt','4640','Sodiqov Mirlaziz','Azimov Botirali'),
  ('infarkt','5003','Maxmudova Sanobar','Ummatova Farida'),
  ('infarkt','5115','Fortkova Nina Federovna','Raxmatova Saodat Mirzaboyevna'),
  ('infarkt','5144','Shagazatova Dilyorom Kamilovna','Teshayev Juma'),
  ('infarkt','6151','Shajmardonov Anvar','Melikuziev Valijon'),
  ('infarkt','6450','Sayidova Ra''no Daminovna','Usarova Salima Jo''raevna'),
  ('infarkt','6569','Yusupova Sanobarxon','Po''latov Maxammad'),
  ('infarkt','6777','Muminov Botir','Jo''raev Komiljon'),
  ('infarkt','7255','Mamajonova Marxabo','Sabirova Gavxarjon'),
  ('infarkt','9713','Kasimov Amanulla','Xo''jaqulov Dilmurod'),
  ('insult','4138','Nasimova Moxira','Toshtemiroa Xasanboj'),
  ('insult','4286','Xŏjakov Ashir','Rajabova Turdiniso Xxx'),
  ('insult','4520','Sultonov Madaminjon Sobirjonovich','Xolmatov Isroiljon'),
  ('insult','5269','Abduraimov Oybek Vaxobovich','Nazirov Xabiljon'),
  ('insult','5528','Axmedova Salima Jurabayevna','Shokirov Iskandar'),
  ('insult','9040','Nizamov Kaxraman Kamaliddinovich','Musayeva Karima'),
  ('insult','KT-13973','Biryukova Olga','Xamidova Shirmonxon'),
  ('insult','KT-2065','Matsapayev Ulugbek','Bobojanova Malika'),
  ('insult','KT-282','Kuchorova Marziya Musayevna','Akbarov Asror'),
  ('insult','KT-6110','Jumaniyazov Rajabboy','Uzakov Abdirofi')
),
m AS (
  SELECT d.turi, d.old_kt, a.kt_no AS new_kt, a.qabul_vaqt AS qabul_ts,
         (a.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date AS qabul_sana
  FROM dup d JOIN infarkt_qabul a
    ON d.turi = 'infarkt' AND a.kt_no LIKE '%-' || d.old_kt AND a.fio IN (d.fio1, d.fio2)
  UNION ALL
  SELECT d.turi, d.old_kt, a.kt_no, a.qabul_vaqt,
         (a.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
  FROM dup d JOIN insult_qabul a
    ON d.turi = 'insult' AND a.kt_no LIKE '%-' || d.old_kt AND a.fio IN (d.fio1, d.fio2)
),
u_inf_chiq AS (
  UPDATE infarkt_chiqarish c SET kt_no = m.new_kt
  FROM m WHERE m.turi = 'infarkt' AND c.kt_no = m.old_kt
    AND c.chiqish_sana::date >= m.qabul_sana
    AND NOT EXISTS (SELECT 1 FROM infarkt_chiqarish x WHERE x.kt_no = m.new_kt)
  RETURNING c.id
),
u_ins_chiq AS (
  UPDATE insult_chiqarish c SET kt_no = m.new_kt
  FROM m WHERE m.turi = 'insult' AND c.kt_no = m.old_kt
    AND c.chiqish_sana::date >= m.qabul_sana
    AND NOT EXISTS (SELECT 1 FROM insult_chiqarish x WHERE x.kt_no = m.new_kt)
  RETURNING c.id
),
u_din AS (
  UPDATE dinamika_muolajalar d SET kt_no = m.new_kt
  FROM m WHERE d.kt_no = m.old_kt AND d.registr_turi = m.turi
    AND d.created_at >= m.qabul_ts
  RETURNING d.id
),
u_hol AS (
  UPDATE holat_dinamikasi h SET kt_no = m.new_kt
  FROM m WHERE h.kt_no = m.old_kt AND h.registr_turi = m.turi
    AND h.created_at >= m.qabul_ts
  RETURNING h.id
),
u_nav AS (
  UPDATE navbatchi_jurnal n SET kt_no = m.new_kt
  FROM m WHERE n.kt_no = m.old_kt AND n.registr_turi = m.turi
    AND n.created_at >= m.qabul_ts
  RETURNING n.id
),
u_kuz AS (
  UPDATE kuzatuv k SET kt_no = m.new_kt
  FROM m WHERE k.kt_no = m.old_kt AND k.registr_turi = m.turi
    AND k.created_at >= m.qabul_ts
  RETURNING k.id
),
u_fay AS (
  UPDATE bemor_fayllari f SET kt_no = m.new_kt
  FROM m WHERE f.kt_no = m.old_kt AND f.registr_turi = m.turi
    AND f.created_at >= m.qabul_ts
  RETURNING f.id
),
u_tra AS (
  UPDATE transfer_log t SET kt_no = m.new_kt
  FROM m WHERE t.kt_no = m.old_kt
    AND t.sana::date >= m.qabul_sana
  RETURNING t.id
)
SELECT (SELECT count(*) FROM m)          AS juftliklar,
       (SELECT count(*) FROM u_inf_chiq) AS infarkt_chiqarish_kochdi,
       (SELECT count(*) FROM u_ins_chiq) AS insult_chiqarish_kochdi,
       (SELECT count(*) FROM u_din)      AS dinamika_kochdi,
       (SELECT count(*) FROM u_hol)      AS holat_kochdi,
       (SELECT count(*) FROM u_nav)      AS navbatchi_kochdi,
       (SELECT count(*) FROM u_kuz)      AS kuzatuv_kochdi,
       (SELECT count(*) FROM u_fay)      AS fayl_kochdi,
       (SELECT count(*) FROM u_tra)      AS transfer_kochdi;

-- ============================================================
-- 3) QOLDIQLAR — ko'chira olmagan varaqalar (ikkala raqamda ham
--    varaqa bor edi). Bularni bemor kartasidan qo'lda tekshiring.
--    (bo'sh chiqsa — hammasi joyida)
-- ============================================================
WITH dup(turi, old_kt, fio1, fio2) AS (VALUES
  ('infarkt','10208','Tursunov Ibroxim Mannonovich','Yarboyeva Umida Xolmanovna'),
  ('infarkt','19136','Nizamov Nasretdin Zayniddinovich','Kalimulina Zumara'),
  ('infarkt','3214','Kenjaeva Maya Suinovna','Domrachev Igor Vladimirovich'),
  ('infarkt','3247','Nishonov Abduraxim Raxmonqulovich','Shomuratov Murodbek'),
  ('infarkt','3395','Nortalikov G''ofur Abdullayevich','Boirov Tolipboy'),
  ('infarkt','3811','Toshboyeva Jamila Talliyevna','Qadirova Gulchexra'),
  ('infarkt','4057','Yumitov Choriquli','Xayitova Sasnobar Otaboyevna'),
  ('infarkt','4160','Matyoqubov O''ktam','Sattorov Komiljon Davronovich'),
  ('infarkt','4640','Sodiqov Mirlaziz','Azimov Botirali'),
  ('infarkt','5003','Maxmudova Sanobar','Ummatova Farida'),
  ('infarkt','5115','Fortkova Nina Federovna','Raxmatova Saodat Mirzaboyevna'),
  ('infarkt','5144','Shagazatova Dilyorom Kamilovna','Teshayev Juma'),
  ('infarkt','6151','Shajmardonov Anvar','Melikuziev Valijon'),
  ('infarkt','6450','Sayidova Ra''no Daminovna','Usarova Salima Jo''raevna'),
  ('infarkt','6569','Yusupova Sanobarxon','Po''latov Maxammad'),
  ('infarkt','6777','Muminov Botir','Jo''raev Komiljon'),
  ('infarkt','7255','Mamajonova Marxabo','Sabirova Gavxarjon'),
  ('infarkt','9713','Kasimov Amanulla','Xo''jaqulov Dilmurod'),
  ('insult','4138','Nasimova Moxira','Toshtemiroa Xasanboj'),
  ('insult','4286','Xŏjakov Ashir','Rajabova Turdiniso Xxx'),
  ('insult','4520','Sultonov Madaminjon Sobirjonovich','Xolmatov Isroiljon'),
  ('insult','5269','Abduraimov Oybek Vaxobovich','Nazirov Xabiljon'),
  ('insult','5528','Axmedova Salima Jurabayevna','Shokirov Iskandar'),
  ('insult','9040','Nizamov Kaxraman Kamaliddinovich','Musayeva Karima'),
  ('insult','KT-13973','Biryukova Olga','Xamidova Shirmonxon'),
  ('insult','KT-2065','Matsapayev Ulugbek','Bobojanova Malika'),
  ('insult','KT-282','Kuchorova Marziya Musayevna','Akbarov Asror'),
  ('insult','KT-6110','Jumaniyazov Rajabboy','Uzakov Abdirofi')
),
m AS (
  SELECT d.turi, d.old_kt, a.kt_no AS new_kt,
         (a.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date AS qabul_sana
  FROM dup d JOIN infarkt_qabul a
    ON d.turi = 'infarkt' AND a.kt_no LIKE '%-' || d.old_kt AND a.fio IN (d.fio1, d.fio2)
  UNION ALL
  SELECT d.turi, d.old_kt, a.kt_no,
         (a.qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
  FROM dup d JOIN insult_qabul a
    ON d.turi = 'insult' AND a.kt_no LIKE '%-' || d.old_kt AND a.fio IN (d.fio1, d.fio2)
)
SELECT m.turi, m.old_kt, m.new_kt,
       c.chiqish_sana::date AS kochmagan_varaqa_sanasi
FROM m
JOIN infarkt_chiqarish c ON m.turi = 'infarkt' AND c.kt_no = m.old_kt
  AND c.chiqish_sana::date >= m.qabul_sana
UNION ALL
SELECT m.turi, m.old_kt, m.new_kt, c.chiqish_sana::date
FROM m
JOIN insult_chiqarish c ON m.turi = 'insult' AND c.kt_no = m.old_kt
  AND c.chiqish_sana::date >= m.qabul_sana
ORDER BY 1, 2;

-- ============================================================
-- 4) HOLAT XARITASI — har juftlikda varaqa/yozuvlar qayerda?
--    (yangi_varaqa=1 bo'lsa ajratilgan bemor varaqasi joyida;
--    ikkalasi 0 bo'lsa bemor hali chiqarilmagan bo'lishi mumkin)
-- ============================================================
WITH dup(turi, old_kt, fio1, fio2) AS (VALUES
  ('infarkt','10208','Tursunov Ibroxim Mannonovich','Yarboyeva Umida Xolmanovna'),
  ('infarkt','19136','Nizamov Nasretdin Zayniddinovich','Kalimulina Zumara'),
  ('infarkt','3214','Kenjaeva Maya Suinovna','Domrachev Igor Vladimirovich'),
  ('infarkt','3247','Nishonov Abduraxim Raxmonqulovich','Shomuratov Murodbek'),
  ('infarkt','3395','Nortalikov G''ofur Abdullayevich','Boirov Tolipboy'),
  ('infarkt','3811','Toshboyeva Jamila Talliyevna','Qadirova Gulchexra'),
  ('infarkt','4057','Yumitov Choriquli','Xayitova Sasnobar Otaboyevna'),
  ('infarkt','4160','Matyoqubov O''ktam','Sattorov Komiljon Davronovich'),
  ('infarkt','4640','Sodiqov Mirlaziz','Azimov Botirali'),
  ('infarkt','5003','Maxmudova Sanobar','Ummatova Farida'),
  ('infarkt','5115','Fortkova Nina Federovna','Raxmatova Saodat Mirzaboyevna'),
  ('infarkt','5144','Shagazatova Dilyorom Kamilovna','Teshayev Juma'),
  ('infarkt','6151','Shajmardonov Anvar','Melikuziev Valijon'),
  ('infarkt','6450','Sayidova Ra''no Daminovna','Usarova Salima Jo''raevna'),
  ('infarkt','6569','Yusupova Sanobarxon','Po''latov Maxammad'),
  ('infarkt','6777','Muminov Botir','Jo''raev Komiljon'),
  ('infarkt','7255','Mamajonova Marxabo','Sabirova Gavxarjon'),
  ('infarkt','9713','Kasimov Amanulla','Xo''jaqulov Dilmurod'),
  ('insult','4138','Nasimova Moxira','Toshtemiroa Xasanboj'),
  ('insult','4286','Xŏjakov Ashir','Rajabova Turdiniso Xxx'),
  ('insult','4520','Sultonov Madaminjon Sobirjonovich','Xolmatov Isroiljon'),
  ('insult','5269','Abduraimov Oybek Vaxobovich','Nazirov Xabiljon'),
  ('insult','5528','Axmedova Salima Jurabayevna','Shokirov Iskandar'),
  ('insult','9040','Nizamov Kaxraman Kamaliddinovich','Musayeva Karima'),
  ('insult','KT-13973','Biryukova Olga','Xamidova Shirmonxon'),
  ('insult','KT-2065','Matsapayev Ulugbek','Bobojanova Malika'),
  ('insult','KT-282','Kuchorova Marziya Musayevna','Akbarov Asror'),
  ('insult','KT-6110','Jumaniyazov Rajabboy','Uzakov Abdirofi')
),
m AS (
  SELECT d.turi, d.old_kt, a.kt_no AS new_kt
  FROM dup d JOIN infarkt_qabul a
    ON d.turi = 'infarkt' AND a.kt_no LIKE '%-' || d.old_kt AND a.fio IN (d.fio1, d.fio2)
  UNION ALL
  SELECT d.turi, d.old_kt, a.kt_no
  FROM dup d JOIN insult_qabul a
    ON d.turi = 'insult' AND a.kt_no LIKE '%-' || d.old_kt AND a.fio IN (d.fio1, d.fio2)
)
SELECT m.turi, m.old_kt, m.new_kt,
  CASE WHEN m.turi = 'infarkt'
    THEN (SELECT count(*) FROM infarkt_chiqarish c WHERE c.kt_no = m.new_kt)
    ELSE (SELECT count(*) FROM insult_chiqarish c WHERE c.kt_no = m.new_kt) END AS yangi_varaqa,
  CASE WHEN m.turi = 'infarkt'
    THEN (SELECT count(*) FROM infarkt_chiqarish c WHERE c.kt_no = m.old_kt)
    ELSE (SELECT count(*) FROM insult_chiqarish c WHERE c.kt_no = m.old_kt) END AS eski_varaqa,
  (SELECT count(*) FROM dinamika_muolajalar x WHERE x.kt_no = m.new_kt) AS yangi_dinamika,
  (SELECT count(*) FROM dinamika_muolajalar x WHERE x.kt_no = m.old_kt) AS eski_dinamika,
  (SELECT count(*) FROM holat_dinamikasi x WHERE x.kt_no = m.new_kt) AS yangi_holat,
  (SELECT count(*) FROM holat_dinamikasi x WHERE x.kt_no = m.old_kt) AS eski_holat
FROM m
ORDER BY m.turi, m.old_kt;
