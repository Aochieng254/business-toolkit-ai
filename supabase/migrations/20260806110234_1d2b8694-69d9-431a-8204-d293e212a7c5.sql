-- Lock down SECURITY DEFINER helpers: no anon/authenticated EXECUTE.
REVOKE ALL ON FUNCTION public.storage_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ai_daily_count(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.conversions_today(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_pro(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_shared_file(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.storage_usage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ai_daily_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.conversions_today(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_pro(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_shared_file(text) TO service_role;

-- has_role must stay callable by authenticated because RLS policies depend on it,
-- but it may now only answer for the caller's own account (or trusted server roles).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
  END;
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
