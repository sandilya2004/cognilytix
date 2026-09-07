-- profiles: restrict reads to the owner (admins use service-role backend functions)
DROP POLICY IF EXISTS "Profiles viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- shared_reports: no public direct table reads; served via edge function
DROP POLICY IF EXISTS "Public can view non-expired shared reports" ON public.shared_reports;
REVOKE SELECT ON public.shared_reports FROM anon;

-- pending_requests: stricter submission validation
DROP POLICY IF EXISTS "Anyone can submit a request" ON public.pending_requests;
CREATE POLICY "Anyone can submit a request"
ON public.pending_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(email)) BETWEEN 6 AND 254
  AND email ~* '^[A-Za-z0-9._%%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND request_type = ANY (ARRAY['user','admin'])
  AND status = 'pending'
  AND (display_name IS NULL OR length(trim(display_name)) BETWEEN 1 AND 100)
  AND (message IS NULL OR length(message) <= 1000)
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);