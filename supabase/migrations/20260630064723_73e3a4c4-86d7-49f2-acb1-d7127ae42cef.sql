
-- Community resources (folder + file uploads per channel or community)
CREATE TABLE public.community_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.community_channels(id) ON DELETE SET NULL,
  folder text NOT NULL DEFAULT 'General',
  name text NOT NULL,
  file_url text NOT NULL,
  file_path text,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_resources TO authenticated;
GRANT ALL ON public.community_resources TO service_role;
ALTER TABLE public.community_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read resources" ON public.community_resources
  FOR SELECT USING (public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Members add resources" ON public.community_resources
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by AND public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Uploader or mod delete resource" ON public.community_resources
  FOR DELETE USING (auth.uid() = uploaded_by OR public.is_community_mod(community_id, auth.uid()));

CREATE INDEX community_resources_community_idx ON public.community_resources(community_id, created_at DESC);

-- Polymorphic message reactions (community + session messages)
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_kind text NOT NULL CHECK (target_kind IN ('community_message','session_message')),
  message_id uuid NOT NULL,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_kind, message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in users read reactions" ON public.message_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Own reaction add" ON public.message_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own reaction remove" ON public.message_reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX message_reactions_lookup_idx
  ON public.message_reactions(target_kind, message_id);

-- Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.community_resources; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.community_channels; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.session_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
