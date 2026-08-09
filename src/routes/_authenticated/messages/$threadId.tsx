import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/$threadId")({
  head: () => ({ meta: [{ title: "Chat — Learnova" }] }),
  component: ThreadPage,
});

type DirectMessage = { id: string; sender_id: string; content: string; created_at: string };

function ThreadPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [otherName, setOtherName] = useState<string>("…");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
      const { data: thread } = await supabase.from("direct_threads").select("user_a, user_b").eq("id", threadId).maybeSingle();
      if (thread) {
        const otherId = thread.user_a === u.user.id ? thread.user_b : thread.user_a;
        const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", otherId).maybeSingle();
        setOtherName(prof?.display_name ?? "Anonymous");
      }
      const { data } = await supabase.from("direct_messages").select("id, sender_id, content, created_at")
        .eq("thread_id", threadId).order("created_at").limit(500);
      setMessages((data ?? []) as DirectMessage[]);
      setLoading(false);
    })();

    const ch = supabase.channel(`dm-${threadId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages", filter: `thread_id=eq.${threadId}` }, (p) => {
        setMessages((m) => [...m, p.new as DirectMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !me) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("direct_messages").insert({ thread_id: threadId, sender_id: me, content: body });
    if (error) toast.error(error.message);
    else await supabase.from("direct_threads").update({ last_message_at: new Date().toISOString() }).eq("id", threadId);
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/messages" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {otherName.slice(0, 1).toUpperCase()}
          </div>
          <h1 className="font-semibold">{otherName}</h1>
        </div>
      </header>
      <main ref={scrollRef} className="mx-auto w-full max-w-3xl flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {messages.map((m) => {
          const mine = m.sender_id === me;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{format(new Date(m.created_at), "h:mm a")}</p>
              </div>
            </div>
          );
        })}
        {messages.length === 0 && <p className="py-12 text-center text-xs text-muted-foreground">Say hello to start the conversation.</p>}
      </main>
      <form onSubmit={send} className="mx-auto flex w-full max-w-3xl gap-2 border-t border-border/50 p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
        <Button type="submit" size="icon" className="bg-brand-gradient text-white"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
