import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SessionRoom } from "@/components/sessions/SessionRoom";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId")({
  head: () => ({ meta: [{ title: "Session — Learnova" }] }),
  component: SessionPage,
});

type Session = {
  id: string;
  tutor_id: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  meeting_room_name: string;
  locked: boolean;
  focus_mode: boolean;
  is_homework_help: boolean;
};

function SessionPage() {
  const { sessionId } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from("sessions").select("id, tutor_id, title, description, status, starts_at, meeting_room_name, locked, focus_mode, is_homework_help").eq("id", sessionId).maybeSingle(),
        supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle(),
      ]);
      if (!s) { setNotFound(true); setLoading(false); return; }
      setSession(s as Session);
      setDisplayName(p?.display_name ?? "Anonymous");
      setLoading(false);
    })();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (notFound || !session || !userId) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">Session not found</h1>
          <Link to="/explore"><Button className="mt-4 rounded-full">Back to Explore</Button></Link>
        </div>
      </div>
    );
  }
  return <SessionRoom session={session} currentUserId={userId} myDisplayName={displayName} />;
}
