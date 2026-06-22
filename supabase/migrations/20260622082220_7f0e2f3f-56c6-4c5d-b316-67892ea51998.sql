
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.session_format AS ENUM ('one_on_one', 'group');
CREATE TYPE public.session_kind   AS ENUM ('free', 'paid');
CREATE TYPE public.session_status AS ENUM ('scheduled', 'live', 'ended', 'cancelled');
CREATE TYPE public.participant_role AS ENUM ('tutor', 'student');
CREATE TYPE public.category_kind  AS ENUM ('academic', 'hobby', 'community');
CREATE TYPE public.community_role AS ENUM ('owner', 'mod', 'member');
CREATE TYPE public.channel_kind   AS ENUM ('text', 'voice', 'resources');
CREATE TYPE public.report_status  AS ENUM ('open', 'reviewing', 'resolved', 'dismissed');

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind public.category_kind NOT NULL DEFAULT 'academic',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

INSERT INTO public.categories (slug, name, kind) VALUES
  ('math', 'Math', 'academic'),
  ('physics', 'Physics', 'academic'),
  ('coding', 'Coding', 'academic'),
  ('languages', 'Languages', 'academic'),
  ('music', 'Music', 'hobby'),
  ('art-design', 'Art & Design', 'hobby');

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  level TEXT,
  format public.session_format NOT NULL DEFAULT 'group',
  kind public.session_kind NOT NULL DEFAULT 'free',
  price_cents INTEGER NOT NULL DEFAULT 0,
  language TEXT NOT NULL DEFAULT 'English',
  max_participants INTEGER NOT NULL DEFAULT 20,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  status public.session_status NOT NULL DEFAULT 'scheduled',
  meeting_room_name TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  cover_url TEXT,
  is_homework_help BOOLEAN NOT NULL DEFAULT false,
  outcomes TEXT[] NOT NULL DEFAULT '{}',
  focus_mode BOOLEAN NOT NULL DEFAULT false,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sessions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions are public" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create sessions"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "Tutors can update their sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING (auth.uid() = tutor_id) WITH CHECK (auth.uid() = tutor_id);
CREATE POLICY "Tutors can delete their sessions"
  ON public.sessions FOR DELETE TO authenticated
  USING (auth.uid() = tutor_id);

CREATE TRIGGER sessions_touch_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX sessions_starts_at_idx ON public.sessions (starts_at);
CREATE INDEX sessions_tutor_idx ON public.sessions (tutor_id);
CREATE INDEX sessions_category_idx ON public.sessions (category_id);

-- ============================================================
-- SESSION PARTICIPANTS
-- ============================================================
CREATE TABLE public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.participant_role NOT NULL DEFAULT 'student',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at TIMESTAMPTZ,
  attended_minutes INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, user_id)
);
GRANT SELECT ON public.session_participants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.session_participants TO authenticated;
GRANT ALL ON public.session_participants TO service_role;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants are public for discovery"
  ON public.session_participants FOR SELECT USING (true);
CREATE POLICY "Users can join sessions themselves"
  ON public.session_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own participation"
  ON public.session_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave sessions themselves"
  ON public.session_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Security-definer membership helper
CREATE OR REPLACE FUNCTION public.is_session_participant(_session_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.session_participants
    WHERE session_id = _session_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.sessions
    WHERE id = _session_id AND tutor_id = _user_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_session_participant(UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_session_tutor(_session_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions WHERE id = _session_id AND tutor_id = _user_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_session_tutor(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- SESSION CHAT
-- ============================================================
CREATE TABLE public.session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES public.session_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_messages TO authenticated;
GRANT ALL ON public.session_messages TO service_role;
ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read session chat"
  ON public.session_messages FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "Participants can post in session chat"
  ON public.session_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "Authors or tutors can update messages"
  ON public.session_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_session_tutor(session_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_session_tutor(session_id, auth.uid()));
CREATE POLICY "Authors or tutors can delete messages"
  ON public.session_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_session_tutor(session_id, auth.uid()));
CREATE INDEX session_messages_session_idx ON public.session_messages (session_id, created_at);

-- ============================================================
-- SESSION NOTES
-- ============================================================
CREATE TABLE public.session_notes_shared (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_notes_shared TO authenticated;
GRANT ALL ON public.session_notes_shared TO service_role;
ALTER TABLE public.session_notes_shared ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read shared notes"
  ON public.session_notes_shared FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "Participants can upsert shared notes"
  ON public.session_notes_shared FOR INSERT TO authenticated
  WITH CHECK (public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "Participants can edit shared notes"
  ON public.session_notes_shared FOR UPDATE TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()))
  WITH CHECK (public.is_session_participant(session_id, auth.uid()));

CREATE TABLE public.session_notes_private (
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_notes_private TO authenticated;
GRANT ALL ON public.session_notes_private TO service_role;
ALTER TABLE public.session_notes_private ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see only their own private notes"
  ON public.session_notes_private FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users insert their own private notes"
  ON public.session_notes_private FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own private notes"
  ON public.session_notes_private FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE public.session_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_resources TO authenticated;
GRANT ALL ON public.session_resources TO service_role;
ALTER TABLE public.session_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants can read resources"
  ON public.session_resources FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "Tutors can add resources"
  ON public.session_resources FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by AND public.is_session_tutor(session_id, auth.uid()));
CREATE POLICY "Tutors can delete resources"
  ON public.session_resources FOR DELETE TO authenticated
  USING (public.is_session_tutor(session_id, auth.uid()));

-- ============================================================
-- POLLS
-- ============================================================
CREATE TABLE public.session_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_polls TO authenticated;
GRANT ALL ON public.session_polls TO service_role;
ALTER TABLE public.session_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read polls"
  ON public.session_polls FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "Tutors create polls"
  ON public.session_polls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_session_tutor(session_id, auth.uid()));
CREATE POLICY "Tutors update polls"
  ON public.session_polls FOR UPDATE TO authenticated
  USING (public.is_session_tutor(session_id, auth.uid()))
  WITH CHECK (public.is_session_tutor(session_id, auth.uid()));

CREATE TABLE public.session_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.session_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_poll_votes TO authenticated;
GRANT ALL ON public.session_poll_votes TO service_role;
ALTER TABLE public.session_poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone in session can read votes"
  ON public.session_poll_votes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.session_polls p WHERE p.id = poll_id AND public.is_session_participant(p.session_id, auth.uid())));
CREATE POLICY "Users vote as themselves"
  ON public.session_poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REACTIONS + HAND RAISES
-- ============================================================
CREATE TABLE public.session_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.session_reactions TO authenticated;
GRANT ALL ON public.session_reactions TO service_role;
ALTER TABLE public.session_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read reactions"
  ON public.session_reactions FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "Participants react"
  ON public.session_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_session_participant(session_id, auth.uid()));

CREATE TABLE public.hand_raises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raised_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hand_raises TO authenticated;
GRANT ALL ON public.hand_raises TO service_role;
ALTER TABLE public.hand_raises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants see hand raises"
  ON public.hand_raises FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));
CREATE POLICY "Users raise their own hand"
  ON public.hand_raises FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or tutor can resolve hand raises"
  ON public.hand_raises FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_session_tutor(session_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_session_tutor(session_id, auth.uid()));

-- ============================================================
-- RATINGS + AI SUMMARIES
-- ============================================================
CREATE TABLE public.session_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_ratings TO authenticated;
GRANT SELECT ON public.session_ratings TO anon;
GRANT ALL ON public.session_ratings TO service_role;
ALTER TABLE public.session_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings are public" ON public.session_ratings FOR SELECT USING (true);
CREATE POLICY "Students can rate sessions they attended"
  ON public.session_ratings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND public.is_session_participant(session_id, auth.uid()));

CREATE TABLE public.ai_session_summaries (
  session_id UUID PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  key_points TEXT[] NOT NULL DEFAULT '{}',
  confused_topics TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ai_session_summaries TO authenticated;
GRANT ALL ON public.ai_session_summaries TO service_role;
ALTER TABLE public.ai_session_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read summaries"
  ON public.ai_session_summaries FOR SELECT TO authenticated
  USING (public.is_session_participant(session_id, auth.uid()));

-- ============================================================
-- COMMUNITIES
-- ============================================================
CREATE TABLE public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  cover_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.communities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Communities are public" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Anyone signed in can create a community"
  ON public.communities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Owner updates community"
  ON public.communities FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

CREATE TABLE public.community_members (
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.community_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (community_id, user_id)
);
GRANT SELECT ON public.community_members TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Membership is public" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "Users can join communities themselves"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave communities themselves"
  ON public.community_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_community_member(_community_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members WHERE community_id = _community_id AND user_id = _user_id
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_community_member(UUID, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_community_mod(_community_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = _community_id AND user_id = _user_id AND role IN ('owner','mod')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_community_mod(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- Auto-add creator as owner + maintain member_count
CREATE OR REPLACE FUNCTION public.handle_new_community()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner')
  ON CONFLICT DO NOTHING;
  -- seed a default #general channel
  INSERT INTO public.community_channels (community_id, name, kind, position)
  VALUES (NEW.id, 'general', 'text', 0);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_community() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.community_member_count_trg()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.communities SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.community_member_count_trg() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.community_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind public.channel_kind NOT NULL DEFAULT 'text',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_channels TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_channels TO authenticated;
GRANT ALL ON public.community_channels TO service_role;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels are public" ON public.community_channels FOR SELECT USING (true);
CREATE POLICY "Mods manage channels"
  ON public.community_channels FOR INSERT TO authenticated
  WITH CHECK (public.is_community_mod(community_id, auth.uid()));

-- Create triggers AFTER community_channels exists
CREATE TRIGGER on_community_created
  AFTER INSERT ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_community();
CREATE TRIGGER community_member_count_ins
  AFTER INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.community_member_count_trg();
CREATE TRIGGER community_member_count_del
  AFTER DELETE ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.community_member_count_trg();

CREATE TABLE public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.community_channels(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read channel messages"
  ON public.community_messages FOR SELECT TO authenticated
  USING (public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Members post channel messages"
  ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Authors or mods update"
  ON public.community_messages FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_community_mod(community_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_community_mod(community_id, auth.uid()));
CREATE POLICY "Authors or mods delete"
  ON public.community_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_community_mod(community_id, auth.uid()));
CREATE INDEX community_messages_channel_idx ON public.community_messages (channel_id, created_at);

CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are public" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Members can post"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Authors or mods edit posts"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.is_community_mod(community_id, auth.uid()))
  WITH CHECK (auth.uid() = user_id OR public.is_community_mod(community_id, auth.uid()));

-- ============================================================
-- DIRECT MESSAGES
-- ============================================================
CREATE TABLE public.direct_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.direct_threads TO authenticated;
GRANT ALL ON public.direct_threads TO service_role;
ALTER TABLE public.direct_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thread members read"
  ON public.direct_threads FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Anyone signed in can start a thread"
  ON public.direct_threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.direct_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thread members read messages"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.direct_threads t WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)));
CREATE POLICY "Thread members send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.direct_threads t WHERE t.id = thread_id AND (auth.uid() = t.user_a OR auth.uid() = t.user_b)));
CREATE INDEX direct_messages_thread_idx ON public.direct_messages (thread_id, created_at);

-- ============================================================
-- BADGES + STREAKS
-- ============================================================
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges are public" ON public.badges FOR SELECT USING (true);

INSERT INTO public.badges (key, name, description, icon) VALUES
  ('first_session', 'First Steps', 'Joined your first session', 'sparkles'),
  ('first_teach', 'First Teach', 'Taught your first session', 'graduation-cap'),
  ('streak_7', '7-Day Streak', 'Active 7 days in a row', 'flame'),
  ('streak_30', '30-Day Streak', 'Active 30 days in a row', 'flame'),
  ('helper', 'Helping Hand', 'Answered 10 homework doubts', 'hand'),
  ('community_builder', 'Builder', 'Created a community with 10+ members', 'users'),
  ('top_rated', 'Top Rated', 'Maintained a 4.5★+ rating', 'star'),
  ('night_owl', 'Night Owl', 'Studied past midnight', 'moon');

CREATE TABLE public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT INSERT ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User badges are public" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "Users award themselves badges"
  ON public.user_badges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.streaks TO anon, authenticated;
GRANT INSERT, UPDATE ON public.streaks TO authenticated;
GRANT ALL ON public.streaks TO service_role;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Streaks are public" ON public.streaks FOR SELECT USING (true);
CREATE POLICY "Users upsert their own streak"
  ON public.streaks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own streak"
  ON public.streaks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REPORTS (moderation)
-- ============================================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_kind TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status public.report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Anyone signed in can file a report"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins resolve reports"
  ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.session_messages,
  public.session_reactions,
  public.hand_raises,
  public.session_polls,
  public.session_poll_votes,
  public.session_notes_shared,
  public.session_participants,
  public.community_messages,
  public.direct_messages;
