
-- 1. profiles: hide sensitive columns from anonymous visitors (keep public discovery columns)
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, display_name, full_name, avatar_url, headline, role, avg_rating, free_sessions_taught, created_at, updated_at, interests, onboarded)
  ON public.profiles TO anon;

-- 2. session_participants: only members/tutors can read
DROP POLICY IF EXISTS "Participants are public for discovery" ON public.session_participants;
CREATE POLICY "Members and hosts read participants" ON public.session_participants
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_session_participant(session_id, auth.uid())
    OR public.is_session_tutor(session_id, auth.uid())
  );

-- 3. session_ratings: signed-in only
DROP POLICY IF EXISTS "Ratings are public" ON public.session_ratings;
CREATE POLICY "Signed in users read ratings" ON public.session_ratings
  FOR SELECT TO authenticated USING (true);

-- 4. message_reactions: scope to session participants / community members
DROP POLICY IF EXISTS "Signed in users read reactions" ON public.message_reactions;
CREATE POLICY "Scoped reaction reads" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.session_messages sm
      WHERE sm.id = public.message_reactions.message_id
        AND (public.is_session_participant(sm.session_id, auth.uid())
             OR public.is_session_tutor(sm.session_id, auth.uid()))
    )
    OR EXISTS (
      SELECT 1 FROM public.community_messages cm
      JOIN public.community_channels cc ON cc.id = cm.channel_id
      WHERE cm.id = public.message_reactions.message_id
        AND public.is_community_member(cc.community_id, auth.uid())
    )
  );

-- 5. SECURITY DEFINER functions: not callable by signed-out visitors; triggers not callable at all
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_community_member(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_community_mod(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_course_host(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_session_participant(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_session_tutor(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_verified_for(uuid, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_community_mod(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_course_host(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_session_participant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_session_tutor(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_verified_for(uuid, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.community_member_count_trg() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.course_enrolled_count_trg() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.courses_require_three_days() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.handle_new_community() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;
