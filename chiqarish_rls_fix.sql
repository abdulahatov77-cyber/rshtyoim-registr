-- =====================================================================
-- CHIQARISH VA DINAMIKA JADVALLARI — RLS TUZATISH
-- 2026-08-07
--
-- MUAMMO 1 — cross-viloyat kirish:
--   inf_chiq_select / i_chiq_select / inf_chiq_update / i_chiq_update
--   siyosatlarida qual = true. RLS siyosatlari YOKI bilan birlashgani uchun
--   yonidagi to'g'ri yozilgan siyosatni bekor qiladi. Natijada Farg'onadagi
--   shifokor Andijon bemorining chiqarish varaqasini o'qiy ham, o'zgartira
--   ham oladi. dm_select / dm_delete da ham shunday — istalgan foydalanuvchi
--   istalgan dinamik muolajani o'chira oladi.
--
-- MUAMMO 2 — dublikat chiqarish varaqalari:
--   Chiqarish jadvallarida DELETE siyosati UMUMAN YO'Q. Ilova esa varaqani
--   saqlashda avval eskisini o'chirishga urinadi (supabase.js: chiqarishQosh
--   -> delete().eq('kt_no', ...) keyin insert). RLS bu delete ni jimgina
--   bloklaydi — xato ham qaytmaydi, 0 qator o'chadi — keyin insert yangi
--   varaqa qo'shadi. Shu sababli 29-iyulda tozalagan takroriy varaqalar
--   yana to'planaveradi.
--
-- MUHIM: eski siyosatlarni shunchaki o'chirib bo'lmaydi. Ular o'rniga
-- yozilgan "to'g'ri" siyosat (infarkt_chiqarish_select) ikki sababga ko'ra
-- ishlamaydi: (1) unda super_admin yo'q, faqat 'admin' tekshiriladi;
-- (2) u infarkt_qabul_id bo'yicha bog'lanadi, bu ustun esa 6220 dan 6220
-- qatorda BO'SH. Shuning uchun yangi siyosatlar kt_no bo'yicha bog'lanadi —
-- ilova ham aynan shunday ishlaydi.
--
-- Ishga tushirgandan keyin darhol tekshirish kerak bo'lgan narsalar
-- fayl oxirida yozilgan.
-- =====================================================================

BEGIN;

-- ==================== infarkt_chiqarish ====================
DROP POLICY IF EXISTS inf_chiq_select           ON public.infarkt_chiqarish;
DROP POLICY IF EXISTS inf_chiq_update           ON public.infarkt_chiqarish;
DROP POLICY IF EXISTS inf_chiq_insert           ON public.infarkt_chiqarish;
DROP POLICY IF EXISTS infarkt_chiqarish_select  ON public.infarkt_chiqarish;
DROP POLICY IF EXISTS infarkt_chiqarish_update  ON public.infarkt_chiqarish;
DROP POLICY IF EXISTS infarkt_chiqarish_insert  ON public.infarkt_chiqarish;

CREATE POLICY inf_chiq_select_v3 ON public.infarkt_chiqarish
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('super_admin','admin','rahbar')
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.infarkt_qabul q
               WHERE q.kt_no = infarkt_chiqarish.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

CREATE POLICY inf_chiq_insert_v3 ON public.infarkt_chiqarish
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.infarkt_qabul q
               WHERE q.kt_no = infarkt_chiqarish.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

CREATE POLICY inf_chiq_update_v3 ON public.infarkt_chiqarish
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.infarkt_qabul q
               WHERE q.kt_no = infarkt_chiqarish.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

-- Yangi: DELETE. Busiz varaqa qayta to'ldirilganda dublikat paydo bo'ladi.
CREATE POLICY inf_chiq_delete_v3 ON public.infarkt_chiqarish
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.infarkt_qabul q
               WHERE q.kt_no = infarkt_chiqarish.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

-- ==================== insult_chiqarish ====================
DROP POLICY IF EXISTS i_chiq_select           ON public.insult_chiqarish;
DROP POLICY IF EXISTS i_chiq_update           ON public.insult_chiqarish;
DROP POLICY IF EXISTS i_chiq_insert           ON public.insult_chiqarish;
DROP POLICY IF EXISTS insult_chiqarish_select ON public.insult_chiqarish;
DROP POLICY IF EXISTS insult_chiqarish_update ON public.insult_chiqarish;
DROP POLICY IF EXISTS insult_chiqarish_insert ON public.insult_chiqarish;

CREATE POLICY ins_chiq_select_v3 ON public.insult_chiqarish
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('super_admin','admin','rahbar')
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.insult_qabul q
               WHERE q.kt_no = insult_chiqarish.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

CREATE POLICY ins_chiq_insert_v3 ON public.insult_chiqarish
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.insult_qabul q
               WHERE q.kt_no = insult_chiqarish.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

CREATE POLICY ins_chiq_update_v3 ON public.insult_chiqarish
  FOR UPDATE TO authenticated
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.insult_qabul q
               WHERE q.kt_no = insult_chiqarish.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

CREATE POLICY ins_chiq_delete_v3 ON public.insult_chiqarish
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.insult_qabul q
               WHERE q.kt_no = insult_chiqarish.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

-- ==================== dinamika_muolajalar ====================
DROP POLICY IF EXISTS dm_select ON public.dinamika_muolajalar;
DROP POLICY IF EXISTS dm_delete ON public.dinamika_muolajalar;

CREATE POLICY dm_select_v3 ON public.dinamika_muolajalar
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('super_admin','admin','rahbar')
    OR EXISTS (SELECT 1 FROM public.infarkt_qabul q
               WHERE q.kt_no = dinamika_muolajalar.kt_no
                 AND q.viloyat = public.get_user_viloyat())
    OR EXISTS (SELECT 1 FROM public.insult_qabul q
               WHERE q.kt_no = dinamika_muolajalar.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

CREATE POLICY dm_delete_v3 ON public.dinamika_muolajalar
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.infarkt_qabul q
               WHERE q.kt_no = dinamika_muolajalar.kt_no
                 AND q.viloyat = public.get_user_viloyat())
    OR EXISTS (SELECT 1 FROM public.insult_qabul q
               WHERE q.kt_no = dinamika_muolajalar.kt_no
                 AND q.viloyat = public.get_user_viloyat())
  );

COMMIT;

-- ============ TEKSHIRUV ============
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('infarkt_chiqarish','insult_chiqarish','dinamika_muolajalar')
ORDER BY tablename, cmd, policyname;

-- =====================================================================
-- ORQAGA QAYTARISH (agar biror narsa ko'rinmay qolsa)
-- =====================================================================
-- CREATE POLICY inf_chiq_select ON public.infarkt_chiqarish FOR SELECT TO authenticated USING (true);
-- CREATE POLICY inf_chiq_update ON public.infarkt_chiqarish FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY i_chiq_select   ON public.insult_chiqarish  FOR SELECT TO authenticated USING (true);
-- CREATE POLICY i_chiq_update   ON public.insult_chiqarish  FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY dm_select       ON public.dinamika_muolajalar FOR SELECT TO authenticated USING (true);
-- CREATE POLICY dm_delete       ON public.dinamika_muolajalar FOR DELETE TO authenticated USING (true);
