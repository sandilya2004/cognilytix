CREATE TABLE public.account_workspaces (
 user_id uuid PRIMARY KEY,
 snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_workspaces TO authenticated;
GRANT ALL ON public.account_workspaces TO service_role;
ALTER TABLE public.account_workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage saved workspace" ON public.account_workspaces FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);