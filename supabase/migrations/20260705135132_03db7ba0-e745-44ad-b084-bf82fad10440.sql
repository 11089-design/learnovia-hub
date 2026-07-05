CREATE TABLE public.session_whiteboards (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_whiteboards TO authenticated;
GRANT ALL ON public.session_whiteboards TO service_role;

ALTER TABLE public.session_whiteboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view whiteboard"
  ON public.session_whiteboards FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));

CREATE POLICY "Participants can upsert whiteboard"
  ON public.session_whiteboards FOR INSERT TO authenticated
  WITH CHECK (public.is_session_participant(session_id, auth.uid()));

CREATE POLICY "Participants can update whiteboard"
  ON public.session_whiteboards FOR UPDATE TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()))
  WITH CHECK (public.is_session_participant(session_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_whiteboards;
