-- Poll votes: allow changing / removing your own vote
CREATE POLICY "Users change their own vote" ON public.session_poll_votes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove their own vote" ON public.session_poll_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Live transcript lines for a session
CREATE TABLE public.session_transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  speaker_name text NOT NULL DEFAULT 'Speaker',
  content text NOT NULL,
  at_seconds integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX session_transcripts_session_idx ON public.session_transcripts (session_id, at_seconds);

GRANT SELECT, INSERT, DELETE ON public.session_transcripts TO authenticated;
GRANT ALL ON public.session_transcripts TO service_role;

ALTER TABLE public.session_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read transcript" ON public.session_transcripts
  FOR SELECT TO authenticated
  USING (private.is_session_participant(session_id, auth.uid()));

CREATE POLICY "Participants add their own lines" ON public.session_transcripts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND private.is_session_participant(session_id, auth.uid()));

CREATE POLICY "Hosts clear transcript lines" ON public.session_transcripts
  FOR DELETE TO authenticated
  USING (private.is_session_tutor(session_id, auth.uid()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_transcripts;

-- Kids mode flag on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kids_mode boolean NOT NULL DEFAULT false;