REVOKE ALL ON public.customer_stories FROM anon, authenticated;
GRANT ALL ON public.customer_stories TO service_role;
COMMENT ON FUNCTION public.list_customer_stories(integer) IS 'Public story fields only: email is intentionally excluded; direct table access is revoked.';