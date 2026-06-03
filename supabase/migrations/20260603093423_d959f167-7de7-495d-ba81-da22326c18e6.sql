CREATE TABLE public.shared_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  permission TEXT NOT NULL DEFAULT 'view' CHECK (permission IN ('view','comment','edit')),
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shared_reports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_reports TO authenticated;
GRANT ALL ON public.shared_reports TO service_role;

ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

-- Owners full access
CREATE POLICY "Owners manage their reports"
ON public.shared_reports
FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Public read of non-expired reports (snapshot returned; password check enforced client/edge side)
CREATE POLICY "Public can view non-expired shared reports"
ON public.shared_reports
FOR SELECT
TO anon, authenticated
USING (expires_at IS NULL OR expires_at > now());

CREATE TRIGGER update_shared_reports_updated_at
BEFORE UPDATE ON public.shared_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_shared_reports_owner ON public.shared_reports(owner_id);