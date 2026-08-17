-- =====================================================================
-- ROL RUXSATLARI — galochkalar orqali boshqariladigan huquqlar
-- =====================================================================
-- MUAMMO:
--   Ruxsatlar SQL funksiyalari ichiga qotirib yozilgan. O'zgartirish uchun
--   skript yozish kerak. 2026-08-15 da shu sababdan shifokorlar chiqarish
--   imkoniyatini yo'qotdi va buni topish yarim kun oldi.
--
-- YECHIM:
--   Ruxsatlar jadvalga ko'chiriladi. Super admin ularni "Foydalanuvchilar"
--   sahifasidagi galochkalar bilan boshqaradi. RLS funksiyalari qiymatni
--   shu jadvaldan o'qiydi.
--
-- MUHOFAZALAR (o'zgarmas, galochkaga bog'liq emas):
--   1. VILOYAT QAMROVI — shifokor/admin baribir faqat o'z viloyatida
--      ishlaydi. Galochka "amalni bajara oladimi" ni belgilaydi,
--      "qaysi bemorlarga" ni emas.
--   2. SUPER ADMIN har doim to'liq huquqli — o'zini qulflab qo'ya olmaydi.
--   3. RAHBAR hech qachon yoza olmaydi — faqat ko'rish.
--   4. Har bir o'zgarish jurnalga yoziladi.
--
-- TARTIB: butun faylni Supabase SQL Editor da bir marta ishga tushiring
-- =====================================================================


-- ============ 1. JADVAL ============

CREATE TABLE IF NOT EXISTS public.rol_ruxsatlari (
  rol        text NOT NULL CHECK (rol IN ('user', 'admin')),
  amal       text NOT NULL CHECK (amal IN ('kiritish','tahrirlash','chiqarish','otkazish','ochirish')),
  ruxsat     boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  PRIMARY KEY (rol, amal)
);

COMMENT ON TABLE public.rol_ruxsatlari IS
  'Rol bo''yicha amal ruxsatlari. Super admin panelda galochka bilan boshqaradi. '
  'Viloyat qamrovi bu yerda emas — u funksiyalarda qotib qolgan.';

-- Joriy holat (2026-08-17) bo'yicha boshlang'ich qiymatlar
INSERT INTO public.rol_ruxsatlari (rol, amal, ruxsat) VALUES
  ('user',  'kiritish',   true),
  ('user',  'tahrirlash', false),   -- ataylab yopiq
  ('user',  'chiqarish',  true),
  ('user',  'otkazish',   true),
  ('user',  'ochirish',   false),
  ('admin', 'kiritish',   true),
  ('admin', 'tahrirlash', true),
  ('admin', 'chiqarish',  true),
  ('admin', 'otkazish',   true),
  ('admin', 'ochirish',   false)
ON CONFLICT (rol, amal) DO NOTHING;


-- ============ 2. JURNAL ============

CREATE TABLE IF NOT EXISTS public.rol_ruxsatlari_jurnal (
  id         bigserial PRIMARY KEY,
  rol        text,
  amal       text,
  eski       boolean,
  yangi      boolean,
  kim        uuid,
  qachon     timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.trg_rol_ruxsat_jurnal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $fn$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.ruxsat IS NOT DISTINCT FROM OLD.ruxsat THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.rol_ruxsatlari_jurnal (rol, amal, eski, yangi, kim)
  VALUES (NEW.rol, NEW.amal, CASE WHEN TG_OP = 'UPDATE' THEN OLD.ruxsat END, NEW.ruxsat, auth.uid());
  RETURN NEW;
END $fn$;

DROP TRIGGER IF EXISTS rol_ruxsat_jurnal ON public.rol_ruxsatlari;
CREATE TRIGGER rol_ruxsat_jurnal
AFTER INSERT OR UPDATE ON public.rol_ruxsatlari
FOR EACH ROW EXECUTE FUNCTION public.trg_rol_ruxsat_jurnal();


-- ============ 3. ASOSIY FUNKSIYA ============
-- Joriy foydalanuvchi shu amalni bajara oladimi?

CREATE OR REPLACE FUNCTION public.rol_ruxsat(p_amal text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    -- Rahbar — faqat ko'rish. Profilida role='super_admin' bo'lgani uchun
    -- bu tekshiruv super_admin dan OLDIN turishi shart.
    WHEN (SELECT to_jsonb(p) ->> 'real_role'
            FROM public.profiles p WHERE p.id = auth.uid()) = 'rahbar' THEN false
    WHEN public.auth_role() = 'super_admin' THEN true
    ELSE coalesce((SELECT r.ruxsat FROM public.rol_ruxsatlari r
                    WHERE r.rol = public.auth_role() AND r.amal = p_amal), false)
  END;
$$;


-- ============ 4. MAVJUD RUXSAT FUNKSIYALARINI BOG'LASH ============
-- Viloyat qamrovi o'zgarmaydi — faqat "amal yoqilganmi" sharti qo'shiladi.

CREATE OR REPLACE FUNCTION public.qabul_can_update(p_viloyat text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN NOT public.rol_ruxsat('tahrirlash') THEN false
    WHEN public.auth_role() = 'super_admin' THEN true
    ELSE lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
  END;
$$;

CREATE OR REPLACE FUNCTION public.qabul_can_insert(
  p_viloyat text, p_muassasa text, p_user_id uuid
)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN p_user_id IS DISTINCT FROM auth.uid() THEN false
    WHEN NOT public.rol_ruxsat('kiritish') THEN false
    WHEN public.auth_role() = 'super_admin' THEN true
    WHEN public.auth_role() = 'admin' THEN
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
    WHEN public.auth_role() = 'user' THEN
      lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
      AND lower(btrim(coalesce(p_muassasa, ''))) = lower(btrim(coalesce(public.get_user_muassasa(), '')))
    ELSE false
  END;
$$;

-- O'chirish siyosatlari: ilgari faqat super_admin edi, endi galochkaga bog'liq.
-- Viloyat sharti qo'shildi — admin/shifokor boshqa viloyat yozuvini o'chirmasin.
CREATE OR REPLACE FUNCTION public.qabul_can_delete(p_viloyat text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    WHEN NOT public.rol_ruxsat('ochirish') THEN false
    WHEN public.auth_role() = 'super_admin' THEN true
    ELSE lower(btrim(coalesce(p_viloyat, ''))) = lower(btrim(coalesce(public.auth_viloyat(), '')))
  END;
$$;

DROP POLICY IF EXISTS infarkt_delete_hardened ON public.infarkt_qabul;
CREATE POLICY infarkt_delete_hardened ON public.infarkt_qabul
  FOR DELETE TO authenticated USING (public.qabul_can_delete(viloyat));

DROP POLICY IF EXISTS insult_delete_hardened ON public.insult_qabul;
CREATE POLICY insult_delete_hardened ON public.insult_qabul
  FOR DELETE TO authenticated USING (public.qabul_can_delete(viloyat));


-- ============ 5. CHIQARISH RPC GA GALOCHKANI BOG'LASH ============
-- bemor_chiqarish() ichida: 'otkazildi' -> otkazish, boshqasi -> chiqarish

CREATE OR REPLACE FUNCTION public.bemor_chiqarish_ruxsat(p_status text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT public.rol_ruxsat(CASE WHEN p_status = 'otkazildi' THEN 'otkazish' ELSE 'chiqarish' END);
$$;


-- ============ 6. JADVALGA RUXSAT ============

ALTER TABLE public.rol_ruxsatlari        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_ruxsatlari_jurnal ENABLE ROW LEVEL SECURITY;

-- O'qish: barcha kirgan foydalanuvchilar (interfeys o'z huquqini biladi)
DROP POLICY IF EXISTS rol_ruxsatlari_select ON public.rol_ruxsatlari;
CREATE POLICY rol_ruxsatlari_select ON public.rol_ruxsatlari
  FOR SELECT TO authenticated USING (true);

-- Yozish: to'g'ridan-to'g'ri MUMKIN EMAS — faqat pastdagi RPC orqali
DROP POLICY IF EXISTS rol_ruxsatlari_jurnal_select ON public.rol_ruxsatlari_jurnal;
CREATE POLICY rol_ruxsatlari_jurnal_select ON public.rol_ruxsatlari_jurnal
  FOR SELECT TO authenticated
  USING (public.auth_role() = 'super_admin');

GRANT SELECT ON public.rol_ruxsatlari TO authenticated;
GRANT SELECT ON public.rol_ruxsatlari_jurnal TO authenticated;


-- ============ 7. SAQLASH RPC — faqat super admin ============

CREATE OR REPLACE FUNCTION public.rol_ruxsat_saqla(p_rol text, p_amal text, p_ruxsat boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp
AS $fn$
DECLARE v_rahbar boolean;
BEGIN
  SELECT coalesce(to_jsonb(p) ->> 'real_role', '') = 'rahbar' INTO v_rahbar
    FROM public.profiles p WHERE p.id = auth.uid();

  IF coalesce(v_rahbar, true) OR public.auth_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Ruxsat yo''q: faqat super administrator o''zgartira oladi';
  END IF;

  IF p_rol NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Bu rol galochka bilan boshqarilmaydi: %', p_rol;
  END IF;

  INSERT INTO public.rol_ruxsatlari (rol, amal, ruxsat, updated_at, updated_by)
  VALUES (p_rol, p_amal, coalesce(p_ruxsat, false), now(), auth.uid())
  ON CONFLICT (rol, amal)
  DO UPDATE SET ruxsat = excluded.ruxsat, updated_at = now(), updated_by = auth.uid();

  RETURN true;
END $fn$;

REVOKE ALL ON FUNCTION public.rol_ruxsat_saqla(text, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.rol_ruxsat_saqla(text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rol_ruxsat(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.qabul_can_delete(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bemor_chiqarish_ruxsat(text) TO authenticated;


-- ============ 8. TEKSHIRUV ============
SELECT rol, amal, ruxsat FROM public.rol_ruxsatlari ORDER BY rol, amal;
