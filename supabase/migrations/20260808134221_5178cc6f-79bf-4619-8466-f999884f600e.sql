-- ============ TRACKS ON SESSIONS ============
DO $$ BEGIN
  CREATE TYPE public.learn_track AS ENUM ('peer','training','workshop','kids');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS track public.learn_track NOT NULL DEFAULT 'peer',
  ADD COLUMN IF NOT EXISTS peer_led boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS course_day_id uuid;

-- ============ VERIFICATIONS ============
DO $$ BEGIN
  CREATE TYPE public.verification_kind AS ENUM ('exam_score','credential','peer_no_score');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tutor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.verification_kind NOT NULL,
  subject text NOT NULL,
  exam text,
  claimed_score text,
  proof_path text,
  ai_verdict jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_confidence numeric NOT NULL DEFAULT 0,
  status public.verification_status NOT NULL DEFAULT 'pending',
  reviewer_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_verifications TO authenticated;
GRANT ALL ON public.tutor_verifications TO service_role;
ALTER TABLE public.tutor_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "verifications readable by owner or admin" ON public.tutor_verifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "verifications insert own" ON public.tutor_verifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "verifications update own pending or admin" ON public.tutor_verifications
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid() AND status = 'pending') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK ((user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER tutor_verifications_touch BEFORE UPDATE ON public.tutor_verifications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- approved, verified badge lookup used by course creation
CREATE OR REPLACE FUNCTION public.is_verified_for(_user_id uuid, _subject text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tutor_verifications
    WHERE user_id = _user_id AND status = 'approved'
      AND (lower(subject) = lower(_subject) OR _subject = '')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_verified_for(uuid, text) TO authenticated, service_role;

-- ============ COURSES ============
DO $$ BEGIN
  CREATE TYPE public.course_status AS ENUM ('draft','open','running','ended','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  tagline text,
  description text,
  track public.learn_track NOT NULL DEFAULT 'training',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_id uuid REFERENCES public.tutor_verifications(id) ON DELETE SET NULL,
  peer_led boolean NOT NULL DEFAULT false,
  cover_url text,
  level text,
  language text NOT NULL DEFAULT 'English',
  seats integer NOT NULL DEFAULT 30,
  age_min integer,
  age_max integer,
  starts_on date,
  outcomes text[] NOT NULL DEFAULT '{}',
  requirements text[] NOT NULL DEFAULT '{}',
  attendance_policy text NOT NULL DEFAULT 'Attendance is mandatory. Notify your tutor in the group chat at least 1 hour before if you must miss a day.',
  max_absences integer NOT NULL DEFAULT 1,
  status public.course_status NOT NULL DEFAULT 'open',
  enrolled_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT ON public.courses TO anon;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses readable by everyone" ON public.courses FOR SELECT USING (true);
CREATE POLICY "courses insert own" ON public.courses FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "courses update host or admin" ON public.courses FOR UPDATE TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "courses delete host or admin" ON public.courses FOR DELETE TO authenticated
  USING (host_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER courses_touch BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.is_course_host(_course_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses WHERE id = _course_id AND host_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.is_course_host(uuid, uuid) TO authenticated, service_role;

-- ============ COURSE DAYS (blueprint) ============
CREATE TABLE IF NOT EXISTS public.course_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  title text NOT NULL,
  blueprint text,
  objectives text[] NOT NULL DEFAULT '{}',
  starts_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 60,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_days TO authenticated;
GRANT SELECT ON public.course_days TO anon;
GRANT ALL ON public.course_days TO service_role;
ALTER TABLE public.course_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course days readable by everyone" ON public.course_days FOR SELECT USING (true);
CREATE POLICY "course days managed by host" ON public.course_days FOR INSERT TO authenticated
  WITH CHECK (public.is_course_host(course_id, auth.uid()));
CREATE POLICY "course days update by host" ON public.course_days FOR UPDATE TO authenticated
  USING (public.is_course_host(course_id, auth.uid())) WITH CHECK (public.is_course_host(course_id, auth.uid()));
CREATE POLICY "course days delete by host" ON public.course_days FOR DELETE TO authenticated
  USING (public.is_course_host(course_id, auth.uid()));

-- at least 3 days enforced at insert-time in app + guard trigger on publish
CREATE OR REPLACE FUNCTION public.courses_require_three_days()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE day_count integer;
BEGIN
  IF NEW.status IN ('open','running') AND (OLD IS NULL OR OLD.status <> NEW.status) THEN
    SELECT count(*) INTO day_count FROM public.course_days WHERE course_id = NEW.id;
    IF day_count > 0 AND day_count < 3 THEN
      RAISE EXCEPTION 'A course needs at least 3 days in its blueprint';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER courses_min_days BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.courses_require_three_days();

-- ============ ENROLLMENTS ============
DO $$ BEGIN
  CREATE TYPE public.enrollment_status AS ENUM ('active','completed','withdrawn','removed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.enrollment_status NOT NULL DEFAULT 'active',
  absences integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT ALL ON public.course_enrollments TO service_role;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollments readable by self host admin" ON public.course_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_course_host(course_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "enroll self" ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "enrollment update self or host" ON public.course_enrollments FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_course_host(course_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_course_host(course_id, auth.uid()));
CREATE POLICY "enrollment delete self or host" ON public.course_enrollments FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_course_host(course_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.course_enrolled_count_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses SET enrolled_count = enrolled_count + 1 WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses SET enrolled_count = GREATEST(enrolled_count - 1, 0) WHERE id = OLD.course_id;
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER course_enrolled_count_ins AFTER INSERT ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.course_enrolled_count_trg();
CREATE TRIGGER course_enrolled_count_del AFTER DELETE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.course_enrolled_count_trg();

-- ============ ATTENDANCE ============
DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present','absent','excused','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.course_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_day_id uuid NOT NULL REFERENCES public.course_days(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'pending',
  notified_at timestamptz,
  note text,
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (course_day_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_attendance TO authenticated;
GRANT ALL ON public.course_attendance TO service_role;
ALTER TABLE public.course_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance readable by self host admin" ON public.course_attendance FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_course_host(course_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "attendance insert by host or self notice" ON public.course_attendance FOR INSERT TO authenticated
  WITH CHECK (public.is_course_host(course_id, auth.uid()) OR (user_id = auth.uid() AND status = 'pending'));
CREATE POLICY "attendance update by host" ON public.course_attendance FOR UPDATE TO authenticated
  USING (public.is_course_host(course_id, auth.uid()) OR user_id = auth.uid())
  WITH CHECK (public.is_course_host(course_id, auth.uid()) OR user_id = auth.uid());
CREATE POLICY "attendance delete by host" ON public.course_attendance FOR DELETE TO authenticated
  USING (public.is_course_host(course_id, auth.uid()));

CREATE TRIGGER course_attendance_touch BEFORE UPDATE ON public.course_attendance
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ SEED: training / workshop / kids category cards ============
INSERT INTO public.categories (slug, name, kind) VALUES
  ('sat-prep','SAT Prep','academic'),
  ('ap-crash','AP Crash Course','academic'),
  ('college-essays','College Essay Writing','academic'),
  ('language-crash','Language Crash Course','academic'),
  ('art-studio','Art Studio','hobby'),
  ('public-speaking','Public Speaking','hobby'),
  ('coding-bootcamp','Coding Bootcamp','academic'),
  ('college-admissions','College Admissions','academic'),
  ('kids-math','Kids Math','academic'),
  ('kids-crafts','Kids Crafts & Clay','hobby'),
  ('kids-reading','Kids Reading','academic'),
  ('kids-science','Kids Science Fun','academic')
ON CONFLICT (slug) DO NOTHING;