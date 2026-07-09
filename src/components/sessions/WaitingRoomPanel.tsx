import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X, DoorOpen } from "lucide-react";
import { toast } from "sonner";

type Row = { id: string; user_id: string; display_name: string; status: string; requested_at: string };

/**
 * Waiting room panel. Tutor sees pending requests; learners auto-see this
 * screen via the room page when session is locked.
 */
export function WaitingRoomPanel({ sessionId, isTutor }: { sessionId: string; isTutor: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!isTutor) return;
    const load = async () => {
      const { data } = await supabase
        .from("session_waiting_room")
        .select("id, user_id, display_name, status, requested_at")
        .eq("session_id", sessionId)
        .eq("status", "pending")
        .order("requested_at", { ascending: true });
      setRows((data ?? []) as Row[]);
    };
    load();
    const ch = supabase
      .channel(`wr-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_waiting_room", filter: `session_id=eq.${sessionId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, isTutor]);

  if (!isTutor || rows.length === 0) return null;

  const approve = async (r: Row) => {
    const { error: insErr } = await supabase.from("session_participants").upsert(
      { session_id: sessionId, user_id: r.user_id, role: "student" },
      { onConflict: "session_id,user_id", ignoreDuplicates: true },
    );
    if (insErr) { toast.error(insErr.message); return; }
    await supabase.from("session_waiting_room").update({ status: "approved", resolved_at: new Date().toISOString() }).eq("id", r.id);
    toast.success(`${r.display_name} approved`);
  };
  const deny = async (r: Row) => {
    await supabase.from("session_waiting_room").update({ status: "denied", resolved_at: new Date().toISOString() }).eq("id", r.id);
    toast.info(`${r.display_name} denied`);
  };

  return (
    <div className="mb-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><DoorOpen className="h-3.5 w-3.5" /> Waiting room ({rows.length})</p>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-lg bg-background/60 px-2 py-1.5 text-sm">
            <span className="truncate">{r.display_name}</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => approve(r)}><Check className="h-3.5 w-3.5 text-emerald-600" /></Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => deny(r)}><X className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Screen shown to a learner who requested to join a locked session but hasn't
 * been approved yet. Polls their waiting_room row.
 */
export function WaitingRoomStandby({
  sessionId,
  userId,
  displayName,
  onApproved,
}: {
  sessionId: string;
  userId: string;
  displayName: string;
  onApproved: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "pending" | "denied">("idle");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: existing } = await supabase
        .from("session_waiting_room")
        .select("status")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (existing?.status === "approved") { onApproved(); return; }
      if (!existing) {
        await supabase.from("session_waiting_room").insert({
          session_id: sessionId,
          user_id: userId,
          display_name: displayName,
        });
      }
      if (!cancelled) setStatus(existing?.status === "denied" ? "denied" : "pending");
    })();

    const ch = supabase
      .channel(`wr-me-${sessionId}-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_waiting_room", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const next = payload.new as { user_id: string; status: string } | undefined;
          if (!next || next.user_id !== userId) return;
          if (next.status === "approved") onApproved();
          else if (next.status === "denied") setStatus("denied");
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [sessionId, userId, displayName, onApproved]);

  return (
    <div className="grid min-h-[60vh] place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10">
          <DoorOpen className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">
          {status === "denied" ? "You weren't let in" : "Waiting to be let in…"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === "denied"
            ? "The tutor didn't approve your entry. You can try again later."
            : "This session is locked. The tutor will approve you shortly."}
        </p>
      </div>
    </div>
  );
}
