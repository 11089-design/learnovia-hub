
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.has_role(uuid, app_role) SET SCHEMA private;
ALTER FUNCTION public.is_community_member(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_community_mod(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_course_host(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_session_participant(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_session_tutor(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_verified_for(uuid, text) SET SCHEMA private;

REVOKE ALL ON FUNCTION private.has_role(uuid, app_role) FROM anon, public;
REVOKE ALL ON FUNCTION private.is_community_member(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION private.is_community_mod(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION private.is_course_host(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION private.is_session_participant(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION private.is_session_tutor(uuid, uuid) FROM anon, public;
REVOKE ALL ON FUNCTION private.is_verified_for(uuid, text) FROM anon, public;

GRANT EXECUTE ON FUNCTION private.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_community_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_community_mod(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_course_host(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_session_participant(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_session_tutor(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_verified_for(uuid, text) TO authenticated, service_role;
