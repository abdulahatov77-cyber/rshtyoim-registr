-- Ma'lumot tuzatish (2026-10-05, bazaga qo'llangan): qabul–chiqarish oralig'idan tashqarida
-- turgan 272 ta dinamik muolaja vaqti chegaraga surildi (foydalanuvchi qarori: chiqarish
-- sanasi to'g'ri deb olinadi). 271 tasi chiqarishdan keyin edi (162 tasi o'sha kunning
-- o'zida, 52 tasi 1–7 kun, 47 tasi 7 kundan ko'p), 1 tasi qabuldan oldin.
-- Eski vaqtlar public.dinamika_vaqt_backup_20261005 jadvalida (id, eski_created_at, yangi_created_at).
-- Qaytarish: UPDATE public.dinamika_muolajalar d SET created_at = b.eski_created_at
--            FROM public.dinamika_vaqt_backup_20261005 b WHERE d.id = b.id;
-- Natija: davolash oqimidagi vaqt muammolari — insult 0, infarkt 2 (bog'lanmagan eski yozuvlar).
CREATE TABLE IF NOT EXISTS public.dinamika_vaqt_backup_20261005 (id uuid PRIMARY KEY, eski_created_at timestamptz, yangi_created_at timestamptz);
ALTER TABLE public.dinamika_vaqt_backup_20261005 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.dinamika_vaqt_backup_20261005 FROM anon, authenticated;
WITH q AS (
  SELECT q.id, q.qabul_vaqt, c.chiqish_sana cs FROM public.infarkt_qabul q LEFT JOIN public.infarkt_chiqarish c ON c.infarkt_qabul_id=q.id
  UNION ALL SELECT q.id, q.qabul_vaqt, c.chiqish_sana FROM public.insult_qabul q LEFT JOIN public.insult_chiqarish c ON c.insult_qabul_id=q.id),
f AS (SELECT d.id, d.created_at eski,
        CASE WHEN d.created_at < q.qabul_vaqt THEN q.qabul_vaqt ELSE q.cs END yangi
      FROM public.dinamika_muolajalar d JOIN q ON q.id = d.qabul_id
      WHERE d.created_at < q.qabul_vaqt OR d.created_at > q.cs),
b AS (INSERT INTO public.dinamika_vaqt_backup_20261005 SELECT id, eski, yangi FROM f ON CONFLICT (id) DO NOTHING RETURNING id)
UPDATE public.dinamika_muolajalar d SET created_at = f.yangi FROM f WHERE d.id = f.id;
