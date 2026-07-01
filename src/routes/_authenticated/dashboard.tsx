import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Sparkles, LogOut, Calendar, MessageSquare, Users, Award, Flame, Plus, BookOpen, Shield, Compass,
  Trophy, Wand2, Star, TrendingUp, GraduationCap, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge as UIBadge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "learner" | "tutor";
  avg_rating: number;
  free_sessions_taught: number;
  can_charge: boolean;
  onboarded: boolean;
  interests: string[];
};
type UpcomingSession = { id: string; title: string; starts_at: string | null; tutor_id: string };
type BadgeRow = { badge_id: string; awarded_at: string; badges: { key: string; name: string; description: string | null; icon: string | null } | null };
type LeaderRow = { user_id: string; current_streak: number; profiles?: { display_name: string | null } | null };
type FeaturedTutor = { id: string; display_name: string | null; avatar_url: string | null; headline: string | null; avg_rating: number; free_sessions_taught: number };
type CommunityCard = { id: string; slug: string; name: string; member_count: number; cover_url: string | null };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Learnova" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [hosting, setHosting] = useState<UpcomingSession[]>([]);
  const [badges, setBadges] = useState<BadgeRow[]>([]);
  const [streak, setStreak] = useState<{ current_streak: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [tutorsFeatured, setTutorsFeatured] = useState<FeaturedTutor[]>([]);
  const [communities, setCommunities] = useState<CommunityCard[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [sessionsAttended, setSessionsAttended] = useState(0);
  const [latestPlan, setLatestPlan] = useState<{ title: string; created_at: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;

      const [{ data: p }, { data: ups }, { data: host }, { data: bs }, { data: st }, { data: roles }, { data: lb }, { data: tt }, { data: com }, { data: parts }, { data: plan }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, role, avg_rating, free_sessions_taught, can_charge, onboarded, interests").eq("id", uid).maybeSingle(),
        supabase.from("session_participants").select("session:sessions(id, title, starts_at, tutor_id)").eq("user_id", uid).limit(20),
        supabase.from("sessions").select("id, title, starts_at, tutor_id").eq("tutor_id", uid).neq("status", "ended").order("starts_at", { ascending: true, nullsFirst: false }).limit(10),
        supabase.from("user_badges").select("badge_id, awarded_at, badges(key, name, description, icon)").eq("user_id", uid).order("awarded_at", { ascending: false }).limit(8),
        supabase.from("streaks").select("current_streak").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("streaks").select("user_id, current_streak, profiles(display_name)").order("current_streak", { ascending: false }).limit(5),
        supabase.from("profiles").select("id, display_name, avatar_url, headline, avg_rating, free_sessions_taught").eq("role", "tutor").order("avg_rating", { ascending: false }).limit(4),
        supabase.from("communities").select("id, slug, name, member_count, cover_url").order("member_count", { ascending: false }).limit(4),
        supabase.from("session_participants").select("attended_minutes").eq("user_id", uid),
        supabase.from("study_plans").select("title, created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

      if (p) {
        setProfile(p as Profile);
        if (!p.onboarded) navigate({ to: "/onboarding" });
      }
      setUpcoming((ups ?? []).map((r) => r.session as UpcomingSession).filter(Boolean).slice(0, 5));
      setHosting((host ?? []) as UpcomingSession[]);
      setBadges((bs ?? []) as unknown as BadgeRow[]);
      setStreak(st ?? null);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin" || r.role === "moderator"));
      setLeaders((lb ?? []) as unknown as LeaderRow[]);
      setTutorsFeatured((tt ?? []) as FeaturedTutor[]);
      setCommunities((com ?? []) as CommunityCard[]);
      setTotalMinutes((parts ?? []).reduce((sum, x) => sum + (x.attended_minutes ?? 0), 0));
      setSessionsAttended((parts ?? []).length);
      setLatestPlan(plan ?? null);

      // Bump streak (best-effort)
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("streaks").upsert(
        { user_id: uid, current_streak: (st?.current_streak ?? 0) + (st ? 0 : 1), last_active_date: today },
        { onConflict: "user_id", ignoreDuplicates: true },
      );

      // Auto-award eligible badges (idempotent)
      autoAwardBadges({
        uid,
        streak: st?.current_streak ?? 0,
        sessions: (parts ?? []).length,
        role: (p as Profile | null)?.role,
        canCharge: (p as Profile | null)?.can_charge ?? false,
        avgRating: Number((p as Profile | null)?.avg_rating ?? 0),
      });
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const trustProgress = useMemo(() => (profile ? Math.min((profile.free_sessions_taught / 5) * 100, 100) : 0), [profile]);

  if (!profile) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  const isTutor = profile.role === "tutor";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Learn<span className="gradient-text">ova</span></span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/explore"><Button variant="ghost" size="sm"><Compass className="mr-1 h-4 w-4" /> Explore</Button></Link>
            <Link to="/communities"><Button variant="ghost" size="sm"><Users className="mr-1 h-4 w-4" /> Communities</Button></Link>
            <Link to="/messages"><Button variant="ghost" size="sm"><MessageSquare className="mr-1 h-4 w-4" /> Messages</Button></Link>
            <Link to="/leaderboard"><Button variant="ghost" size="sm"><Trophy className="mr-1 h-4 w-4" /> Leaderboard</Button></Link>
            {!isTutor && <Link to="/study-plan"><Button variant="ghost" size="sm"><Wand2 className="mr-1 h-4 w-4" /> Study plan</Button></Link>}
            {isAdmin && <Link to="/admin"><Button variant="ghost" size="sm"><Shield className="mr-1 h-4 w-4" /> Admin</Button></Link>}
          </nav>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {/* Hero */}
        <section className="glass relative mb-6 overflow-hidden rounded-3xl p-6 shadow-soft md:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-gradient opacity-30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-accent/40 opacity-40 blur-3xl" />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{profile.display_name || "friend"} 👋</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <UIBadge variant="secondary" className="rounded-full capitalize">{profile.role}</UIBadge>
                {profile.interests.slice(0, 4).map((t) => <UIBadge key={t} variant="outline" className="rounded-full">{t}</UIBadge>)}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/explore"><Button variant="outline" className="rounded-full">Browse sessions</Button></Link>
              {isTutor ? (
                <Link to="/sessions/new"><Button className="rounded-full bg-brand-gradient text-white shadow-soft"><Plus className="mr-1 h-4 w-4" /> Host a session</Button></Link>
              ) : (
                <Link to="/study-plan"><Button className="rounded-full bg-brand-gradient text-white shadow-soft"><Wand2 className="mr-1 h-4 w-4" /> AI Study plan</Button></Link>
              )}
            </div>
          </div>

          {/* Quick stats strip */}
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatChip icon={<Flame className="h-4 w-4" />} label="Day streak" value={`${streak?.current_streak ?? 0}`} tone="orange" />
            <StatChip icon={<Calendar className="h-4 w-4" />} label="Sessions" value={`${sessionsAttended}`} tone="primary" />
            <StatChip icon={<TrendingUp className="h-4 w-4" />} label="Minutes learned" value={`${totalMinutes}`} tone="mint" />
            <StatChip icon={<Award className="h-4 w-4" />} label="Badges" value={`${badges.length}`} tone="lavender" />
          </div>
        </section>

        {/* Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Upcoming sessions" icon={<Calendar className="h-4 w-4" />}>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing booked yet. <Link to="/explore" className="text-primary hover:underline">Find one</Link>.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <li key={s.id}>
                    <Link to="/sessions/$sessionId" params={{ sessionId: s.id }} className="block rounded-lg p-2 text-sm hover:bg-accent/40">
                      <p className="truncate font-medium">{s.title}</p>
                      {s.starts_at && <p className="text-xs text-muted-foreground">{format(new Date(s.starts_at), "EEE, MMM d · h:mm a")}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isTutor ? (
            <Card title="Sessions you're hosting" icon={<BookOpen className="h-4 w-4" />}>
              {hosting.length === 0 ? (
                <p className="text-sm text-muted-foreground">Host your first session — your trust score starts there.</p>
              ) : (
                <ul className="space-y-2">
                  {hosting.slice(0, 4).map((s) => (
                    <li key={s.id}>
                      <Link to="/sessions/$sessionId" params={{ sessionId: s.id }} className="block rounded-lg p-2 text-sm hover:bg-accent/40">
                        <p className="truncate font-medium">{s.title}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : (
            <Card title="Your AI study plan" icon={<Wand2 className="h-4 w-4" />}>
              {latestPlan ? (
                <div>
                  <p className="text-sm font-medium">{latestPlan.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Updated {format(new Date(latestPlan.created_at), "MMM d")}</p>
                  <Link to="/study-plan" className="mt-2 inline-flex items-center text-sm text-primary hover:underline">Open plan <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">Get a personalized 7-day plan built around your goals.</p>
                  <Link to="/study-plan" className="mt-2 inline-flex items-center text-sm text-primary hover:underline">Generate one <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </>
              )}
            </Card>
          )}

          <Card title="Leaderboard" icon={<Trophy className="h-4 w-4" />}>
            {leaders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Build a streak to appear here.</p>
            ) : (
              <ol className="space-y-1">
                {leaders.map((r, i) => (
                  <li key={r.user_id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 min-w-0"><span className="w-4 text-xs text-muted-foreground">{i + 1}</span><span className="truncate">{r.profiles?.display_name ?? "Anon"}</span></span>
                    <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold text-orange-700"><Flame className="mr-0.5 inline h-3 w-3" />{r.current_streak}d</span>
                  </li>
                ))}
              </ol>
            )}
            <Link to="/leaderboard" className="mt-2 inline-flex items-center text-xs text-primary hover:underline">See full board <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Card>

          {isTutor && (
            <Card title="Trust progress" icon={<Award className="h-4 w-4" />} className="md:col-span-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Free sessions taught</span>
                  <span className="font-semibold">{profile.free_sessions_taught} / 5</span>
                </div>
                <Progress value={trustProgress} className="h-2" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average rating</span>
                  <span className="font-semibold">{Number(profile.avg_rating).toFixed(2)} ★</span>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  {profile.can_charge ? "🎉 You're unlocked to host paid sessions." : "Teach 5 free sessions and keep a 4★+ rating to unlock paid sessions."}
                </p>
              </div>
            </Card>
          )}

          <Card title="Featured tutors" icon={<GraduationCap className="h-4 w-4" />} className={isTutor ? "" : "md:col-span-2"}>
            {tutorsFeatured.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tutors yet.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2">
                {tutorsFeatured.map((t) => (
                  <li key={t.id}>
                    <Link to="/users/$userId" params={{ userId: t.id }} className="flex items-center gap-2 rounded-xl border border-border/50 p-2 transition hover:border-primary/50 hover:bg-accent/30">
                      {t.avatar_url ? <img src={t.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                        : <div className="grid h-8 w-8 place-items-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">{(t.display_name ?? "?").slice(0, 1)}</div>}
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">{t.display_name ?? "Anon"}</p>
                        <p className="text-[10px] text-muted-foreground"><Star className="mr-0.5 inline h-2.5 w-2.5 fill-amber-400 text-amber-400" />{Number(t.avg_rating ?? 0).toFixed(1)} · {t.free_sessions_taught}s</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Top communities" icon={<Users className="h-4 w-4" />} className="md:col-span-2">
            {communities.length === 0 ? (
              <p className="text-sm text-muted-foreground">No communities yet. <Link to="/communities/new" className="text-primary hover:underline">Start one</Link>.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {communities.map((c) => (
                  <li key={c.id}>
                    <Link to="/communities/$slug" params={{ slug: c.slug }} className="flex items-center gap-3 rounded-xl border border-border/50 p-2 transition hover:border-primary/50 hover:bg-accent/30">
                      {c.cover_url ? <img src={c.cover_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                        : <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-gradient text-sm font-bold text-white">{c.name.slice(0, 1).toUpperCase()}</div>}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.member_count} members</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Badges" icon={<Award className="h-4 w-4" />}>
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges yet. Join a session to earn your first.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <li key={b.badge_id} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary" title={b.badges?.description ?? ""}>
                    🏆 {b.badges?.name ?? "Badge"}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}

function StatChip({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "orange" | "primary" | "mint" | "lavender" }) {
  const bg = {
    orange: "bg-orange-500/15 text-orange-700",
    primary: "bg-primary/15 text-primary",
    mint: "bg-emerald-500/15 text-emerald-700",
    lavender: "bg-purple-500/15 text-purple-700",
  }[tone];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card/60 p-3">
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${bg}`}>{icon}</span>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function Card({ title, icon, children, className = "" }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-5 shadow-soft ${className}`}>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}

async function autoAwardBadges(opts: {
  uid: string; streak: number; sessions: number; role?: "learner" | "tutor"; canCharge: boolean; avgRating: number;
}) {
  const eligible: string[] = [];
  if (opts.sessions >= 1) eligible.push("first_session");
  if (opts.streak >= 3) eligible.push("streak_starter");
  if (opts.streak >= 14) eligible.push("consistency_hero");
  if (opts.role === "tutor" && opts.sessions >= 3) eligible.push("rising_tutor");
  if (opts.canCharge) eligible.push("trusted_educator");
  if (opts.avgRating >= 4.8) eligible.push("top_rated");
  if (eligible.length === 0) return;
  const { data: defs } = await supabase.from("badges").select("id, key").in("key", eligible);
  if (!defs?.length) return;
  await supabase.from("user_badges").upsert(
    defs.map((d) => ({ user_id: opts.uid, badge_id: d.id })),
    { onConflict: "user_id,badge_id", ignoreDuplicates: true },
  );
}
