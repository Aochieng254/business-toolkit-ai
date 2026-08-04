-- 1. Harden get_shared_file: drop storage_path/owner_id exposure, enforce expiry/revocation
DROP FUNCTION IF EXISTS public.get_shared_file(text);

CREATE OR REPLACE FUNCTION public.get_shared_file(_token text)
RETURNS TABLE(
  file_id uuid,
  name text,
  mime_type text,
  size_bytes bigint,
  allow_download boolean,
  expires_at timestamp with time zone,
  has_password boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT f.id, f.name, f.mime_type, f.size_bytes,
         s.allow_download, s.expires_at, (s.password_hash IS NOT NULL)
  FROM public.shared_files s
  JOIN public.files f ON f.id = s.file_id
  WHERE s.token = _token
    AND s.revoked_at IS NULL
    AND (s.expires_at IS NULL OR s.expires_at > now());
$$;

REVOKE ALL ON FUNCTION public.get_shared_file(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_file(text) TO anon, authenticated;

-- 2. user_roles: admin-only writes
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 3. Lock down SECURITY DEFINER / internal functions from API roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ai_daily_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_daily_count(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.storage_usage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_usage(uuid) TO authenticated, service_role;

-- Numbering helpers: switch definer -> invoker where possible and restrict anon
ALTER FUNCTION public.next_quotation_number(uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.next_quotation_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_quotation_number(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.next_invoice_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_invoice_number(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.next_receipt_number(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_receipt_number(uuid) TO authenticated, service_role;