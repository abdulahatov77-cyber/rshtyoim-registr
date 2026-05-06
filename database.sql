-- ============================================================
-- RSHTYOIM — Infarkt va Insult Registr (v3 — To'liq tozalangan)
-- Supabase SQL Editor ga to'liq joylashtiring va Run bosing
-- ============================================================

-- Eski trigger va funksiyalarni o'chirish (agar mavjud bo'lsa)
DROP TRIGGER IF EXISTS infarkt_admission_trigger ON infarkt_qabul;
DROP TRIGGER IF EXISTS insult_admission_trigger ON insult_qabul;
DROP FUNCTION IF EXISTS notify_on_admission();

-- ============================================================
-- 1. INFARKT_QABUL
-- ============================================================
CREATE TABLE IF NOT EXISTS infarkt_qabul (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  viloyat               TEXT NOT NULL,
  muassasa              TEXT NOT NULL,
  kt_no                 TEXT UNIQUE NOT NULL,
  qabul_vaqt            TIMESTAMPTZ NOT NULL,
  murojaat_yoli         TEXT,
  yuborgan_muassasa     TEXT,
  fio                   TEXT NOT NULL,
  tugilgan_yil          TEXT,
  jins                  TEXT,
  simptom_vaqt          TEXT,
  asosiy_simptom        TEXT,
  qon_bosimi            TEXT,
  ekg_natija            TEXT[],
  troponin              TEXT,
  kkfmb                 TEXT,
  xavf_omil             TEXT[],
  infarkt_turi          TEXT,
  killip                TEXT,
  muolaja_turi          TEXT,
  angio_natija          TEXT,
  otkazilgan_muassasa   TEXT,
  shifokor_fio          TEXT,
  aha_bali              INT,
  birlamchi_yoki_takroriy TEXT,
  birinchi_murojaat_vaqti TEXT,
  tez_yordam_kelgan_vaqt TEXT,
  ekg_vaqti             TEXT,
  ejeksiya_fraksiyasi   TEXT,
  asoratlar             TEXT[],
  status                TEXT DEFAULT 'active',
  user_id               UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 2. INSULT_QABUL
-- ============================================================
CREATE TABLE IF NOT EXISTS insult_qabul (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  viloyat               TEXT NOT NULL,
  muassasa              TEXT NOT NULL,
  kt_no                 TEXT UNIQUE NOT NULL,
  qabul_vaqt            TIMESTAMPTZ NOT NULL,
  murojaat_yoli         TEXT,
  yuborgan_muassasa     TEXT,
  fio                   TEXT NOT NULL,
  tugilgan_yil          TEXT,
  jins                  TEXT,
  simptom_vaqt          TEXT,
  nihss_qabul           INT,
  gcs_qabul             INT,
  insult_turi           TEXT,
  qon_bosimi            TEXT,
  xavf_omil             TEXT[],
  mskt                  TEXT,
  muolaja_turi          TEXT,
  birlamchi_yoki_takroriy TEXT,
  birinchi_murojaat_vaqti TEXT,
  tez_yordam_kelgan_vaqt TEXT,
  yutish_testi          TEXT,
  trombolizis_vaqti     TEXT,
  trombektomiya_vaqti   TEXT,
  reabilitatsiya_boshlangan_vaqt TEXT,
  status                TEXT DEFAULT 'active',
  user_id               UUID REFERENCES auth.users(id)
);

-- ============================================================
-- 3. INSULT_CHIQARISH
-- ============================================================
CREATE TABLE IF NOT EXISTS insult_chiqarish (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  kt_no                 TEXT REFERENCES insult_qabul(kt_no),
  viloyat               TEXT,
  kelgan_sana           DATE,
  chiqish_sana          DATE,
  nihss_chiqish         INT,
  mrs_daraja            TEXT,
  natija                TEXT,
  boshqa_shifo          TEXT,
  reab_markazi          TEXT
);

-- ============================================================
-- 4. INFARKT_CHIQARISH
-- ============================================================
CREATE TABLE IF NOT EXISTS infarkt_chiqarish (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  kt_no                 TEXT REFERENCES infarkt_qabul(kt_no),
  chiqish_sana          DATE,
  chiqish_holat         TEXT,
  olim_sababi           TEXT,
  statsionarda_kun      INT,
  yakuniy_diagnoz       TEXT,
  tavsiyalar            TEXT
);

-- ============================================================
-- 5. KUZATUV (Follow-up) - 30 kun, 3 oy, 6 oy, 1 yil
-- ============================================================
CREATE TABLE IF NOT EXISTS kuzatuv (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  registr_turi          TEXT NOT NULL,
  kt_no                 TEXT NOT NULL,
  kuzatuv_davri         TEXT NOT NULL, -- '30_kun', '3_oy', '6_oy', '1_yil'
  holati                TEXT,          -- 'Yaxshi', 'Qayta yotqizildi', 'Olim'
  qayta_xuruj           BOOLEAN DEFAULT false,
  nogironlik_guruhi     TEXT,
  shifokor_fio          TEXT,
  izoh                  TEXT
);

-- ============================================================
-- 5. DAVOLASH
-- ============================================================
CREATE TABLE IF NOT EXISTS davolash (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  registr_turi          TEXT NOT NULL,
  kt_no                 TEXT NOT NULL,
  dori_nomi             TEXT NOT NULL,
  doza                  TEXT,
  yolak                 TEXT,
  chastota              TEXT,
  boshlanish_vaqt       TIMESTAMPTZ DEFAULT now(),
  status                TEXT DEFAULT 'active',
  izoh                  TEXT,
  shifokor              TEXT
);

-- ============================================================
-- 6. HOLAT_BAXOLASH
-- ============================================================
CREATE TABLE IF NOT EXISTS holat_baxolash (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  registr_turi          TEXT NOT NULL,
  kt_no                 TEXT NOT NULL,
  vaqt                  TIMESTAMPTZ DEFAULT now(),
  qon_bosimi            TEXT,
  yurak_urish           INT,
  spo2                  INT,
  temperatura           FLOAT,
  nihss_ball            INT,
  gcs_ball              INT,
  killip_klass          TEXT,
  izoh                  TEXT,
  shifokor              TEXT
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE infarkt_qabul     ENABLE ROW LEVEL SECURITY;
ALTER TABLE insult_qabul      ENABLE ROW LEVEL SECURITY;
ALTER TABLE insult_chiqarish  ENABLE ROW LEVEL SECURITY;
ALTER TABLE infarkt_chiqarish ENABLE ROW LEVEL SECURITY;
ALTER TABLE davolash          ENABLE ROW LEVEL SECURITY;
ALTER TABLE holat_baxolash    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kuzatuv           ENABLE ROW LEVEL SECURITY;

-- infarkt_qabul
DROP POLICY IF EXISTS "infarkt_select" ON infarkt_qabul;
DROP POLICY IF EXISTS "infarkt_insert" ON infarkt_qabul;
DROP POLICY IF EXISTS "infarkt_update" ON infarkt_qabul;
DROP POLICY IF EXISTS "infarkt_delete" ON infarkt_qabul;
CREATE POLICY "infarkt_select" ON infarkt_qabul FOR SELECT TO authenticated USING (true);
CREATE POLICY "infarkt_insert" ON infarkt_qabul FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "infarkt_update" ON infarkt_qabul FOR UPDATE TO authenticated USING (true);
CREATE POLICY "infarkt_delete" ON infarkt_qabul FOR DELETE TO authenticated USING (true);

-- insult_qabul
DROP POLICY IF EXISTS "insult_select" ON insult_qabul;
DROP POLICY IF EXISTS "insult_insert" ON insult_qabul;
DROP POLICY IF EXISTS "insult_update" ON insult_qabul;
DROP POLICY IF EXISTS "insult_delete" ON insult_qabul;
CREATE POLICY "insult_select" ON insult_qabul FOR SELECT TO authenticated USING (true);
CREATE POLICY "insult_insert" ON insult_qabul FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insult_update" ON insult_qabul FOR UPDATE TO authenticated USING (true);
CREATE POLICY "insult_delete" ON insult_qabul FOR DELETE TO authenticated USING (true);

-- insult_chiqarish
DROP POLICY IF EXISTS "i_chiq_select" ON insult_chiqarish;
DROP POLICY IF EXISTS "i_chiq_insert" ON insult_chiqarish;
DROP POLICY IF EXISTS "i_chiq_update" ON insult_chiqarish;
CREATE POLICY "i_chiq_select" ON insult_chiqarish FOR SELECT TO authenticated USING (true);
CREATE POLICY "i_chiq_insert" ON insult_chiqarish FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "i_chiq_update" ON insult_chiqarish FOR UPDATE TO authenticated USING (true);

-- infarkt_chiqarish
DROP POLICY IF EXISTS "inf_chiq_select" ON infarkt_chiqarish;
DROP POLICY IF EXISTS "inf_chiq_insert" ON infarkt_chiqarish;
DROP POLICY IF EXISTS "inf_chiq_update" ON infarkt_chiqarish;
CREATE POLICY "inf_chiq_select" ON infarkt_chiqarish FOR SELECT TO authenticated USING (true);
CREATE POLICY "inf_chiq_insert" ON infarkt_chiqarish FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inf_chiq_update" ON infarkt_chiqarish FOR UPDATE TO authenticated USING (true);

-- davolash
DROP POLICY IF EXISTS "dav_select" ON davolash;
DROP POLICY IF EXISTS "dav_insert" ON davolash;
DROP POLICY IF EXISTS "dav_update" ON davolash;
CREATE POLICY "dav_select" ON davolash FOR SELECT TO authenticated USING (true);
CREATE POLICY "dav_insert" ON davolash FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "dav_update" ON davolash FOR UPDATE TO authenticated USING (true);

-- holat_baxolash
DROP POLICY IF EXISTS "holat_select" ON holat_baxolash;
DROP POLICY IF EXISTS "holat_insert" ON holat_baxolash;
DROP POLICY IF EXISTS "holat_update" ON holat_baxolash;
CREATE POLICY "holat_select" ON holat_baxolash FOR SELECT TO authenticated USING (true);
CREATE POLICY "holat_insert" ON holat_baxolash FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "holat_update" ON holat_baxolash FOR UPDATE TO authenticated USING (true);

-- kuzatuv
DROP POLICY IF EXISTS "kuzatuv_select" ON kuzatuv;
DROP POLICY IF EXISTS "kuzatuv_insert" ON kuzatuv;
DROP POLICY IF EXISTS "kuzatuv_update" ON kuzatuv;
CREATE POLICY "kuzatuv_select" ON kuzatuv FOR SELECT TO authenticated USING (true);
CREATE POLICY "kuzatuv_insert" ON kuzatuv FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "kuzatuv_update" ON kuzatuv FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- INDEKSLAR
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_infarkt_kt_no     ON infarkt_qabul(kt_no);
CREATE INDEX IF NOT EXISTS idx_infarkt_status    ON infarkt_qabul(status);
CREATE INDEX IF NOT EXISTS idx_infarkt_vaqt      ON infarkt_qabul(qabul_vaqt DESC);
CREATE INDEX IF NOT EXISTS idx_infarkt_viloyat   ON infarkt_qabul(viloyat);

CREATE INDEX IF NOT EXISTS idx_insult_kt_no      ON insult_qabul(kt_no);
CREATE INDEX IF NOT EXISTS idx_insult_status     ON insult_qabul(status);
CREATE INDEX IF NOT EXISTS idx_insult_vaqt       ON insult_qabul(qabul_vaqt DESC);
CREATE INDEX IF NOT EXISTS idx_insult_viloyat    ON insult_qabul(viloyat);

CREATE INDEX IF NOT EXISTS idx_davolash_kt_no    ON davolash(kt_no);
CREATE INDEX IF NOT EXISTS idx_davolash_status   ON davolash(status);

CREATE INDEX IF NOT EXISTS idx_holat_kt_no       ON holat_baxolash(kt_no);

CREATE INDEX IF NOT EXISTS idx_kuzatuv_kt_no     ON kuzatuv(kt_no);
