-- ============================================================
-- RSHTYOIM Registr — Child jadvallar RLS (2026-07-14)
-- Bog'liq jadvallarni ham viloyat bo'yicha himoyalaydi.
-- Avval rls_secure_2026_07.sql ishga tushirilgan bo'lishi kerak
-- (auth_role() va auth_viloyat() funksiyalari kerak).
--
-- ⚠️ Ishga tushirgach sinang: bemor kartasini oching — fayllar,
--    dinamika, kuzatuv ko'rinishi kerak (o'z viloyati bemorlari uchun).
-- ============================================================

-- Yordamchi: berilgan kt_no foydalanuvchining viloyatidagi bemornikimi?
-- (infarkt yoki insult jadvalida shu kt_no bor va viloyat mos)
CREATE OR REPLACE FUNCTION public.can_access_ktno(p_ktno text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    auth_role() = 'super_admin'
    OR EXISTS (SELECT 1 FROM infarkt_qabul WHERE kt_no = p_ktno AND viloyat = auth_viloyat())
    OR EXISTS (SELECT 1 FROM insult_qabul  WHERE kt_no = p_ktno AND viloyat = auth_viloyat());
$$;
GRANT EXECUTE ON FUNCTION public.can_access_ktno(text) TO authenticated;


-- ============================================================
-- Har bir child jadval uchun: SELECT/INSERT/UPDATE/DELETE
-- kt_no orqali parent bemorga bog'lab tekshiriladi.
-- ============================================================

-- ---- kuzatuv ----
DROP POLICY IF EXISTS "kuzatuv_select" ON kuzatuv;
DROP POLICY IF EXISTS "kuzatuv_all" ON kuzatuv;
CREATE POLICY "kuzatuv_all" ON kuzatuv
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- davolash ----
DROP POLICY IF EXISTS "davolash_select" ON davolash;
DROP POLICY IF EXISTS "davolash_all" ON davolash;
CREATE POLICY "davolash_all" ON davolash
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- holat_baxolash ----
DROP POLICY IF EXISTS "holat_baxolash_select" ON holat_baxolash;
DROP POLICY IF EXISTS "holat_baxolash_all" ON holat_baxolash;
CREATE POLICY "holat_baxolash_all" ON holat_baxolash
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- insult_chiqarish ----
DROP POLICY IF EXISTS "i_chiq_select" ON insult_chiqarish;
DROP POLICY IF EXISTS "i_chiq_insert" ON insult_chiqarish;
DROP POLICY IF EXISTS "i_chiq_update" ON insult_chiqarish;
DROP POLICY IF EXISTS "insult_chiqarish_all" ON insult_chiqarish;
CREATE POLICY "insult_chiqarish_all" ON insult_chiqarish
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- infarkt_chiqarish ----
DROP POLICY IF EXISTS "inf_chiq_select" ON infarkt_chiqarish;
DROP POLICY IF EXISTS "inf_chiq_insert" ON infarkt_chiqarish;
DROP POLICY IF EXISTS "inf_chiq_update" ON infarkt_chiqarish;
DROP POLICY IF EXISTS "infarkt_chiqarish_all" ON infarkt_chiqarish;
CREATE POLICY "infarkt_chiqarish_all" ON infarkt_chiqarish
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- bemor_fayllari ----
DROP POLICY IF EXISTS "files_select" ON bemor_fayllari;
DROP POLICY IF EXISTS "files_insert" ON bemor_fayllari;
DROP POLICY IF EXISTS "files_delete" ON bemor_fayllari;
DROP POLICY IF EXISTS "files_all" ON bemor_fayllari;
CREATE POLICY "files_all" ON bemor_fayllari
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- dinamika_muolajalar ----
DROP POLICY IF EXISTS "dm_select" ON dinamika_muolajalar;
DROP POLICY IF EXISTS "dm_insert" ON dinamika_muolajalar;
DROP POLICY IF EXISTS "dm_delete" ON dinamika_muolajalar;
DROP POLICY IF EXISTS "dm_all" ON dinamika_muolajalar;
CREATE POLICY "dm_all" ON dinamika_muolajalar
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- holat_dinamikasi ----
DROP POLICY IF EXISTS "hd_select" ON holat_dinamikasi;
DROP POLICY IF EXISTS "hd_insert" ON holat_dinamikasi;
DROP POLICY IF EXISTS "hd_delete" ON holat_dinamikasi;
DROP POLICY IF EXISTS "hd_all" ON holat_dinamikasi;
CREATE POLICY "hd_all" ON holat_dinamikasi
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- transfer_log (bemor harakati) ----
-- RLS yoqilmagan bo'lishi mumkin — avval yoqamiz
ALTER TABLE transfer_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transfer_select" ON transfer_log;
DROP POLICY IF EXISTS "transfer_all" ON transfer_log;
CREATE POLICY "transfer_all" ON transfer_log
  FOR ALL TO authenticated
  USING (can_access_ktno(kt_no)) WITH CHECK (can_access_ktno(kt_no));

-- ---- navbatchi_jurnal (navbatchilik — viloyatga bog'liq emas, hamma ko'radi) ----
-- Bu jurnal umumiy — o'zgartirmaymiz (kt_no yo'q). Agar viloyat ustuni bo'lsa,
-- keyinroq alohida cheklash mumkin.


-- ============================================================
-- get_demographics — SECURITY INVOKER ga o'tkazish (RLS avtomatik qo'llanadi)
-- Imzosi noaniq (1 yoki 2 argumentli) — ikkalasini xavfsiz sinaymiz.
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER FUNCTION get_demographics(text) SECURITY INVOKER;
    RAISE NOTICE 'get_demographics(text) -> SECURITY INVOKER';
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
  BEGIN
    ALTER FUNCTION get_demographics(text, text) SECURITY INVOKER;
    RAISE NOTICE 'get_demographics(text,text) -> SECURITY INVOKER';
  EXCEPTION WHEN undefined_function THEN NULL;
  END;
END $$;


-- ============================================================
-- ✅ TUGADI.
-- ============================================================

-- ⛔ ORQAGA QAYTARISH (agar biror child jadval buzilsa):
/*
DROP POLICY IF EXISTS "kuzatuv_all" ON kuzatuv;
CREATE POLICY "kuzatuv_select" ON kuzatuv FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "davolash_all" ON davolash;
CREATE POLICY "davolash_select" ON davolash FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "holat_baxolash_all" ON holat_baxolash;
CREATE POLICY "holat_baxolash_select" ON holat_baxolash FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insult_chiqarish_all" ON insult_chiqarish;
CREATE POLICY "i_chiq_select" ON insult_chiqarish FOR SELECT TO authenticated USING (true);
CREATE POLICY "i_chiq_insert" ON insult_chiqarish FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "i_chiq_update" ON insult_chiqarish FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "infarkt_chiqarish_all" ON infarkt_chiqarish;
CREATE POLICY "inf_chiq_select" ON infarkt_chiqarish FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "files_all" ON bemor_fayllari;
CREATE POLICY "files_select" ON bemor_fayllari FOR SELECT TO authenticated USING (true);
CREATE POLICY "files_insert" ON bemor_fayllari FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "files_delete" ON bemor_fayllari FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "dm_all" ON dinamika_muolajalar;
CREATE POLICY "dm_select" ON dinamika_muolajalar FOR SELECT TO authenticated USING (true);
CREATE POLICY "dm_insert" ON dinamika_muolajalar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dm_delete" ON dinamika_muolajalar FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "hd_all" ON holat_dinamikasi;
CREATE POLICY "hd_select" ON holat_dinamikasi FOR SELECT TO authenticated USING (true);
CREATE POLICY "hd_insert" ON holat_dinamikasi FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hd_delete" ON holat_dinamikasi FOR DELETE TO authenticated USING (true);
DROP POLICY IF EXISTS "transfer_all" ON transfer_log;
CREATE POLICY "transfer_select" ON transfer_log FOR SELECT TO authenticated USING (true);
*/
