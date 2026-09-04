import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trophy, Flame, Star, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Learnova" }] }),
  component: LeaderboardPage,
});

type StreakRow = { user_id: string; current_streak: number; profiles?: { display_name: string | null; avatar_url: string | null } | null };
type TutorRow = { id: string; display_name: string | null; avatar_url: string | null; avg_rating: number; free_sessions_taught: number };

function LeaderboardPage() {
  const navigate = useNavigate();
  const [streaks, setStreaks] = useState<StreakRow[]>([]);
  const [tutors, setTutors] = useState<TutorRow[]>([]);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
    supabase.from("streaks").select("user_id, current_streak, profiles(display_name, avatar_url)").order("current_streak", { ascending: false }).limit(20).then(({ data }) => setStreaks((data ?? []) as unknown as StreakRow[]));
    supabase.from("profiles").select("id, display_name, avatar_url, avg_rating, free_sessions_taught").eq("role", "tutor").order("avg_rating", { ascending: false }).limit(20).then(({ data }) => setTutors((data ?? []) as TutorRow[]));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="app" />
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 pt-6">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold tracking-tight">Leaderboard</h1>
      </div>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-8 md:grid-cols-2">
        <section className="glass rounded-2xl p-5 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Flame className="h-4 w-4 text-orange-500" /> Top learners by streak</h2>
          {streaks.length === 0 ? <p className="text-sm text-muted-foreground">No streaks yet.</p> : (
            <ol className="space-y-2">
              {streaks.map((r, i) => (
                <li key={r.user_id} className={`flex items-center justify-between rounded-xl p-2 ${r.user_id === me ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-accent/30"}`}>
                  <Link to="/users/$userId" params={{ userId: r.user_id }} className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold">{i + 1}</span>
                    {r.profiles?.avatar_url ? (
                      <img src={r.profiles.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">{(r.profiles?.display_name ?? "?").slice(0, 1).toUpperCase()}</div>
                    )}
                    <span className="truncate text-sm">{r.profiles?.display_name ?? "Anonymous"}</span>
                  </Link>
                  <Badge className="rounded-full bg-orange-500/15 text-orange-700"><Flame className="mr-1 h-3 w-3" />{r.current_streak}d</Badge>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="glass rounded-2xl p-5 shadow-soft">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><GraduationCap className="h-4 w-4 text-primary" /> Top-rated tutors</h2>
          {tutors.length === 0 ? <p className="text-sm text-muted-foreground">No tutors yet.</p> : (
            <ol className="space-y-2">
              {tutors.map((t, i) => (
                <li key={t.id} className={`flex items-center justify-between rounded-xl p-2 ${t.id === me ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-accent/30"}`}>
                  <Link to="/users/$userId" params={{ userId: t.id }} className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold">{i + 1}</span>
                    {t.avatar_url ? (
                      <img src={t.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">{(t.display_name ?? "?").slice(0, 1).toUpperCase()}</div>
                    )}
                    <span className="truncate text-sm">{t.display_name ?? "Anonymous"}</span>
                  </Link>
                  <div className="flex items-center gap-1 text-xs">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{Number(t.avg_rating ?? 0).toFixed(1)}</span>
                    <span className="text-muted-foreground">· {t.free_sessions_taught}s</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}
