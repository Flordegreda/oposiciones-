CREATE TABLE IF NOT EXISTS public.site_gate (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  username text NOT NULL,
  password_hash text NOT NULL,
  recovery_hash text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON TABLE public.site_gate FROM PUBLIC;
REVOKE ALL ON TABLE public.site_gate FROM anon;
REVOKE ALL ON TABLE public.site_gate FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.site_gate TO service_role;
GRANT ALL ON TABLE public.site_gate TO postgres;
