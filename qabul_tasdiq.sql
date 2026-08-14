-- =====================================================================
-- QABUL TASDIQLARI — "Qabul kutilmoqda" ro'yxatini shifokor yopadi
-- =====================================================================
-- Talab: bemor ro'yxatdan AVTOMATIK tushmasin. Faqat shifokorning aniq
--        amali bilan chiqsin:
--          1) "Qabul qilish" bosilib, bemor kiritilganda
--          2) yoki "Bu bemor muassasada mavjud" tasdiqlanganda
--
-- Nima uchun alohida jadval: yuboruvchi muassasaning yozuvini qabul
-- qiluvchi o'zgartira olmaydi (RLS UPDATE viloyat bilan cheklangan),
-- ayniqsa viloyatlararo yo'naltirishda. Shuning uchun tasdiq shu yerga
-- yoziladi.
--
-- TARTIB: butun faylni Supabase SQL Editor da bir marta ishga tushiring
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.qabul_tasdiq (
  id             bigserial PRIMARY KEY,
  manba_kt_no    text NOT NULL,                 -- yuboruvchidagi yozuv K/T
  registr_turi   text NOT NULL CHECK (registr_turi IN ('infarkt','insult')),
  qabul_muassasa text,                          -- kim yopdi
  yangi_kt_no    text,                          -- muassasadagi karta K/T (bo'lsa)
  sabab          text,                          -- 'qabul_qilindi' | 'allaqachon_mavjud'
  qabul_qilgan   uuid DEFAULT auth.uid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manba_kt_no, registr_turi)
);

CREATE INDEX IF NOT EXISTS qabul_tasdiq_kt_idx ON public.qabul_tasdiq (manba_kt_no);

ALTER TABLE public.qabul_tasdiq ENABLE ROW LEVEL SECURITY;

-- O'qish: barcha autentifikatsiyadan o'tganlar (ro'yxat shu bo'yicha filtrlanadi)
DROP POLICY IF EXISTS qabul_tasdiq_select ON public.qabul_tasdiq;
CREATE POLICY qabul_tasdiq_select ON public.qabul_tasdiq
  FOR SELECT TO authenticated USING (true);

-- Yozish: barcha autentifikatsiyadan o'tganlar — qabul qiluvchi shifokor
DROP POLICY IF EXISTS qabul_tasdiq_insert ON public.qabul_tasdiq;
CREATE POLICY qabul_tasdiq_insert ON public.qabul_tasdiq
  FOR INSERT TO authenticated WITH CHECK (true);

-- Xato bosilgan tasdiqni qaytarish — faqat o'zi yopgan yozuvni yoki super_admin
DROP POLICY IF EXISTS qabul_tasdiq_delete ON public.qabul_tasdiq;
CREATE POLICY qabul_tasdiq_delete ON public.qabul_tasdiq
  FOR DELETE TO authenticated
  USING (
    qabul_qilgan = auth.uid()
    OR (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) = 'super_admin'
  );

GRANT SELECT, INSERT, DELETE ON public.qabul_tasdiq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.qabul_tasdiq_id_seq TO authenticated;


-- ============ TEKSHIRUV ============
SELECT COUNT(*) AS tasdiqlar FROM public.qabul_tasdiq;
