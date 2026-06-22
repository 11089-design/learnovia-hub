import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageSquare, Plus, Search, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — Learnova" }] }),
  component: MessagesInbox,
});

type ThreadRow = {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
  other?: { id: string; display_name: string | null };
  last_message?: string | null;
};

function MessagesInbox() {
  const navigate = useNavigate();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [me, setMe] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ id: string; display_name: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setMe(u.user.id);
      const { data: ts } = await supabase.from("direct_threads")
        .select("id, user_a, user_b, last_message_at")
        .or(`user_a.eq.${u.user.id},user_b.eq.${u.user.id}`)
        .order("last_message_at", { ascending: false });
      const rows = (ts ?? []) as ThreadRow[];
      const otherIds = rows.map((r) => (r.user_a === u.user!.id ? r.user_b : r.user_a));
      const [{ data: profs }, ...lasts] = await Promise.all([
        supabase.from("profiles").select("id, display_name").in("id", otherIds),
        ...rows.map((r) => supabase.from("direct_messages").select("content").eq("thread_id", r.id).order("created_at", { ascending: false }).limit(1).maybeSingle()),
      ]);
      const pmap = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      setThreads(rows.map((r, i) => ({
        ...r,
        other: pmap[r.user_a === u.user!.id ? r.user_b : r.user_a],
        last_message: (lasts[i] as { data?: { content?: string } | null } | undefined)?.data?.content ?? null,
      })));
    })();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("id, display_name")
        .ilike("display_name", `%${search.trim()}%`).neq("id", me ?? "").limit(8);
      setResults((data ?? []) as { id: string; display_name: string | null }[]);
    }, 250);
    return () => clearTimeout(t);
  }, [search, me]);

  const startThread = async (otherId: string) => {
    if (!me) return;
    const [a, b] = me < otherId ? [me, otherId] : [otherId, me];
    const { data: existing } = await supabase.from("direct_threads").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let threadId = existing?.id;
    if (!threadId) {
      const { data, error } = await supabase.from("direct_threads").insert({ user_a: a, user_b: b }).select("id").single();
      if (error) { toast.error(error.message); return; }
      threadId = data.id;
    }
    navigate({ to: "/messages/$threadId", params: { threadId } });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Messages</h1>
          </div>
          <Button size="sm" onClick={() => setShowNew((v) => !v)} className="rounded-full bg-brand-gradient text-white">
            <Plus className="mr-1 h-3.5 w-3.5" /> New
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6">
        {showNew && (
          <div className="mb-4 rounded-2xl border border-border bg-card p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by display name…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {results.length > 0 && (
              <ul className="mt-2 space-y-1">
                {results.map((r) => (
                  <li key={r.id}>
                    <button onClick={() => startThread(r.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-accent/40">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
                        {(r.display_name ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <span className="text-sm">{r.display_name ?? "Anonymous"}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {threads.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No conversations yet. Start one with a tutor or friend.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {threads.map((t) => (
              <li key={t.id}>
                <Link to="/messages/$threadId" params={{ threadId: t.id }}
                  className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 transition hover:bg-accent/30">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
                    {(t.other?.display_name ?? "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="font-semibold">{t.other?.display_name ?? "Anonymous"}</span>
                      <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(t.last_message_at), { addSuffix: true })}</span>
                    </div>
                    {t.last_message && <p className="truncate text-sm text-muted-foreground">{t.last_message}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
