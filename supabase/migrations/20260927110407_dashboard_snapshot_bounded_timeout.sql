alter function public.get_dashboard_snapshot(text,text,timestamptz,timestamptz,timestamptz,timestamptz) set statement_timeout='25s'; NOTIFY pgrst, 'reload schema';
