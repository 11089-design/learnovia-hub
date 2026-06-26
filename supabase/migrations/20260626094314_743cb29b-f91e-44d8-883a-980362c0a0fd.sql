
-- 1. EXECUTE grants on RLS helper functions (were denying chat inserts)
GRANT EXECUTE ON FUNCTION public.is_session_participant(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_session_tutor(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_community_mod(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- 2. Media bucket policies — public read, authed users manage their own folder (path = "<uid>/...")
DROP POLICY IF EXISTS "Media public read" ON storage.objects;
DROP POLICY IF EXISTS "Media authed upload" ON storage.objects;
DROP POLICY IF EXISTS "Media owner update" ON storage.objects;
DROP POLICY IF EXISTS "Media owner delete" ON storage.objects;

CREATE POLICY "Media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'media');
CREATE POLICY "Media authed upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Media owner update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'media' AND owner = auth.uid());
CREATE POLICY "Media owner delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND owner = auth.uid());

-- 3. Realtime for community_channels (so new channels appear live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels;

-- 4. Allow community mods/owners to update their community (for cover_url etc.)
DROP POLICY IF EXISTS "Owners or mods can update community" ON public.communities;
CREATE POLICY "Owners or mods can update community" ON public.communities
  FOR UPDATE TO authenticated
  USING (public.is_community_mod(id, auth.uid()))
  WITH CHECK (public.is_community_mod(id, auth.uid()));
