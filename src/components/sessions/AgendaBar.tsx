import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ListChecks, Clock } from "lucide-react";
import { toast } from "sonner";

export type AgendaItem = { title: string; minutes: number };

/**
 * Compact horizontal agenda/timeline bar. Tutor can edit inline; learners see
 * the current step highlighted based on elapsed time since session.started_at.
 */
export function AgendaBar({
  sessionId,
  isTutor,
  startedAt,
  initialAgenda,
  onStarted,
}: {
  sessionId: string;
  isTutor: boolean;
  startedAt: string | null;
  initialAgenda: AgendaItem[];
  onStarted?: (iso: string) => void;
}) {
  const [items, setItems] = useState<AgendaItem[]>(initialAgenda ?? []);
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [localStart, setLocalStart] = useState<string | null>(startedAt);

  useEffect(() => {
    if (startedAt) setLocalStart(startedAt);
  }, [startedAt]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);


  useEffect(() => {
    const ch = supabase
      .channel(`agenda-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const next = payload.new as { agenda: unknown } | undefined;
          if (next && Array.isArray(next.agenda)) setItems(next.agenda as AgendaItem[]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId]);

  const save = async (next: AgendaItem[]) => {
    setItems(next);
    const { error } = await supabase.from("sessions").update({ agenda: next as unknown as never }).eq("id", sessionId);
    if (error) toast.error(error.message);
  };

  const startClock = async () => {
    const { error } = await supabase.from("sessions").update({ started_at: new Date().toISOString() }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else toast.success("Session clock started");
  };

  const elapsedMin = startedAt ? Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000)) : null;

  // Compute active step
  let activeIdx = -1;
  if (elapsedMin !== null && items.length > 0) {
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      acc += Math.max(1, items[i].minutes);
      if (elapsedMin < acc) { activeIdx = i; break; }
    }
    if (activeIdx === -1) activeIdx = items.length - 1;
  }

  if (!editing && items.length === 0 && !isTutor) return null;

  return (
    <div className="mb-3 rounded-2xl border border-border/60 bg-card p-2">
      <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-semibold uppercase text-muted-foreground">
        <span className="flex items-center gap-1"><ListChecks className="h-3 w-3" /> Agenda {elapsedMin !== null && <span className="ml-1 flex items-center gap-0.5 text-primary"><Clock className="h-3 w-3" />{elapsedMin}m</span>}</span>
        {isTutor && (
          <div className="flex gap-1">
            {!startedAt && <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={startClock}>Start clock</Button>}
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => setEditing((v) => !v)}>{editing ? "Done" : "Edit"}</Button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input value={it.title} placeholder="Step title" onChange={(e) => save(items.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
              <Input type="number" min={1} className="w-20" value={it.minutes} onChange={(e) => save(items.map((x, j) => j === i ? { ...x, minutes: Number(e.target.value) || 1 } : x))} />
              <button onClick={() => save(items.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" /></button>
            </div>
          ))}
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => save([...items, { title: "New step", minutes: 10 }])}>
            <Plus className="mr-1 h-3 w-3" /> Add step
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="px-1 py-1 text-xs text-muted-foreground">No agenda yet.</p>
      ) : (
        <ol className="flex gap-1.5 overflow-x-auto pb-1">
          {items.map((it, i) => (
            <li key={i} className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${i === activeIdx ? "border-primary bg-primary/10 text-primary" : i < activeIdx ? "border-border bg-muted text-muted-foreground line-through" : "border-border"}`}>
              <span className="font-medium">{i + 1}.</span> {it.title} <span className="text-muted-foreground">· {it.minutes}m</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
