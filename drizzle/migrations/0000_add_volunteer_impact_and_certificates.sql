CREATE TABLE public.volunteer_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity_kind text NOT NULL CHECK (activity_kind IN ('session', 'preparation', 'mentoring', 'initiative', 'campaign')),
  title text NOT NULL,
  description text NOT NULL,
  subject text NOT NULL DEFAULT 'General',
  source_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  started_at timestamptz,
  ended_at timestamptz,
  requested_hours numeric(8,4) NOT NULL CHECK (requested_hours > 0 AND requested_hours <= 24),
  verified_hours numeric(8,4) NOT NULL DEFAULT 0 CHECK (verified_hours >= 0 AND verified_hours <= requested_hours),
  claimed_learners integer NOT NULL DEFAULT 0 CHECK (claimed_learners >= 0),
  verified_learners integer NOT NULL DEFAULT 0 CHECK (verified_learners >= 0 AND verified_learners <= claimed_learners),
  claimed_countries text[] NOT NULL DEFAULT '{}',
  verified_countries text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT preparation_credit_limit CHECK (activity_kind <> 'preparation' OR requested_hours <= 0.5),
  CONSTRAINT session_credit_has_session CHECK ((activity_kind = 'session') = (source_session_id IS NOT NULL)),
  CONSTRAINT contribution_period_order CHECK (started_at IS NULL OR ended_at IS NULL OR ended_at >= started_at)
);
GRANT SELECT, INSERT ON public.volunteer_contributions TO authenticated;
GRANT ALL ON public.volunteer_contributions TO service_role;
ALTER TABLE public.volunteer_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Contributors and reviewers read impact contributions" ON public.volunteer_contributions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Contributors submit pending impact contributions" ON public.volunteer_contributions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND verified_hours = 0
    AND verified_learners = 0
    AND reviewer_id IS NULL
    AND reviewed_at IS NULL
    AND activity_kind <> 'session'
    AND (source_session_id IS NULL OR private.is_session_tutor(source_session_id, auth.uid()))
  );
CREATE UNIQUE INDEX volunteer_contributions_session_once_idx
  ON public.volunteer_contributions (source_session_id)
  WHERE source_session_id IS NOT NULL;
CREATE INDEX volunteer_contributions_user_status_idx
  ON public.volunteer_contributions (user_id, status, created_at DESC);

CREATE TABLE public.impact_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  milestone_hours integer NOT NULL CHECK (milestone_hours IN (5, 15, 30, 50, 100, 200)),
  level_title text NOT NULL,
  certificate_title text NOT NULL,
  display_name text NOT NULL,
  verified_hours numeric(8,4) NOT NULL CHECK (verified_hours >= milestone_hours),
  contribution_start date,
  contribution_end date,
  subjects text[] NOT NULL DEFAULT '{}',
  learners_supported integer NOT NULL DEFAULT 0 CHECK (learners_supported >= 0),
  verification_code uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, milestone_hours),
  CONSTRAINT certificate_period_order CHECK (contribution_start IS NULL OR contribution_end IS NULL OR contribution_end >= contribution_start)
);
GRANT SELECT ON public.impact_certificates TO authenticated;
GRANT ALL ON public.impact_certificates TO service_role;
ALTER TABLE public.impact_certificates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and reviewers read impact certificates" ON public.impact_certificates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'moderator'));

CREATE OR REPLACE FUNCTION public.finish_teaching_session(_session_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_session public.sessions%ROWTYPE;
  v_ended_at timestamptz;
  v_minutes integer;
  v_contribution_id uuid;
  v_learners integer;
  v_subject text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to finish this session';
  END IF;
  SELECT * INTO v_session FROM public.sessions WHERE id = _session_id FOR UPDATE;
  IF NOT FOUND OR v_session.tutor_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the session tutor can finish this session';
  END IF;
  IF v_session.status IN ('ended', 'cancelled') THEN
    RAISE EXCEPTION 'This session is already closed';
  END IF;
  IF v_session.started_at IS NULL THEN
    RAISE EXCEPTION 'Start the session clock before submitting teaching hours';
  END IF;
  v_ended_at := LEAST(now(), COALESCE(v_session.ends_at, now()));
  v_minutes := FLOOR(EXTRACT(EPOCH FROM (v_ended_at - v_session.started_at)) / 60)::integer;
  IF v_minutes < 1 THEN
    RAISE EXCEPTION 'At least one minute must be recorded before finishing';
  END IF;
  SELECT count(*)::integer INTO v_learners
  FROM public.session_participants
  WHERE session_id = _session_id AND role = 'student' AND NOT removed;
  SELECT COALESCE(c.name, 'General') INTO v_subject
  FROM (SELECT v_session.category_id AS category_id) s
  LEFT JOIN public.categories c ON c.id = s.category_id;
  UPDATE public.sessions SET status = 'ended', ends_at = v_ended_at WHERE id = _session_id;
  INSERT INTO public.volunteer_contributions (
    user_id, activity_kind, title, description, subject, source_session_id,
    started_at, ended_at, requested_hours, claimed_learners
  ) VALUES (
    auth.uid(), 'session', v_session.title,
    COALESCE(v_session.description, 'Completed Learnova teaching session'), v_subject,
    _session_id, v_session.started_at, v_ended_at, v_minutes::numeric / 60, v_learners
  ) RETURNING id INTO v_contribution_id;
  RETURN v_contribution_id;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_teaching_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_teaching_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_volunteer_contribution(
  _contribution_id uuid,
  _decision text,
  _verified_hours numeric,
  _verified_learners integer,
  _subject text,
  _countries text[],
  _review_note text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_item public.volunteer_contributions%ROWTYPE;
  v_total_hours numeric(8,4);
  v_total_learners integer;
  v_start date;
  v_end date;
  v_subjects text[];
  v_name text;
  v_threshold integer;
  v_level text;
  v_certificate text;
  v_issued integer := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT (private.has_role(auth.uid(), 'admin') OR private.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'Only Learnova reviewers can verify contributions';
  END IF;
  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Choose approve or reject';
  END IF;
  SELECT * INTO v_item FROM public.volunteer_contributions WHERE id = _contribution_id FOR UPDATE;
  IF NOT FOUND OR v_item.status <> 'pending' THEN
    RAISE EXCEPTION 'This contribution is no longer pending review';
  END IF;
  IF _decision = 'approved' AND (_verified_hours <= 0 OR _verified_hours > v_item.requested_hours) THEN
    RAISE EXCEPTION 'Verified hours must be positive and cannot exceed the submitted hours';
  END IF;
  IF _verified_learners < 0 OR _verified_learners > v_item.claimed_learners THEN
    RAISE EXCEPTION 'Verified learner count cannot exceed the submitted count';
  END IF;
  UPDATE public.volunteer_contributions
  SET status = _decision,
      verified_hours = CASE WHEN _decision = 'approved' THEN _verified_hours ELSE 0 END,
      verified_learners = CASE WHEN _decision = 'approved' THEN _verified_learners ELSE 0 END,
      subject = COALESCE(NULLIF(btrim(_subject), ''), subject),
      verified_countries = CASE WHEN _decision = 'approved' THEN COALESCE(_countries, '{}') ELSE '{}' END,
      reviewer_id = auth.uid(), reviewed_at = now(), review_note = NULLIF(btrim(_review_note), '')
  WHERE id = _contribution_id;
  IF _decision = 'rejected' THEN RETURN 0; END IF;

  SELECT COALESCE(sum(verified_hours), 0), COALESCE(sum(verified_learners), 0)::integer,
         min(COALESCE(started_at, created_at)::date), max(COALESCE(ended_at, created_at)::date),
         COALESCE(array_agg(DISTINCT subject ORDER BY subject), '{}')
  INTO v_total_hours, v_total_learners, v_start, v_end, v_subjects
  FROM public.volunteer_contributions
  WHERE user_id = v_item.user_id AND status = 'approved';
  SELECT COALESCE(display_name, full_name, 'Learnova Educator') INTO v_name
  FROM public.profiles WHERE id = v_item.user_id;
  v_name := COALESCE(v_name, 'Learnova Educator');

  FOR v_threshold, v_level, v_certificate IN
    SELECT * FROM (VALUES
      (5, 'First Steps', 'Volunteer Participation Certificate'),
      (15, 'Learning Contributor', 'Bronze Impact Certificate'),
      (30, 'Peer Educator', 'Silver Impact Certificate'),
      (50, 'Learning Mentor', 'Gold Impact Certificate'),
      (100, 'Community Champion', 'Excellence in Volunteering Certificate'),
      (200, 'Impact Ambassador', 'Outstanding Community Impact Certificate')
    ) AS levels(hours, title, certificate)
  LOOP
    IF v_total_hours >= v_threshold THEN
      INSERT INTO public.impact_certificates (
        user_id, milestone_hours, level_title, certificate_title, display_name,
        verified_hours, contribution_start, contribution_end, subjects, learners_supported
      ) VALUES (
        v_item.user_id, v_threshold, v_level, v_certificate, v_name,
        v_total_hours, v_start, v_end, COALESCE(v_subjects, '{}'), v_total_learners
      ) ON CONFLICT (user_id, milestone_hours) DO NOTHING;
      IF FOUND THEN v_issued := v_issued + 1; END IF;
    END IF;
  END LOOP;
  RETURN v_issued;
END;
$$;
REVOKE ALL ON FUNCTION public.review_volunteer_contribution(uuid, text, numeric, integer, text, text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_volunteer_contribution(uuid, text, numeric, integer, text, text[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_impact_certificate(_verification_code uuid)
RETURNS TABLE (
  display_name text,
  level_title text,
  certificate_title text,
  verified_hours numeric,
  contribution_start date,
  contribution_end date,
  subjects text[],
  learners_supported integer,
  verification_code uuid,
  issued_at timestamptz,
  issuer_name text,
  founder_signature text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.display_name, c.level_title, c.certificate_title, c.verified_hours,
         c.contribution_start, c.contribution_end, c.subjects, c.learners_supported,
         c.verification_code, c.issued_at, 'Learnova'::text, 'K Niharikaa'::text
  FROM public.impact_certificates c
  WHERE c.verification_code = _verification_code
$$;
REVOKE ALL ON FUNCTION public.verify_impact_certificate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_impact_certificate(uuid) TO anon, authenticated;