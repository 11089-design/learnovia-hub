import { useEffect, useMemo, useState } from "react";
import { SmilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type TargetKind = "community_message" | "session_message";
type Reaction = { id: string; message_id: string; user_id: string; emoji: string };

const QUICK = ["👍", "❤️", "😂", "🎉", "🔥", "💡", "👀", "🙏"];

export function MessageReactions({
  targetKind,
  messageId,
  userId,
  channelKey,
}: {
  targetKind: TargetKind;
  messageId: string;
  userId: string;
  channelKey: string; // e.g. session id or channel id — used to share a realtime channel
}) {
  const [reactions, setReactions] = useState<Reaction[]>([]);

  useEffect(() => {
    let alive = true;
    supabase
      .from("message_reactions")
      .select("id, message_id, user_id, emoji")
      .eq("target_kind", targetKind)
      .eq("message_id", messageId)
      .then(({ data }) => { if (alive && data) setReactions(data as Reaction[]); });

    const ch = supabase
      .channel(`rx-${targetKind}-${messageId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "message_reactions", filter: `message_id=eq.${messageId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setReactions((r) => (r.some((x) => x.id === (payload.new as Reaction).id) ? r : [...r, payload.new as Reaction]));
          } else if (payload.eventType === "DELETE") {
            setReactions((r) => r.filter((x) => x.id !== (payload.old as Reaction).id));
          }
        })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [targetKind, messageId, channelKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean; id?: string }>();
    for (const r of reactions) {
      const g = map.get(r.emoji) ?? { count: 0, mine: false };
      g.count += 1;
      if (r.user_id === userId) { g.mine = true; g.id = r.id; }
      map.set(r.emoji, g);
    }
    return Array.from(map.entries());
  }, [reactions, userId]);

  const toggle = async (emoji: string) => {
    const existing = reactions.find((r) => r.user_id === userId && r.emoji === emoji);
    if (existing) {
      setReactions((r) => r.filter((x) => x.id !== existing.id));
      await supabase.from("message_reactions").delete().eq("id", existing.id);
    } else {
      const optimistic: Reaction = { id: `tmp-${Date.now()}`, message_id: messageId, user_id: userId, emoji };
      setReactions((r) => [...r, optimistic]);
      const { data, error } = await supabase
        .from("message_reactions")
        .insert({ target_kind: targetKind, message_id: messageId, user_id: userId, emoji })
        .select("id, message_id, user_id, emoji").single();
      if (error) {
        setReactions((r) => r.filter((x) => x.id !== optimistic.id));
      } else if (data) {
        setReactions((r) => r.map((x) => (x.id === optimistic.id ? (data as Reaction) : x)));
      }
    }
  };

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {grouped.map(([emoji, g]) => (
        <button key={emoji} type="button" onClick={() => toggle(emoji)}
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition ${g.mine ? "border-primary/50 bg-primary/10" : "border-border bg-muted/40 hover:bg-accent/40"}`}>
          <span>{emoji}</span><span className="text-[10px] tabular-nums">{g.count}</span>
        </button>
      ))}
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-border text-muted-foreground transition hover:border-primary/60 hover:text-primary" title="Add reaction">
            <SmilePlus className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-1">
          <div className="flex gap-1">
            {QUICK.map((e) => (
              <button key={e} onClick={() => toggle(e)} className="rounded-md px-1.5 py-1 text-lg transition hover:bg-accent">
                {e}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
