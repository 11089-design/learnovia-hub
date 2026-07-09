
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS agenda jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS spotlight_user_id uuid,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS allow_anonymous boolean NOT NULL DEFAULT true;

ALTER TABLE public.session_participants
  ADD COLUMN IF NOT EXISTS muted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS removed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anonymous_name text;

CREATE TABLE IF NOT EXISTS public.session_waiting_room (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE(session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_waiting_room TO authenticated;
GRANT ALL ON public.session_waiting_room TO service_role;
ALTER TABLE public.session_waiting_room ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wr_select" ON public.session_waiting_room FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_session_tutor(session_id, auth.uid()));
CREATE POLICY "wr_insert_self" ON public.session_waiting_room FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "wr_update" ON public.session_waiting_room FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_session_tutor(session_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_session_tutor(session_id, auth.uid()));
CREATE POLICY "wr_delete" ON public.session_waiting_room FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_session_tutor(session_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.session_breakouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_breakouts TO authenticated;
GRANT ALL ON public.session_breakouts TO service_role;
ALTER TABLE public.session_breakouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bo_select" ON public.session_breakouts FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "bo_write_tutor" ON public.session_breakouts FOR ALL TO authenticated
  USING (public.is_session_tutor(session_id, auth.uid()))
  WITH CHECK (public.is_session_tutor(session_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.session_breakout_assignments (
  breakout_id uuid NOT NULL REFERENCES public.session_breakouts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (breakout_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_breakout_assignments TO authenticated;
GRANT ALL ON public.session_breakout_assignments TO service_role;
ALTER TABLE public.session_breakout_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boa_select" ON public.session_breakout_assignments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.session_breakouts b WHERE b.id = breakout_id AND public.is_session_participant(b.session_id, auth.uid()))
  );
CREATE POLICY "boa_write_tutor" ON public.session_breakout_assignments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.session_breakouts b WHERE b.id = breakout_id AND public.is_session_tutor(b.session_id, auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.session_breakouts b WHERE b.id = breakout_id AND public.is_session_tutor(b.session_id, auth.uid())));

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.session_waiting_room; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.session_breakouts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.session_breakout_assignments; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
