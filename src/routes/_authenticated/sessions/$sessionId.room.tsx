import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { SessionRoom } from "@/components/sessions/SessionRoom";
import { WaitingRoomStandby } from "@/components/sessions/WaitingRoomPanel";
import { canEnterRoom } from "@/lib/session-time";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/sessions/$sessionId/room")({
  head: () => ({ meta: [{ title: "Live session — Learnova" }] }),
  component: SessionRoomPage,
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

function SessionRoomPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [needsWaiting, setNeedsWaiting] = useState(false);
  const [tooEarly, setTooEarly] = useState(false);


  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUserId(u.user.id);

      const [{ data: s }, { data: p }] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, tutor_id, title, description, status, starts_at, meeting_room_name, locked, focus_mode, is_homework_help")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle(),
      ]);

      if (!s) { setDenied("Session not found"); setLoading(false); return; }
      setSession(s as Session);
      setDisplayName(p?.display_name ?? "Anonymous");

      if (s.tutor_id !== u.user.id) {
        if (!canEnterRoom(s)) { setTooEarly(true); setLoading(false); return; }

        const { data: part } = await supabase
          .from("session_participants")
          .select("id")
          .eq("session_id", sessionId)
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (!part) {
          if (s.locked) {
            // Route to waiting room instead of denying
            setNeedsWaiting(true);
            setLoading(false);
            return;
          }
          // auto-enroll on entering room when allowed
          const { error: enrollErr } = await supabase
            .from("session_participants")
            .insert({ session_id: sessionId, user_id: u.user.id, role: "student" });
          if (enrollErr) {
            toast.error("Couldn't join: " + enrollErr.message);
            setDenied("You need to enroll to join this room.");
            setLoading(false);
            return;
          }
        }
      }
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

  if (denied || !session || !userId) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">{denied ?? "Session not found"}</h1>
          <div className="mt-4 flex justify-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/sessions/$sessionId", params: { sessionId } })}>
              Back to session
            </Button>
            <Link to="/explore"><Button className="rounded-full">Explore</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  if (needsWaiting) {
    return (
      <WaitingRoomStandby
        sessionId={sessionId}
        userId={userId}
        displayName={displayName}
        onApproved={() => setNeedsWaiting(false)}
      />
    );
  }

  return <SessionRoom session={session} currentUserId={userId} myDisplayName={displayName} />;
}
