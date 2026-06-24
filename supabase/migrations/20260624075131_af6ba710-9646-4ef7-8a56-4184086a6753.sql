
-- Expand tutor profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS university text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS achievements text[] NOT NULL DEFAULT '{}';

-- Realtime for resources (so uploads appear live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_resources;

-- Let enrolled participants (not just tutors) upload resources during a session
DROP POLICY IF EXISTS "Tutors can add resources" ON public.session_resources;
CREATE POLICY "Participants can add resources"
  ON public.session_resources FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by AND public.is_session_participant(session_id, auth.uid()));

DROP POLICY IF EXISTS "Tutors can delete resources" ON public.session_resources;
CREATE POLICY "Uploader or tutor can delete resources"
  ON public.session_resources FOR DELETE
  USING (auth.uid() = uploaded_by OR public.is_session_tutor(session_id, auth.uid()));

-- Storage policies: same — any participant can upload to their session folder
DROP POLICY IF EXISTS "Tutors can upload session resources" ON storage.objects;
CREATE POLICY "Participants can upload session resources"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'session-resources'
    AND public.is_session_participant(((storage.foldername(name))[1])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "Tutors can delete session resources" ON storage.objects;
CREATE POLICY "Uploader or tutor can delete session resources"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'session-resources'
    AND (owner = auth.uid() OR public.is_session_tutor(((storage.foldername(name))[1])::uuid, auth.uid()))
  );
