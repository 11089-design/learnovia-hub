
-- study_plans
CREATE TABLE public.study_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  week_of date NOT NULL DEFAULT (date_trunc('week', now())::date),
  plan jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;
GRANT ALL ON public.study_plans TO service_role;
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own plans" ON public.study_plans FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER study_plans_touch BEFORE UPDATE ON public.study_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- session_reflections
CREATE TABLE public.session_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learned text NOT NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_reflections TO authenticated;
GRANT ALL ON public.session_reflections TO service_role;
ALTER TABLE public.session_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reflections write" ON public.session_reflections FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tutor reads reflections" ON public.session_reflections FOR SELECT
  USING (public.is_session_tutor(session_id, auth.uid()));

-- Seed badges
INSERT INTO public.badges (key, name, description, icon) VALUES
  ('streak_starter','Streak Starter','3-day learning streak','flame'),
  ('consistency_hero','Consistency Hero','14-day learning streak','flame'),
  ('rising_tutor','Rising Tutor','Taught 3 free sessions','sparkles'),
  ('trusted_educator','Trusted Educator','Unlocked paid sessions','shield-check'),
  ('top_rated','Top-Rated Mentor','Average rating 4.8+','star'),
  ('community_builder','Community Builder','Started a community','users'),
  ('first_session','First Session','Attended your first live session','graduation-cap'),
  ('helping_hand','Helping Hand','Answered 5 homework help posts','hand-heart')
ON CONFLICT (key) DO NOTHING;

-- Ensure badges.key is unique for ON CONFLICT above
CREATE UNIQUE INDEX IF NOT EXISTS badges_key_unique ON public.badges (key);
