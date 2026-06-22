import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles, LogOut, Calendar, MessageSquare, Users, Award, Flame, Plus, BookOpen, Shield, Compass,
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
  role: "learner" | "tutor";
  avg_rating: number;
  free_sessions_taught: number;
  can_charge: boolean;
  onboarded: boolean;
  interests: string[];
};
type UpcomingSession = { id: string; title: string; starts_at: string | null; tutor_id: string };
type BadgeRow = { badge_id: string; awarded_at: string; badges: { name: string; description: string | null; icon: string | null } | null };

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

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const uid = u.user.id;

      const [{ data: p }, { data: ups }, { data: host }, { data: bs }, { data: st }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, role, avg_rating, free_sessions_taught, can_charge, onboarded, interests").eq("id", uid).maybeSingle(),
        supabase.from("session_participants").select("session:sessions(id, title, starts_at, tutor_id)").eq("user_id", uid).limit(20),
        supabase.from("sessions").select("id, title, starts_at, tutor_id").eq("tutor_id", uid).neq("status", "ended").order("starts_at", { ascending: true, nullsFirst: false }).limit(10),
        supabase.from("user_badges").select("badge_id, awarded_at, badges(name, description, icon)").eq("user_id", uid).order("awarded_at", { ascending: false }).limit(6),
        supabase.from("streaks").select("current_streak").eq("user_id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
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

      // Bump streak (best-effort)
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("streaks").upsert(
        { user_id: uid, current_streak: (st?.current_streak ?? 0) + (st ? 0 : 1), last_active_date: today },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  if (!profile) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  const isTutor = profile.role === "tutor";
  const trustProgress = Math.min((profile.free_sessions_taught / 5) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Learn<span className="gradient-text">ova</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/explore"><Button variant="ghost" size="sm"><Compass className="mr-1 h-4 w-4" /> Explore</Button></Link>
            <Link to="/communities"><Button variant="ghost" size="sm"><Users className="mr-1 h-4 w-4" /> Communities</Button></Link>
            <Link to="/messages"><Button variant="ghost" size="sm"><MessageSquare className="mr-1 h-4 w-4" /> Messages</Button></Link>
            {isAdmin && <Link to="/admin"><Button variant="ghost" size="sm"><Shield className="mr-1 h-4 w-4" /> Admin</Button></Link>}
          </nav>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{profile.display_name || "friend"} 👋</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <UIBadge variant="secondary" className="rounded-full capitalize">{profile.role}</UIBadge>
              {profile.interests.slice(0, 4).map((t) => <UIBadge key={t} variant="outline" className="rounded-full">{t}</UIBadge>)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/explore"><Button variant="outline" className="rounded-full">Browse sessions</Button></Link>
            <Link to="/sessions/new"><Button className="rounded-full bg-brand-gradient text-white shadow-soft"><Plus className="mr-1 h-4 w-4" /> Host a session</Button></Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Upcoming sessions" icon={<Calendar className="h-4 w-4" />}>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing booked yet. <Link to="/explore" className="text-primary hover:underline">Find one</Link>.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <li key={s.id}>
                    <Link to="/sessions/$sessionId" params={{ sessionId: s.id }}
                      className="block rounded-lg p-2 text-sm hover:bg-accent/40">
                      <p className="font-medium truncate">{s.title}</p>
                      {s.starts_at && <p className="text-xs text-muted-foreground">{format(new Date(s.starts_at), "EEE, MMM d · h:mm a")}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {isTutor && (
            <Card title="Sessions you're hosting" icon={<BookOpen className="h-4 w-4" />}>
              {hosting.length === 0 ? (
                <p className="text-sm text-muted-foreground">Host your first session — your trust score starts there.</p>
              ) : (
                <ul className="space-y-2">
                  {hosting.map((s) => (
                    <li key={s.id}>
                      <Link to="/sessions/$sessionId" params={{ sessionId: s.id }}
                        className="block rounded-lg p-2 text-sm hover:bg-accent/40">
                        <p className="font-medium truncate">{s.title}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          <Card title="Streak" icon={<Flame className="h-4 w-4" />}>
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-gradient text-xl font-bold text-white">{streak?.current_streak ?? 0}</div>
              <div>
                <p className="text-sm font-medium">days in a row</p>
                <p className="text-xs text-muted-foreground">Keep it alive — log in tomorrow.</p>
              </div>
            </div>
          </Card>

          <Card title="Messages" icon={<MessageSquare className="h-4 w-4" />}>
            <Link to="/messages" className="text-sm text-primary hover:underline">Open inbox →</Link>
          </Card>

          {isTutor ? (
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
          ) : (
            <Card title="Communities" icon={<Users className="h-4 w-4" />} className="md:col-span-2">
              <Link to="/communities" className="text-sm text-primary hover:underline">Discover communities →</Link>
            </Card>
          )}

          <Card title="Badges" icon={<Award className="h-4 w-4" />}>
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges yet. Join a session to earn your first.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <li key={b.badge_id} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
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
