
CREATE POLICY "Participants can read session resources"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'session-resources'
    AND public.is_session_participant(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "Tutors can upload session resources"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'session-resources'
    AND public.is_session_tutor(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

CREATE POLICY "Tutors can delete session resources"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'session-resources'
    AND public.is_session_tutor(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );
