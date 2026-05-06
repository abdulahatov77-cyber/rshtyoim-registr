-- ============================================================
-- SUTKALIK HISOBOT CRON (har kuni 07:30 Toshkent = 02:30 UTC)
-- Supabase Dashboard → SQL Editor da ishga tushiring
-- YOUR_PROJECT_REF va YOUR_SERVICE_ROLE_KEY ni almashtiring
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Eski cron ni o'chirish (agar bo'lsa)
SELECT cron.unschedule('daily-medical-report');

-- Yangi cron: har kuni soat 02:30 UTC (= 07:30 Toshkent UTC+5)
SELECT cron.schedule(
  'daily-medical-report',
  '30 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-report',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Tekshirish: cron ro'yxati
SELECT jobname, schedule, command FROM cron.job;
