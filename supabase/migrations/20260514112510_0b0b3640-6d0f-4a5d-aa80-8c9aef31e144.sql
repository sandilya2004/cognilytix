-- Pending access requests table for admin moderation workflow
CREATE TABLE public.pending_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

ALTER TABLE public.pending_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (even unauthenticated) can submit a request
CREATE POLICY "Anyone can submit a request"
ON public.pending_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can view, update, delete
CREATE POLICY "Admins can view all requests"
ON public.pending_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update requests"
ON public.pending_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete requests"
ON public.pending_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_pending_requests_status ON public.pending_requests(status);
CREATE INDEX idx_pending_requests_created ON public.pending_requests(created_at DESC);