import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft, Sparkles, Loader2, Wand2, Calendar, Lightbulb, Clock,
  Target, BookOpen, Users, CheckCircle2, Circle, TrendingUp, X, Plus, Brain,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { generateStudyPlan } from "@/lib/planner.functions";

export const Route = createFileRoute("/_authenticated/study-plan")({
  head: () => ({ meta: [{ title: "AI Study Plan — Learnova" }] }),
  component: StudyPlanPage,
});

type Block = { time: string; task: string; technique: string; resource_hint: string | null };
type Day = { day: string; theme: string; total_minutes: number; blocks: Block[]; reflection_prompt: string };
type Plan = {
  title: string;
  overview: string;
  weekly_theme: string;
  milestones: string[];
  days: Day[];
  study_techniques: { name: string; why: string }[];
  resources: { label: string; search_query: string; kind: string }[];
  tutor_topics: string[];
  tips: string[];
};

const STYLES: { id: "visual" | "practice" | "reading" | "mixed"; label: string; hint: string }[] = [
  { id: "mixed", label: "Mixed", hint: "Balanced input + practice" },
  { id: "visual", label: "Visual", hint: "Diagrams, videos, walkthroughs" },
  { id: "practice", label: "Practice-first", hint: "Problem sets, drills, past papers" },
  { id: "reading", label: "Reading", hint: "Textbook → verify with 2–3 problems" },
];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function StudyPlanPage() {
  const navigate = useNavigate();
  const gen = useServerFn(generateStudyPlan);

  // Inputs
  const [goals, setGoals] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subjectInput, setSubjectInput] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [weakAreas, setWeakAreas] = useState("");
  const [deadlines, setDeadlines] = useState("");
  const [style, setStyle] = useState<"visual" | "practice" | "reading" | "mixed">("mixed");
  const [sessionLength, setSessionLength] = useState(45);
  const [hours, setHours] = useState(5);
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"]);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  const progressKey = createdAt ? `study-progress:${createdAt}` : null;

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: prof } = await supabase.from("profiles").select("interests").eq("id", u.user.id).maybeSingle();
      if (prof?.interests?.length) setSubjects(prof.interests.slice(0, 6));
      const { data } = await supabase
        .from("study_plans")
        .select("plan, created_at, title")
        .eq("user_id", u.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setPlan(data.plan as unknown as Plan);
        setCreatedAt(data.created_at);
      }
    })();
  }, []);

  useEffect(() => {
    if (!progressKey) return;
    const raw = localStorage.getItem(progressKey);
    if (raw) try { setProgress(JSON.parse(raw)); } catch { /* noop */ }
    else setProgress({});
  }, [progressKey]);

  const toggleTask = (key: string) => {
    setProgress((p) => {
      const next = { ...p, [key]: !p[key] };
      if (progressKey) localStorage.setItem(progressKey, JSON.stringify(next));
      return next;
    });
  };

  const addSubject = () => {
    const v = subjectInput.trim();
    if (!v || subjects.includes(v)) return;
    setSubjects((s) => [...s, v].slice(0, 8));
    setSubjectInput("");
  };
  const addTopic = () => {
    const v = topicInput.trim();
    if (!v || topics.includes(v)) return;
    setTopics((s) => [...s, v].slice(0, 15));
    setTopicInput("");
  };

  const build = async () => {
    setLoading(true);
    try {
      const out = await gen({
        data: {
          goals,
          subjects,
          topics,
          weakAreas,
          deadlines,
          style,
          sessionLength,
          hoursPerWeek: hours,
          daysAvailable: days,
        },
      });
      setPlan(out as unknown as Plan);
      setCreatedAt(new Date().toISOString());
      setProgress({});
      toast.success("Your plan is ready ✨");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const totalTasks = useMemo(() => plan?.days.reduce((s, d) => s + d.blocks.length, 0) ?? 0, [plan]);
  const doneTasks = useMemo(() => Object.values(progress).filter(Boolean).length, [progress]);
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Study Planner</h1>
          {plan && (
            <div className="ml-auto flex items-center gap-2 text-xs">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold">{pct}%</span>
              <span className="text-muted-foreground">· {doneTasks}/{totalTasks}</span>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {/* Input card */}
        <div className="glass mb-6 space-y-4 rounded-2xl p-5 shadow-soft">
          <div>
            <label className="text-sm font-semibold">Your goals this week</label>
            <Textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="e.g. Ace Friday's trig test; get comfortable with proving identities; finish half of chapter 6"
              className="mt-2 min-h-20 rounded-2xl"
              maxLength={600}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <ChipInput
              icon={<BookOpen className="h-3.5 w-3.5 text-primary" />}
              label="Subjects"
              placeholder="Math, Physics…"
              values={subjects}
              onRemove={(v) => setSubjects((s) => s.filter((x) => x !== v))}
              input={subjectInput}
              setInput={setSubjectInput}
              onAdd={addSubject}
            />
            <ChipInput
              icon={<Target className="h-3.5 w-3.5 text-primary" />}
              label="Specific topics/chapters"
              placeholder="Trig identities, Chapter 6…"
              values={topics}
              onRemove={(v) => setTopics((s) => s.filter((x) => x !== v))}
              input={topicInput}
              setInput={setTopicInput}
              onAdd={addTopic}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Where do you get stuck?</label>
              <Textarea
                value={weakAreas}
                onChange={(e) => setWeakAreas(e.target.value)}
                placeholder="Word problems, remembering formulas under pressure…"
                className="mt-2 min-h-16 rounded-2xl"
                maxLength={400}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">Deadlines coming up</label>
              <Textarea
                value={deadlines}
                onChange={(e) => setDeadlines(e.target.value)}
                placeholder="Trig test Fri, essay draft Sun…"
                className="mt-2 min-h-16 rounded-2xl"
                maxLength={300}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Learning style</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    style === s.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                  title={s.hint}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold">Available days</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const active = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() =>
                      setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
                    }
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SliderRow
              icon={<Clock className="h-4 w-4 text-muted-foreground" />}
              label="Hours per week"
              value={hours}
              onChange={setHours}
              min={1}
              max={20}
              suffix="h"
            />
            <SliderRow
              icon={<Brain className="h-4 w-4 text-muted-foreground" />}
              label="Block length"
              value={sessionLength}
              onChange={setSessionLength}
              min={15}
              max={90}
              step={5}
              suffix="min"
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={build}
              disabled={loading}
              className="rounded-full bg-brand-gradient text-white shadow-soft"
            >
              {loading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
              {plan ? "Regenerate plan" : "Generate plan"}
            </Button>
          </div>
        </div>

        {/* Plan output */}
        {!plan ? (
          <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
            <Sparkles className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2">
              Tell me your goals — I'll build a realistic 7-day plan with concrete tasks, evidence-based
              techniques, and resource hints.
            </p>
          </div>
        ) : (
          <>
            <div className="glass mb-4 rounded-2xl p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Weekly theme</p>
                  <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{plan.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{plan.overview}</p>
                  {plan.weekly_theme && (
                    <p className="mt-2 text-sm font-medium text-primary">🎯 {plan.weekly_theme}</p>
                  )}
                </div>
                {createdAt && (
                  <p className="shrink-0 text-[10px] text-muted-foreground">
                    {format(new Date(createdAt), "MMM d, h:mm a")}
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-[10px] font-medium text-muted-foreground">
                  <span>Progress</span>
                  <span>{doneTasks} / {totalTasks} tasks</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-brand-gradient transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Milestones */}
            {plan.milestones?.length > 0 && (
              <div className="glass mb-4 rounded-2xl p-4 shadow-soft">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Target className="h-3.5 w-3.5 text-primary" /> Milestones
                </p>
                <ul className="grid gap-1.5 text-sm md:grid-cols-2">
                  {plan.milestones.map((m, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Days */}
            <div className="grid gap-3 md:grid-cols-2">
              {plan.days.map((d, i) => (
                <div key={i} className="glass rounded-2xl p-4 shadow-soft">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> {d.day}
                    </p>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      {d.total_minutes}m
                    </span>
                  </div>
                  <p className="mb-3 text-sm font-medium">{d.theme}</p>
                  <ul className="space-y-2">
                    {d.blocks.map((b, j) => {
                      const key = `${i}-${j}`;
                      const done = !!progress[key];
                      return (
                        <li key={j} className="flex gap-2 rounded-xl border border-border/50 bg-background/40 p-2.5">
                          <button
                            type="button"
                            onClick={() => toggleTask(key)}
                            className="shrink-0"
                            title="Mark done"
                          >
                            {done ? (
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="mb-0.5 flex items-center gap-1.5">
                              <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">
                                {b.time}
                              </span>
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                                {b.technique}
                              </span>
                            </div>
                            <p className={`text-xs ${done ? "text-muted-foreground line-through" : ""}`}>
                              {b.task}
                            </p>
                            {b.resource_hint && (
                              <a
                                href={`https://www.google.com/search?q=${encodeURIComponent(b.resource_hint)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-[10px] text-primary hover:underline"
                              >
                                🔍 {b.resource_hint}
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {d.reflection_prompt && (
                    <p className="mt-3 rounded-lg border border-dashed border-border/60 bg-background/30 p-2 text-[10px] italic text-muted-foreground">
                      💭 {d.reflection_prompt}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Techniques + Resources + Tutor topics */}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {plan.study_techniques?.length > 0 && (
                <div className="glass rounded-2xl p-4 shadow-soft">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <Brain className="h-3.5 w-3.5 text-primary" /> Techniques for you
                  </p>
                  <ul className="space-y-2 text-xs">
                    {plan.study_techniques.map((t, i) => (
                      <li key={i}>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-muted-foreground">{t.why}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.resources?.length > 0 && (
                <div className="glass rounded-2xl p-4 shadow-soft">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> Resources
                  </p>
                  <ul className="space-y-1.5 text-xs">
                    {plan.resources.map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge variant="outline" className="shrink-0 rounded-full text-[9px]">
                          {r.kind}
                        </Badge>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(r.search_query)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline"
                        >
                          {r.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {plan.tutor_topics?.length > 0 && (
              <div className="glass mt-4 rounded-2xl p-4 shadow-soft">
                <div className="mb-2 flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <Users className="h-3.5 w-3.5 text-primary" /> Book a peer tutor for
                  </p>
                  <Link to="/explore" className="text-xs text-primary hover:underline">Find tutors →</Link>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {plan.tutor_topics.map((t, i) => (
                    <Link
                      key={i}
                      to="/explore"
                      className="rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs text-primary transition hover:bg-primary/10"
                    >
                      {t}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {plan.tips?.length > 0 && (
              <div className="glass mt-4 rounded-2xl p-4 shadow-soft">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                  <Lightbulb className="h-3.5 w-3.5 text-primary" /> Tips
                </p>
                <ul className="grid gap-1 text-xs text-muted-foreground md:grid-cols-2">
                  {plan.tips.map((t, i) => <li key={i}>• {t}</li>)}
                </ul>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ChipInput({
  icon, label, placeholder, values, onRemove, input, setInput, onAdd,
}: {
  icon: React.ReactNode; label: string; placeholder: string;
  values: string[]; onRemove: (v: string) => void;
  input: string; setInput: (v: string) => void; onAdd: () => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-semibold">{icon}{label}</label>
      <div className="mt-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(); } }}
          placeholder={placeholder}
          className="rounded-full"
        />
        <Button type="button" size="icon" variant="outline" className="shrink-0 rounded-full" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
              {v}
              <button type="button" onClick={() => onRemove(v)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SliderRow({
  icon, label, value, onChange, min, max, step = 1, suffix,
}: {
  icon: React.ReactNode; label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; suffix: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="font-semibold text-foreground">{value}{suffix}</span>
        </div>
        <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} className="mt-1" />
      </div>
    </div>
  );
}
