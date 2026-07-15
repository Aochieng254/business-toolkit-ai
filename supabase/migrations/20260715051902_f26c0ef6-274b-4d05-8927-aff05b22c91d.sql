
CREATE OR REPLACE FUNCTION public.next_invoice_number(_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE next_n INTEGER;
BEGIN
  SELECT COALESCE(MAX(NULLIF(regexp_replace(invoice_number, '\D', '', 'g'), '')::INTEGER), 0) + 1
    INTO next_n
  FROM public.invoices WHERE user_id = _user_id;
  RETURN 'INV-' || LPAD(next_n::TEXT, 6, '0');
END; $$;
