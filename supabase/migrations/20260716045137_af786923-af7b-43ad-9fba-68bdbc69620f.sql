
CREATE TYPE public.quotation_status AS ENUM ('draft','sent','accepted','rejected','expired');

CREATE TABLE public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  quotation_number TEXT NOT NULL,
  quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  reference_number TEXT,
  sales_rep TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  status public.quotation_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  terms TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  grand_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  converted_invoice_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, quotation_number)
);
CREATE INDEX idx_quotations_user_date ON public.quotations(user_id, quotation_date DESC);
CREATE INDEX idx_quotations_customer ON public.quotations(customer_id);
CREATE INDEX idx_quotations_status ON public.quotations(user_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotations TO authenticated;
GRANT ALL ON public.quotations TO service_role;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quotations" ON public.quotations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_is_percent BOOLEAN NOT NULL DEFAULT true,
  vat_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qitems_quotation ON public.quotation_items(quotation_id);
CREATE INDEX idx_qitems_user ON public.quotation_items(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotation_items TO authenticated;
GRANT ALL ON public.quotation_items TO service_role;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quotation items" ON public.quotation_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_quotations_updated BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.invoices
  ADD COLUMN source_quotation_id UUID REFERENCES public.quotations(id) ON DELETE SET NULL;
CREATE INDEX idx_invoices_source_quotation ON public.invoices(source_quotation_id);

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_converted_invoice_fk
  FOREIGN KEY (converted_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.next_quotation_number(_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE next_n INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(quotation_number, '\D', '', 'g'), '')::INTEGER), 0) + 1
    INTO next_n
  FROM public.quotations WHERE user_id = _user_id;
  RETURN 'QUO-' || LPAD(next_n::TEXT, 6, '0');
END; $$;
GRANT EXECUTE ON FUNCTION public.next_quotation_number(UUID) TO authenticated;
