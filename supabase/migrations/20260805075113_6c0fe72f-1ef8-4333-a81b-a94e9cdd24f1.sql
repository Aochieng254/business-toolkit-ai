-- ============ Subscriptions / entitlements ============
CREATE TYPE public.plan_tier AS ENUM ('free', 'pro');
CREATE TYPE public.sub_status AS ENUM ('none', 'trialing', 'active', 'past_due', 'cancelled', 'expired');

CREATE TABLE public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.plan_tier NOT NULL DEFAULT 'free',
  status public.sub_status NOT NULL DEFAULT 'none',
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  paypal_subscription_id TEXT UNIQUE,
  paypal_payer_email TEXT,
  price_usd NUMERIC NOT NULL DEFAULT 25,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Read-own only. All writes go through verified server-side code (service_role).
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PayPal webhook event ledger (replay protection) ============
CREATE TABLE public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'paypal',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  resource_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

GRANT ALL ON public.billing_events TO service_role;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read billing events" ON public.billing_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Conversion jobs ============
CREATE TYPE public.job_status AS ENUM ('queued', 'running', 'done', 'error', 'cancelled');

CREATE TABLE public.conversion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_size_bytes BIGINT NOT NULL DEFAULT 0,
  page_count INTEGER,
  ocr_language TEXT,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.job_status NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  stage TEXT,
  output_file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  output_name TEXT,
  output_size_bytes BIGINT,
  error TEXT,
  counted_against_quota BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_conversion_jobs_user_created ON public.conversion_jobs (user_id, created_at DESC);

-- Read-own only: rows are created and advanced exclusively by verified server code,
-- so free-tier quota cannot be tampered with from the browser.
GRANT SELECT ON public.conversion_jobs TO authenticated;
GRANT ALL ON public.conversion_jobs TO service_role;
ALTER TABLE public.conversion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own jobs" ON public.conversion_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all jobs" ON public.conversion_jobs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_conversion_jobs_updated BEFORE UPDATE ON public.conversion_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ OCR / tool preferences ============
ALTER TABLE public.ai_preferences
  ADD COLUMN IF NOT EXISTS ocr_language TEXT NOT NULL DEFAULT 'eng',
  ADD COLUMN IF NOT EXISTS auto_save_conversions BOOLEAN NOT NULL DEFAULT true;

-- ============ Entitlement helper ============
CREATE OR REPLACE FUNCTION public.is_pro(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.plan = 'pro'
      AND s.status IN ('trialing', 'active')
      AND (
        (s.status = 'trialing' AND s.trial_ends_at > now())
        OR (s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end > now()))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_pro(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_pro(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.conversions_today(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.conversion_jobs
  WHERE user_id = _user_id
    AND counted_against_quota = true
    AND status IN ('queued', 'running', 'done')
    AND created_at >= date_trunc('day', now());
$$;

REVOKE ALL ON FUNCTION public.conversions_today(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversions_today(UUID) TO authenticated, service_role;

-- ============ Owner/admin bootstrap ============
-- The project owner always holds the admin role, even if the account is created later.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = 'andyochi518@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
      ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill for existing accounts
INSERT INTO public.subscriptions (user_id)
  SELECT id FROM auth.users ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE lower(email) = 'andyochi518@gmail.com'
  ON CONFLICT DO NOTHING;