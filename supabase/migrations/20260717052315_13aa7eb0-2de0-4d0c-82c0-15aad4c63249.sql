
-- Status enum for receipts
DO $$ BEGIN
  CREATE TYPE public.receipt_status AS ENUM ('draft', 'issued', 'void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment method enum (extensible; kept as text-backed enum for future providers)
DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'bank_transfer', 'card', 'mpesa', 'cheque', 'paypal', 'stripe', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── receipts ──────────────────────────────────────────────────────────────
CREATE TABLE public.receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  source_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  payment_reference TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.receipt_status NOT NULL DEFAULT 'issued',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_received NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, receipt_number)
);

CREATE INDEX idx_receipts_user_date ON public.receipts (user_id, receipt_date DESC);
CREATE INDEX idx_receipts_customer ON public.receipts (customer_id);
CREATE INDEX idx_receipts_status ON public.receipts (user_id, status);
CREATE INDEX idx_receipts_source_invoice ON public.receipts (source_invoice_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipts TO authenticated;
GRANT ALL ON public.receipts TO service_role;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own receipts"
  ON public.receipts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER receipts_set_updated_at
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── receipt_items ─────────────────────────────────────────────────────────
CREATE TABLE public.receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(14,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_is_percent BOOLEAN NOT NULL DEFAULT true,
  vat_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_receipt_items_receipt ON public.receipt_items (receipt_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.receipt_items TO authenticated;
GRANT ALL ON public.receipt_items TO service_role;
ALTER TABLE public.receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own receipt items"
  ON public.receipt_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER receipt_items_set_updated_at
  BEFORE UPDATE ON public.receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── next_receipt_number(user) ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.next_receipt_number(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE next_n INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(receipt_number, '\D', '', 'g'), '')::INTEGER), 0) + 1
    INTO next_n
  FROM public.receipts WHERE user_id = _user_id;
  RETURN 'RCP-' || LPAD(next_n::TEXT, 6, '0');
END; $$;
