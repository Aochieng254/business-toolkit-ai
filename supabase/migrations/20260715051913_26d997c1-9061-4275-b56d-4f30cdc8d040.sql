
CREATE POLICY "logos read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "logos delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
