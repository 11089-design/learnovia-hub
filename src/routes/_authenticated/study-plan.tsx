import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Sparkles, Loader2, Wand2, Calendar, Lightbulb, Clock } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { generateStudyPlan } from "@/lib/planner.functions";

export const Route = createFileRoute("/_authenticated/study-plan")({
  head: () => ({ meta: [{ title: "AI Study Plan — Learnova" }] }),
  component: StudyPlanPage,
});

type Plan = { title: string; overview: string; days: { day: string; focus: string; tasks: string[]; minutes: number }[]; tips: string[] };

function StudyPlanPage() {
  const navigate = useNavigate();
  const gen = useServerFn(generateStudyPlan);
  const [goals, setGoals] = useState("");
  const [hours, setHours] = useState(5);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("study_plans").select("plan, created_at, title").eq("user_id", u.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (data) { setPlan(data.plan as Plan); setCreatedAt(data.created_at); }
    })();
  }, []);

  const build = async () => {
    setLoading(true);
    try {
      const out = await gen({ data: { goals, hoursPerWeek: hours } });
      setPlan(out as Plan);
      setCreatedAt(new Date().toISOString());
      toast.success("Your plan is ready ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}><ArrowLeft className="h-4 w-4" /></Button>
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Study Planner</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="glass mb-6 rounded-2xl p-5 shadow-soft">
          <label className="text-sm font-semibold">Your goals this week</label>
          <Textarea value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. Prep for chapter test on trigonometry, get comfortable with functions…" className="mt-2 min-h-24 rounded-2xl" maxLength={500} />
          <div className="mt-4 flex items-center gap-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex justify-between text-xs text-muted-foreground"><span>Hours per week</span><span className="font-semibold text-foreground">{hours}h</span></div>
              <Slider value={[hours]} min={1} max={20} step={1} onValueChange={(v) => setHours(v[0])} className="mt-1" />
            </div>
            <Button onClick={build} disabled={loading} className="rounded-full bg-brand-gradient text-white shadow-soft">
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
              {plan ? "Regenerate" : "Generate plan"}
            </Button>
          </div>
        </div>

        {!plan ? (
          <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2">Tell me your goals — I'll spin up a personalized 7-day plan built around your interests.</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold tracking-tight">{plan.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{plan.overview}</p>
              {createdAt && <p className="mt-1 text-[10px] text-muted-foreground">Generated {format(new Date(createdAt), "MMM d, h:mm a")}</p>}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {plan.days.map((d, i) => (
                <div key={i} className="glass rounded-2xl p-4 shadow-soft">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-semibold"><Calendar className="h-3.5 w-3.5 text-primary" /> {d.day}</p>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{d.minutes}m</span>
                  </div>
                  <p className="mb-2 text-sm font-medium">{d.focus}</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {d.tasks.map((t, j) => <li key={j}>• {t}</li>)}
                  </ul>
                </div>
              ))}
            </div>
            {plan.tips.length > 0 && (
              <div className="glass mt-4 rounded-2xl p-4 shadow-soft">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Lightbulb className="h-3.5 w-3.5 text-primary" /> Tips</p>
                <ul className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                  {plan.tips.map((t, i) => <li key={i}>• {t}</li>)}
                </ul>
              </div>
            )}
            <div className="mt-6 text-center">
              <Link to="/explore" className="text-sm text-primary hover:underline">Find tutors to help with this plan →</Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
