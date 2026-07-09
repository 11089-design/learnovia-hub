import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, DoorOpen, X, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Breakout = { id: string; name: string; closed: boolean; created_at: string };
type Assignment = { breakout_id: string; user_id: string };
type Participant = { user_id: string; display_name: string | null };

/**
 * Breakout rooms panel. Tutors can create rooms, auto-split, and assign
 * participants. Everyone (tutor + assigned learners) can join their own
 * breakout, which swaps the video pane to a separate LiveKit room.
 */
export function BreakoutsPanel({
  sessionId,
  userId,
  isTutor,
  activeBreakoutId,
  onJoin,
  onLeave,
}: {
  sessionId: string;
  userId: string;
  isTutor: boolean;
  activeBreakoutId: string | null;
  onJoin: (breakoutId: string) => void;
  onLeave: () => void;
}) {
  const [breakouts, setBreakouts] = useState<Breakout[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const loadBreakouts = async () => {
      const { data } = await supabase
        .from("session_breakouts")
        .select("id, name, closed, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      setBreakouts((data ?? []) as Breakout[]);
    };
    const loadParts = async () => {
      const { data } = await supabase
        .from("session_participants")
        .select("user_id, profiles:profiles!inner(display_name)")
        .eq("session_id", sessionId);
      setParticipants(
        (data ?? []).map((r) => {
          const rec = r as { user_id: string; profiles: { display_name: string | null } | { display_name: string | null }[] | null };
          const prof = Array.isArray(rec.profiles) ? rec.profiles[0] : rec.profiles;
          return { user_id: rec.user_id, display_name: prof?.display_name ?? null };
        }),
      );
    };
    loadBreakouts();
    loadParts();
    const ch = supabase
      .channel(`bo-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_breakouts", filter: `session_id=eq.${sessionId}` }, loadBreakouts)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_breakout_assignments" }, loadAssignments)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const loadAssignments = async () => {
    if (breakouts.length === 0) { setAssignments([]); return; }
    const { data } = await supabase
      .from("session_breakout_assignments")
      .select("breakout_id, user_id")
      .in("breakout_id", breakouts.map((b) => b.id));
    setAssignments((data ?? []) as Assignment[]);
  };
  useEffect(() => { loadAssignments(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [breakouts]);

  const myBreakoutId = useMemo(
    () => assignments.find((a) => a.user_id === userId)?.breakout_id ?? null,
    [assignments, userId],
  );

  const create = async () => {
    const name = newName.trim() || `Room ${breakouts.length + 1}`;
    const { error } = await supabase.from("session_breakouts").insert({ session_id: sessionId, name });
    if (error) toast.error(error.message);
    else { setNewName(""); setCreating(false); }
  };

  const remove = async (id: string) => {
    await supabase.from("session_breakouts").delete().eq("id", id);
    if (activeBreakoutId === id) onLeave();
  };

  const toggleAssign = async (breakoutId: string, uid: string) => {
    const exists = assignments.some((a) => a.breakout_id === breakoutId && a.user_id === uid);
    if (exists) {
      await supabase.from("session_breakout_assignments").delete()
        .eq("breakout_id", breakoutId).eq("user_id", uid);
    } else {
      // remove any prior assignment for this user in this session's breakouts
      const others = assignments.filter((a) => a.user_id === uid).map((a) => a.breakout_id);
      if (others.length > 0) {
        await supabase.from("session_breakout_assignments").delete()
          .eq("user_id", uid).in("breakout_id", others);
      }
      await supabase.from("session_breakout_assignments").insert({ breakout_id: breakoutId, user_id: uid });
    }
  };

  const autoSplit = async () => {
    if (breakouts.length === 0) { toast.error("Create at least one room first"); return; }
    const learners = participants.filter((p) => p.user_id !== userId);
    if (learners.length === 0) { toast.info("No learners to split"); return; }
    // clear existing
    await supabase.from("session_breakout_assignments").delete()
      .in("breakout_id", breakouts.map((b) => b.id));
    const shuffled = [...learners].sort(() => Math.random() - 0.5);
    const rows = shuffled.map((p, i) => ({ breakout_id: breakouts[i % breakouts.length].id, user_id: p.user_id }));
    const { error } = await supabase.from("session_breakout_assignments").insert(rows);
    if (error) toast.error(error.message);
    else toast.success("Split evenly");
  };

  const nameOf = (uid: string) => participants.find((p) => p.user_id === uid)?.display_name ?? "Anonymous";

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Users className="h-3.5 w-3.5 text-primary" /> Breakouts</h3>
        {activeBreakoutId && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={onLeave}>
            <X className="mr-1 h-3.5 w-3.5" /> Leave breakout
          </Button>
        )}
      </div>

      {isTutor && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {creating ? (
            <div className="flex flex-1 gap-1">
              <Input placeholder="Room name" value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8" />
              <Button size="sm" className="bg-brand-gradient text-white" onClick={create}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewName(""); }}>Cancel</Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setCreating(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" /> New room
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={autoSplit}>
                <Shuffle className="mr-1 h-3.5 w-3.5" /> Auto-split
              </Button>
            </>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 pr-2">
        {breakouts.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No breakout rooms yet.</p>
        ) : (
          <ul className="space-y-2">
            {breakouts.map((b) => {
              const members = assignments.filter((a) => a.breakout_id === b.id);
              const iAmHere = members.some((m) => m.user_id === userId);
              const canJoin = isTutor || iAmHere;
              return (
                <li key={b.id} className="rounded-xl border border-border/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{b.name}</span>
                      <Badge variant="secondary" className="rounded-full text-[10px]">{members.length}</Badge>
                      {myBreakoutId === b.id && <Badge className="rounded-full bg-primary/15 text-primary text-[10px]">Assigned to you</Badge>}
                    </div>
                    <div className="flex gap-1">
                      {canJoin && (
                        <Button size="sm" className="h-7 rounded-full bg-brand-gradient text-white"
                          onClick={() => onJoin(b.id)} disabled={activeBreakoutId === b.id}>
                          <DoorOpen className="mr-1 h-3.5 w-3.5" /> {activeBreakoutId === b.id ? "In room" : "Join"}
                        </Button>
                      )}
                      {isTutor && (
                        <button onClick={() => remove(b.id)} title="Delete room">
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {members.length === 0 && <span className="text-[11px] text-muted-foreground">No one assigned</span>}
                    {members.map((m) => (
                      <button
                        key={m.user_id}
                        disabled={!isTutor}
                        onClick={() => toggleAssign(b.id, m.user_id)}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] hover:bg-destructive/10"
                        title={isTutor ? "Remove from room" : ""}
                      >
                        {nameOf(m.user_id)}
                      </button>
                    ))}
                  </div>

                  {isTutor && (
                    <details className="mt-2 text-[11px]">
                      <summary className="cursor-pointer text-muted-foreground">Assign learners</summary>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {participants
                          .filter((p) => p.user_id !== userId && !members.some((m) => m.user_id === p.user_id))
                          .map((p) => (
                            <button key={p.user_id} onClick={() => toggleAssign(b.id, p.user_id)}
                              className="rounded-full border border-dashed border-border px-2 py-0.5 hover:border-primary hover:text-primary">
                              + {p.display_name ?? "Anonymous"}
                            </button>
                          ))}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
