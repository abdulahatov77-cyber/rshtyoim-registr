-- ============================================================
-- DEMOGRAFIYA FUNKSIYASI (limitdan xoli, server-side hisoblash)
-- Supabase Dashboard → SQL Editor da ishga tushiring
-- ============================================================
DROP FUNCTION IF EXISTS get_demographics(text);

CREATE OR REPLACE FUNCTION get_demographics(p_viloyat text DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE cy int := date_part('year', now())::int;
BEGIN
  RETURN (
    WITH rows AS (
      SELECT 'infarkt'::text AS t, jins,
        CASE
          WHEN tugilgan_yil  ~ '^[12][0-9]{3}' THEN left(tugilgan_yil, 4)::int
          WHEN tugilgan_sana ~ '^[12][0-9]{3}' THEN left(tugilgan_sana, 4)::int
          WHEN tugilgan_sana ~ '[12][0-9]{3}$'  THEN right(tugilgan_sana, 4)::int
        END AS yr
      FROM infarkt_qabul
      WHERE p_viloyat IS NULL OR viloyat = p_viloyat
      UNION ALL
      SELECT 'insult', jins,
        CASE
          WHEN tugilgan_yil  ~ '^[12][0-9]{3}' THEN left(tugilgan_yil, 4)::int
          WHEN tugilgan_sana ~ '^[12][0-9]{3}' THEN left(tugilgan_sana, 4)::int
          WHEN tugilgan_sana ~ '[12][0-9]{3}$'  THEN right(tugilgan_sana, 4)::int
        END AS yr
      FROM insult_qabul
      WHERE p_viloyat IS NULL OR viloyat = p_viloyat
    )
    SELECT json_build_object(
      'infarkt', json_build_object(
        'male',   COUNT(*) FILTER (WHERE t='infarkt' AND lower(coalesce(jins,'')) IN ('erkak','e','m','male')),
        'female', COUNT(*) FILTER (WHERE t='infarkt' AND lower(coalesce(jins,'')) IN ('ayol','a','f','female')),
        'ages', json_build_object(
          '≤29',  COUNT(*) FILTER (WHERE t='infarkt' AND yr IS NOT NULL AND cy-yr<=29),
          '30-44',COUNT(*) FILTER (WHERE t='infarkt' AND yr IS NOT NULL AND cy-yr BETWEEN 30 AND 44),
          '45-59',COUNT(*) FILTER (WHERE t='infarkt' AND yr IS NOT NULL AND cy-yr BETWEEN 45 AND 59),
          '60-74',COUNT(*) FILTER (WHERE t='infarkt' AND yr IS NOT NULL AND cy-yr BETWEEN 60 AND 74),
          '75+',  COUNT(*) FILTER (WHERE t='infarkt' AND yr IS NOT NULL AND cy-yr>=75)
        )
      ),
      'insult', json_build_object(
        'male',   COUNT(*) FILTER (WHERE t='insult' AND lower(coalesce(jins,'')) IN ('erkak','e','m','male')),
        'female', COUNT(*) FILTER (WHERE t='insult' AND lower(coalesce(jins,'')) IN ('ayol','a','f','female')),
        'ages', json_build_object(
          '≤29',  COUNT(*) FILTER (WHERE t='insult' AND yr IS NOT NULL AND cy-yr<=29),
          '30-44',COUNT(*) FILTER (WHERE t='insult' AND yr IS NOT NULL AND cy-yr BETWEEN 30 AND 44),
          '45-59',COUNT(*) FILTER (WHERE t='insult' AND yr IS NOT NULL AND cy-yr BETWEEN 45 AND 59),
          '60-74',COUNT(*) FILTER (WHERE t='insult' AND yr IS NOT NULL AND cy-yr BETWEEN 60 AND 74),
          '75+',  COUNT(*) FILTER (WHERE t='insult' AND yr IS NOT NULL AND cy-yr>=75)
        )
      )
    ) FROM rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_demographics(text) TO anon, authenticated;

-- ============================================================
-- TTB yozuvlarini Emergency Department ga o'zgartirish
UPDATE infarkt_qabul SET muassasa = REPLACE(muassasa, ' TTB', ' Emergency Department');
UPDATE insult_qabul SET muassasa = REPLACE(muassasa, ' TTB', ' Emergency Department');

UPDATE infarkt_qabul SET muassasa = REPLACE(muassasa, ' ttb', ' Emergency Department');
UPDATE insult_qabul SET muassasa = REPLACE(muassasa, ' ttb', ' Emergency Department');

UPDATE infarkt_qabul SET muassasa = REPLACE(muassasa, ' ShTTB', ' shahar Emergency Department');
UPDATE insult_qabul SET muassasa = REPLACE(muassasa, ' ShTTB', ' shahar Emergency Department');

UPDATE infarkt_qabul SET muassasa = REPLACE(muassasa, ' shahar TTB', ' shahar Emergency Department');
UPDATE insult_qabul SET muassasa = REPLACE(muassasa, ' shahar TTB', ' shahar Emergency Department');

UPDATE infarkt_qabul SET muassasa = REPLACE(muassasa, ' shoshilinch tibbiy yordam markazi', ' Emergency Department');
UPDATE insult_qabul SET muassasa = REPLACE(muassasa, ' shoshilinch tibbiy yordam markazi', ' Emergency Department');

UPDATE infarkt_qabul SET muassasa = REPLACE(muassasa, ' filial', ' filiali') WHERE muassasa LIKE '%RSHTYOIM%';
UPDATE insult_qabul SET muassasa = REPLACE(muassasa, ' filial', ' filiali') WHERE muassasa LIKE '%RSHTYOIM%';


-- Adminlarga bemorlarni o'chirish (DELETE) ruxsatini qo'shish
DROP POLICY IF EXISTS "infarkt_delete" ON infarkt_qabul;
DROP POLICY IF EXISTS "insult_delete" ON insult_qabul;

CREATE POLICY "infarkt_delete" ON infarkt_qabul FOR DELETE TO authenticated USING (true);
CREATE POLICY "insult_delete" ON insult_qabul FOR DELETE TO authenticated USING (true);

-- ============================================================
-- MULTIMEDIA FUNKSIYASI (FAYLLAR YUKLASH UCHUN)
-- ============================================================

-- Bemor fayllari jadvalini yaratish
CREATE TABLE IF NOT EXISTS bemor_fayllari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  kt_no TEXT NOT NULL,
  registr_turi TEXT NOT NULL,
  tur TEXT NOT NULL,
  nomi TEXT NOT NULL,
  izoh TEXT,
  path TEXT NOT NULL,
  url TEXT NOT NULL
);

-- Ruxsatlar
ALTER TABLE bemor_fayllari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "files_select" ON bemor_fayllari;
DROP POLICY IF EXISTS "files_insert" ON bemor_fayllari;
DROP POLICY IF EXISTS "files_delete" ON bemor_fayllari;
CREATE POLICY "files_select" ON bemor_fayllari FOR SELECT TO authenticated USING (true);
CREATE POLICY "files_insert" ON bemor_fayllari FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "files_delete" ON bemor_fayllari FOR DELETE TO authenticated USING (true);

-- Dinamikada bajarilgan muolajalar tarixi jadvali
CREATE TABLE IF NOT EXISTS dinamika_muolajalar (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  kt_no       TEXT NOT NULL,
  registr_turi TEXT NOT NULL,
  muolaja_turi TEXT NOT NULL,
  izoh        TEXT,
  shifokor_fio TEXT
);

ALTER TABLE dinamika_muolajalar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dm_select" ON dinamika_muolajalar;
DROP POLICY IF EXISTS "dm_insert" ON dinamika_muolajalar;
DROP POLICY IF EXISTS "dm_delete" ON dinamika_muolajalar;
CREATE POLICY "dm_select" ON dinamika_muolajalar FOR SELECT TO authenticated USING (true);
CREATE POLICY "dm_insert" ON dinamika_muolajalar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dm_delete" ON dinamika_muolajalar FOR DELETE TO authenticated USING (true);

-- Holat dinamikasi jadvali (kunlik vitals monitoring)
CREATE TABLE IF NOT EXISTS holat_dinamikasi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT now(),
  kt_no        TEXT NOT NULL,
  registr_turi TEXT NOT NULL,
  qon_bosimi   TEXT,
  puls         INTEGER,
  temperatura  NUMERIC(4,1),
  holat        TEXT,
  izoh         TEXT,
  shifokor_fio TEXT
);
ALTER TABLE holat_dinamikasi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hd_select" ON holat_dinamikasi;
DROP POLICY IF EXISTS "hd_insert" ON holat_dinamikasi;
DROP POLICY IF EXISTS "hd_delete" ON holat_dinamikasi;
CREATE POLICY "hd_select" ON holat_dinamikasi FOR SELECT TO authenticated USING (true);
CREATE POLICY "hd_insert" ON holat_dinamikasi FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "hd_delete" ON holat_dinamikasi FOR DELETE TO authenticated USING (true);

-- Navbatchi shifokor jurnali
CREATE TABLE IF NOT EXISTS navbatchi_jurnal (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  kt_no           TEXT NOT NULL,
  registr_turi    TEXT NOT NULL,
  holat_baholash  TEXT,
  keyingi_shifokor TEXT,
  izoh            TEXT,
  shifokor_fio    TEXT
);
ALTER TABLE navbatchi_jurnal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nj_select" ON navbatchi_jurnal;
DROP POLICY IF EXISTS "nj_insert" ON navbatchi_jurnal;
DROP POLICY IF EXISTS "nj_delete" ON navbatchi_jurnal;
CREATE POLICY "nj_select" ON navbatchi_jurnal FOR SELECT TO authenticated USING (true);
CREATE POLICY "nj_insert" ON navbatchi_jurnal FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "nj_delete" ON navbatchi_jurnal FOR DELETE TO authenticated USING (true);

-- Supabase Storage bucket (SQL orqali yaratib bo'lmasa, Dashboard orqali yaratish so'raladi)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('multimedia', 'multimedia', true);
-- CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'multimedia');
-- CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'multimedia');
-- CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'multimedia');
