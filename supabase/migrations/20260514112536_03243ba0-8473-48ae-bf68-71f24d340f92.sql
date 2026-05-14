DROP POLICY "Anyone can submit a request" ON public.pending_requests;

CREATE POLICY "Anyone can submit a request"
ON public.pending_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(email)) > 3
  AND email LIKE '%@%.%'
  AND request_type IN ('user', 'admin')
  AND status = 'pending'
);