-- Supabase Table Editor: public schema, tables prefixed fixnow_.
-- RLS has no client policies: only trusted backend/database roles can access records.
CREATE SCHEMA IF NOT EXISTS fixnow_private;
REVOKE ALL ON SCHEMA fixnow_private FROM PUBLIC;
CREATE TABLE IF NOT EXISTS fixnow_private.storage_revision (
  id integer PRIMARY KEY CHECK (id = 1), revision bigint NOT NULL DEFAULT 0
);
INSERT INTO fixnow_private.storage_revision (id) VALUES (1) ON CONFLICT DO NOTHING;
REVOKE ALL ON fixnow_private.storage_revision FROM PUBLIC;

CREATE TABLE IF NOT EXISTS public.fixnow_accounts (
  id text PRIMARY KEY,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  position integer NOT NULL DEFAULT 0
);
ALTER TABLE public.fixnow_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fixnow_accounts FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.fixnow_service_requests (
  id text PRIMARY KEY,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  position integer NOT NULL DEFAULT 0
);
ALTER TABLE public.fixnow_service_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fixnow_service_requests FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.fixnow_offers (
  id text PRIMARY KEY,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  position integer NOT NULL DEFAULT 0
);
ALTER TABLE public.fixnow_offers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fixnow_offers FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.fixnow_ratings (
  id text PRIMARY KEY,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  position integer NOT NULL DEFAULT 0
);
ALTER TABLE public.fixnow_ratings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fixnow_ratings FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.fixnow_payments (
  id text PRIMARY KEY,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  position integer NOT NULL DEFAULT 0
);
ALTER TABLE public.fixnow_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fixnow_payments FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.fixnow_password_reset_tokens (
  id text PRIMARY KEY,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object'),
  position integer NOT NULL DEFAULT 0
);
ALTER TABLE public.fixnow_password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.fixnow_password_reset_tokens FROM PUBLIC, anon, authenticated;

ALTER TABLE public.fixnow_accounts ADD COLUMN IF NOT EXISTS role text GENERATED ALWAYS AS (data->>'role') STORED;
ALTER TABLE public.fixnow_accounts ADD COLUMN IF NOT EXISTS full_name text GENERATED ALWAYS AS (data->'profile'->>'fullName') STORED;
ALTER TABLE public.fixnow_accounts ADD COLUMN IF NOT EXISTS email text GENERATED ALWAYS AS (data->'profile'->>'email') STORED;
ALTER TABLE public.fixnow_service_requests ADD COLUMN IF NOT EXISTS issue text GENERATED ALWAYS AS (data->>'issue') STORED;
ALTER TABLE public.fixnow_service_requests ADD COLUMN IF NOT EXISTS status text GENERATED ALWAYS AS (data->>'status') STORED;
