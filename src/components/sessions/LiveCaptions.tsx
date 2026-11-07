import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

type Line = { id: string; speaker_name: string; content: string; at_seconds: number; user_id: string };

/** Displays transcript entries already saved for this session; no audio is recorded here. */
export function LiveCaptions({
  sessionId,
}: {
  sessionId: string;
}) {
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("session_transcripts")
      .select("id, speaker_name, content, at_seconds, user_id")
      .eq("session_id", sessionId)
      .order("at_seconds", { ascending: true })
      .limit(500)
      .then(({ data }) => { if (alive) setLines((data ?? []) as Line[]); });

    const ch = supabase
      .channel(`transcript-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_transcripts", filter: `session_id=eq.${sessionId}` }, (p) => {
        const row = p.new as Line;
        setLines((cur) => (cur.some((l) => l.id === row.id) ? cur : [...cur, row]));
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [sessionId]);

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex h-full flex-col gap-2">
      <ScrollArea className="min-h-[120px] flex-1 rounded-2xl border border-border/60 bg-background/50 p-3">
        {lines.length === 0 ? (
          <p className="text-xs text-muted-foreground">No transcript entries are available for this session.</p>
        ) : (
          <div className="space-y-2 text-xs leading-relaxed">
            {lines.map((l) => (
              <p key={l.id}>
                <span className="font-mono text-[10px] text-muted-foreground">{mmss(l.at_seconds)}</span>{" "}
                <span className="font-semibold">{l.speaker_name}:</span> {l.content}
              </p>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
