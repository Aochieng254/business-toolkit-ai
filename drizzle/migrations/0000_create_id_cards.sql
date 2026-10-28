CREATE TABLE public.id_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled card',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.id_cards TO authenticated;
GRANT ALL ON public.id_cards TO service_role;

ALTER TABLE public.id_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "id_cards select own" ON public.id_cards
  FOR SELECT TO authenticated USING (owner = auth.uid());
CREATE POLICY "id_cards insert own" ON public.id_cards
  FOR INSERT TO authenticated WITH CHECK (owner = auth.uid());
CREATE POLICY "id_cards update own" ON public.id_cards
  FOR UPDATE TO authenticated USING (owner = auth.uid()) WITH CHECK (owner = auth.uid());
CREATE POLICY "id_cards delete own" ON public.id_cards
  FOR DELETE TO authenticated USING (owner = auth.uid());

CREATE INDEX id_cards_owner_idx ON public.id_cards (owner, updated_at DESC);