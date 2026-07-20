
REVOKE ALL ON FUNCTION public.storage_usage(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_usage(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_shared_file(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_file(TEXT) TO anon, authenticated, service_role;
