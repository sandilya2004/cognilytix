DROP POLICY IF EXISTS "Plan limits public" ON public.plan_limits;
CREATE POLICY "Admins read plan limits" ON public.plan_limits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.plan_limits FROM anon;

DROP POLICY IF EXISTS "Settings public" ON public.app_settings;
CREATE POLICY "Admins read settings" ON public.app_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.app_settings FROM anon;

CREATE OR REPLACE FUNCTION public.get_preview_mode()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT preview_mode FROM public.app_settings WHERE id = true), true)
$$;
GRANT EXECUTE ON FUNCTION public.get_preview_mode() TO anon, authenticated;