import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Plus, Filter, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SessionCard, type SessionListItem } from "@/components/SessionCard";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore sessions — Learnova" },
      { name: "description", content: "Browse peer-led sessions, homework help, and hobby classes from students worldwide." },
    ],
  }),
  component: ExplorePage,
});

type Category = { id: string; name: string; slug: string };

function ExplorePage() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [catSlug, setCatSlug] = useState<string | null>(null);
  const [kind, setKind] = useState<"all" | "free" | "paid">("all");
  const [hwOnly, setHwOnly] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.from("categories").select("id, name, slug").order("name").then(({ data }) => setCategories(data ?? []));
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("sessions")
        .select("id, title, description, format, kind, price_cents, language, max_participants, starts_at, is_homework_help, status, category:categories(name, slug), tutor:profiles!sessions_tutor_id_fkey(display_name, avatar_url)")
        .neq("status", "ended")
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true, nullsFirst: false })
        .limit(60);
      if (kind !== "all") q = q.eq("kind", kind);
      if (hwOnly) q = q.eq("is_homework_help", true);
      const { data } = await q;
      let result = (data ?? []) as unknown as SessionListItem[];
      if (catSlug) result = result.filter((s) => s.category?.slug === catSlug);
      if (query.trim()) {
        const needle = query.toLowerCase();
        result = result.filter((s) => s.title.toLowerCase().includes(needle) || (s.description ?? "").toLowerCase().includes(needle));
      }
      setSessions(result);
    })();
  }, [catSlug, kind, hwOnly, query]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Explore sessions</h1>
            <p className="mt-1 text-muted-foreground">Peer-led classes, hobby workshops, and homework help.</p>
          </div>
          {signedIn && (
            <Link to="/sessions/new">
              <Button className="rounded-full bg-brand-gradient text-white shadow-soft">
                <Plus className="mr-1 h-4 w-4" /> Host a session
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="glass mb-6 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by topic, title…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["all", "free", "paid"].map((k) => (
                <button
                  key={k}
                  onClick={() => setKind(k as "all" | "free" | "paid")}
                  className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                    kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            <button
              onClick={() => setHwOnly((v) => !v)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                hwOnly ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
              }`}
            >
              <BookOpen className="mr-1 inline h-3 w-3" /> Homework help only
            </button>
          </div>

          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                onClick={() => setCatSlug(null)}
                className={`rounded-full border px-3 py-1 text-xs transition ${!catSlug ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
              >All categories</button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCatSlug(c.slug)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${catSlug === c.slug ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}
                >{c.name}</button>
              ))}
            </div>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Filter className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No sessions match your filters yet.</p>
            {signedIn && (
              <Link to="/sessions/new" className="mt-4 inline-block">
                <Button className="rounded-full bg-brand-gradient text-white">Be the first — host one</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => <SessionCard key={s.id} s={s} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
