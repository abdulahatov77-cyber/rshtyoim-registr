-- ============================================================
-- TAKRORIY KT_NO AJRATISH v2.1 (2026-07-22)
--
-- Eski kt_dublikat_fix.sql O'RNIGA ishlatiladi (u bajarilmagan).
-- Universal: juftliklarni avtomatik topadi (hozir 28 ta),
-- KEYINROQ qabul qilingan bemorga muassasa prefiksli yangi
-- K/T raqam beradi va unga tegishli yozuvlarni ko'chiradi.
--
-- v2.1: hammasi BITTA so'rovda (Supabase SQL editor pooler'ida
-- temp-jadval ishlamaydi — shu tuzatildi).
--
-- OLDIN Supabase Database -> Backups da zaxira borligini tekshiring!
-- TARTIB: 1 (preview) -> 2 (ajratish, bitta Run) -> 3 (tekshiruv)
-- ============================================================

-- ============================================================
-- 1) PREVIEW — kimga qanday yangi raqam beriladi (yozmaydi)
-- ============================================================
WITH ranked AS (
  SELECT 'infarkt' AS turi, kt_no, fio, muassasa, qabul_vaqt,
         row_number() OVER (PARTITION BY kt_no ORDER BY qabul_vaqt ASC NULLS FIRST) AS rn
  FROM infarkt_qabul
  WHERE kt_no IN (SELECT kt_no FROM infarkt_qabul GROUP BY kt_no HAVING count(*) > 1)
  UNION ALL
  SELECT 'insult', kt_no, fio, muassasa, qabul_vaqt,
         row_number() OVER (PARTITION BY kt_no ORDER BY qabul_vaqt ASC NULLS FIRST)
  FROM insult_qabul
  WHERE kt_no IN (SELECT kt_no FROM insult_qabul GROUP BY kt_no HAVING count(*) > 1)
)
SELECT turi, kt_no, fio, muassasa,
       qabul_vaqt AT TIME ZONE 'Asia/Tashkent' AS qabul,
       CASE WHEN rn = 1 THEN '(o''zgarmaydi)'
            ELSE COALESCE(NULLIF(upper(left(regexp_replace(muassasa, '[^A-Za-z]', '', 'g'), 4)), ''), 'DUP')
                 || '-' || kt_no
       END AS yangi_kt_no
FROM ranked
ORDER BY turi, kt_no, rn;

-- ============================================================
-- 2) AJRATISH — bitta so'rov, bitta Run
-- ============================================================
WITH inf_ranked AS (
  SELECT ctid AS rid, kt_no, muassasa, qabul_vaqt,
         row_number() OVER (PARTITION BY kt_no ORDER BY qabul_vaqt ASC NULLS FIRST) AS rn
  FROM infarkt_qabul
  WHERE kt_no IN (SELECT kt_no FROM infarkt_qabul GROUP BY kt_no HAVING count(*) > 1)
),
inf_upd AS (
  UPDATE infarkt_qabul q
  SET kt_no = COALESCE(NULLIF(upper(left(regexp_replace(r.muassasa, '[^A-Za-z]', '', 'g'), 4)), ''), 'DUP')
              || '-' || r.kt_no
  FROM inf_ranked r
  WHERE q.ctid = r.rid AND r.rn > 1
  RETURNING q.kt_no AS new_kt, r.kt_no AS old_kt, r.qabul_vaqt
),
ins_ranked AS (
  SELECT ctid AS rid, kt_no, muassasa, qabul_vaqt,
         row_number() OVER (PARTITION BY kt_no ORDER BY qabul_vaqt ASC NULLS FIRST) AS rn
  FROM insult_qabul
  WHERE kt_no IN (SELECT kt_no FROM insult_qabul GROUP BY kt_no HAVING count(*) > 1)
),
ins_upd AS (
  UPDATE insult_qabul q
  SET kt_no = COALESCE(NULLIF(upper(left(regexp_replace(r.muassasa, '[^A-Za-z]', '', 'g'), 4)), ''), 'DUP')
              || '-' || r.kt_no
  FROM ins_ranked r
  WHERE q.ctid = r.rid AND r.rn > 1
  RETURNING q.kt_no AS new_kt, r.kt_no AS old_kt, r.qabul_vaqt
),
m AS (
  SELECT 'infarkt' AS turi, old_kt, new_kt, qabul_vaqt AS qabul_ts,
         (qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date AS qabul_sana
  FROM inf_upd
  UNION ALL
  SELECT 'insult', old_kt, new_kt, qabul_vaqt,
         (qabul_vaqt AT TIME ZONE 'Asia/Tashkent')::date
  FROM ins_upd
),
u_inf_chiq AS (
  UPDATE infarkt_chiqarish c SET kt_no = m.new_kt
  FROM m WHERE m.turi = 'infarkt' AND c.kt_no = m.old_kt
    AND c.chiqish_sana::date >= m.qabul_sana
  RETURNING c.id
),
u_ins_chiq AS (
  UPDATE insult_chiqarish c SET kt_no = m.new_kt
  FROM m WHERE m.turi = 'insult' AND c.kt_no = m.old_kt
    AND c.chiqish_sana::date >= m.qabul_sana
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
SELECT m.turi, m.old_kt, m.new_kt,
       m.qabul_ts AT TIME ZONE 'Asia/Tashkent' AS qabul,
       (SELECT count(*) FROM u_inf_chiq) + (SELECT count(*) FROM u_ins_chiq) AS chiqarish_kochdi_jami,
       (SELECT count(*) FROM u_din) AS dinamika_jami,
       (SELECT count(*) FROM u_hol) AS holat_jami,
       (SELECT count(*) FROM u_nav) AS navbatchi_jami,
       (SELECT count(*) FROM u_tra) AS transfer_jami
FROM m
ORDER BY m.turi, m.old_kt;

-- ============================================================
-- 3) TEKSHIRUV — dublikat qolmadimi? (0 qator kutiladi)
-- ============================================================
SELECT 'insult' AS turi, kt_no, count(*) FROM insult_qabul
GROUP BY kt_no HAVING count(*) > 1
UNION ALL
SELECT 'infarkt', kt_no, count(*) FROM infarkt_qabul
GROUP BY kt_no HAVING count(*) > 1;
