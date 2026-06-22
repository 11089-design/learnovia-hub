import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, LogOut, Calendar, MessageSquare, BookOpen, Award, TrendingUp, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Learnova" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, role, avg_rating, free_sessions_taught, can_charge, onboarded, interests")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (data) {
        setProfile(data as Profile);
        if (!data.onboarded) navigate({ to: "/onboarding" });
      }
      setLoading(false);
    })();
  }, [navigate]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  if (loading || !profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading your space…</div>
      </div>
    );
  }

  const isTutor = profile.role === "tutor";
  const trustProgress = Math.min((profile.free_sessions_taught / 5) * 100, 100);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
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
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="rounded-full">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Greeting */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              {profile.display_name || "friend"} 👋
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="secondary" className="rounded-full capitalize">{profile.role}</Badge>
              {profile.interests.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full">{tag}</Badge>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/explore"><Button variant="outline" className="rounded-full">Explore sessions</Button></Link>
            <Link to="/communities"><Button className="rounded-full bg-brand-gradient text-white shadow-soft">Communities</Button></Link>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Card title="Upcoming sessions" icon={<Calendar className="h-4 w-4" />}>
            <p className="text-sm text-muted-foreground">No sessions booked yet. Browse Explore to find your first one.</p>
          </Card>

          <Card title="Messages" icon={<MessageSquare className="h-4 w-4" />}>
            <p className="text-sm text-muted-foreground">Your inbox is quiet. Reach out to a tutor or peer.</p>
          </Card>

          <Card title={isTutor ? "Students" : "Saved tutors"} icon={<Users className="h-4 w-4" />}>
            <p className="text-sm text-muted-foreground">{isTutor ? "Students you've taught appear here." : "Tutors you save show up here for quick rebooking."}</p>
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
                  <span className="font-semibold">{profile.avg_rating.toFixed(2)} ★</span>
                </div>
                <p className="pt-2 text-xs text-muted-foreground">
                  {profile.can_charge
                    ? "🎉 You're unlocked to host paid sessions."
                    : "Teach 5 free sessions and keep an average rating of 4★+ to unlock paid sessions."}
                </p>
              </div>
            </Card>
          ) : (
            <Card title="Your progress" icon={<TrendingUp className="h-4 w-4" />} className="md:col-span-2">
              <p className="text-sm text-muted-foreground">Complete sessions to build streaks, earn badges, and climb the leaderboard.</p>
            </Card>
          )}

          <Card title="Continue learning" icon={<BookOpen className="h-4 w-4" />}>
            <p className="text-sm text-muted-foreground">Pick a topic from your interests to find a peer-led session.</p>
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
