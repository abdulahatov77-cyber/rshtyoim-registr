-- Eski (ochiq qolgan) sahifadan saqlangan yozuvlarda ham tasvir_turi to'ldiriladi (2026-11-11, bazaga qo'llangan).
-- MSKT "Ha" bo'lib tasvir_turi bo'sh kelsa — 'MSKT' qo'yiladi. MRT va "Yo'q" holatlariga tegmaydi.
-- Sinov (rollback): bo'sh qolganlar 0, MRT saqlanadi, "Yo'q"da bo'sh qoladi, eski kod yo'li 'MSKT' oladi.
CREATE OR REPLACE FUNCTION public.trg_insult_tasvir_turi() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.tasvir_turi IS NULL AND lower(btrim(coalesce(NEW.mskt,''))) LIKE 'ha%' THEN NEW.tasvir_turi := 'MSKT'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_insult_tasvir_turi ON public.insult_qabul;
CREATE TRIGGER trg_insult_tasvir_turi BEFORE INSERT OR UPDATE OF mskt, tasvir_turi ON public.insult_qabul FOR EACH ROW EXECUTE FUNCTION public.trg_insult_tasvir_turi();
UPDATE public.insult_qabul SET tasvir_turi = 'MSKT' WHERE tur_tasdiqlangan AND tasvir_turi IS NULL;
