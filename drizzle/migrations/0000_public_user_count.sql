CREATE OR REPLACE FUNCTION public.get_registered_user_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT p.user_id)::int
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE u.deleted_at IS NULL
    AND u.is_anonymous IS NOT TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles r
      WHERE r.user_id = p.user_id AND r.role = 'admin'
    );
$$;
REVOKE ALL ON FUNCTION public.get_registered_user_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registered_user_count() TO anon, authenticated, service_role;