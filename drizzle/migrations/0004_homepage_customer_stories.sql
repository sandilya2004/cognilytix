CREATE TABLE public.customer_stories (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
 email text NOT NULL CHECK (length(email) BETWEEN 6 AND 254 AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
 description text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 2000),
 suggestions text CHECK (suggestions IS NULL OR length(suggestions) <= 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.customer_stories TO service_role;
ALTER TABLE public.customer_stories ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.submit_customer_story(_name text, _email text, _description text, _suggestions text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ DECLARE story_id uuid; BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(lower(btrim(_email)), 0));
 IF EXISTS (SELECT 1 FROM public.customer_stories WHERE email = lower(btrim(_email)) AND created_at > now() - interval '1 minute') THEN RAISE EXCEPTION 'Please wait a minute before submitting another comment.'; END IF;
 INSERT INTO public.customer_stories(name,email,description,suggestions) VALUES(btrim(_name),lower(btrim(_email)),btrim(_description),nullif(btrim(_suggestions),'')) RETURNING id INTO story_id;
 RETURN story_id; END; $$;
REVOKE ALL ON FUNCTION public.submit_customer_story(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_customer_story(text,text,text,text) TO anon, authenticated;
CREATE FUNCTION public.list_customer_stories(_offset integer DEFAULT 0)
RETURNS TABLE (id uuid, name text, description text, suggestions text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT s.id, s.name, s.description, s.suggestions, s.created_at FROM public.customer_stories s ORDER BY s.created_at DESC, s.id LIMIT 12 OFFSET greatest(0, least(_offset, 1000000)); $$;
REVOKE ALL ON FUNCTION public.list_customer_stories(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_customer_stories(integer) TO anon, authenticated;
COMMENT ON TABLE public.customer_stories IS 'Homepage comments: email is private; submissions and public read use bounded functions, with no direct visitor table access.';