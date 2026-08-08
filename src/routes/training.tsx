import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, ShieldCheck, CalendarCheck, Loader2, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { CourseCard, type CourseListItem } from "@/components/CourseCard";

export const Route = createFileRoute("/training")({
  head: () => ({
    meta: [
      { title: "Learnova Training — free structured crash courses" },
      { name: "description", content: "Multi-day SAT, AP, language, essay and art crash courses taught by score-verified tutors. Free, structured, attendance-tracked." },
      { property: "og:title", content: "Learnova Training — free structured crash courses" },
      { property: "og:description", content: "Score-verified tutors run 3+ day structured courses with a day-by-day blueprint. Always free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrainingPage,
});

const TRACK_CARDS = [
  { slug: "sat-prep", name: "SAT Prep", emoji: "📐", blurb: "Sectional drills, timing strategy, full-length reviews." },
  { slug: "ap-crash", name: "AP Crash Course", emoji: "⚡", blurb: "Units condensed, FRQ practice, past-paper timing." },
  { slug: "college-essays", name: "College Essays", emoji: "✍️", blurb: "Brainstorm → draft → line edits, day by day." },
  { slug: "language-crash", name: "Language Crash Course", emoji: "🗣️", blurb: "Core 500 words, speaking reps, listening drills." },
  { slug: "art-studio", name: "Art Studio", emoji: "🎨", blurb: "Fundamentals, studies, a finished piece by day 5." },
  { slug: "public-speaking", name: "Public Speaking", emoji: "🎤", blurb: "Structure, delivery, live feedback rounds." },
  { slug: "coding-bootcamp", name: "Coding Bootcamp", emoji: "💻", blurb: "Build → break → ship a small project." },
];

function TrainingPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("courses")
        .select("id, slug, title, tagline, track, peer_led, cover_url, level, seats, enrolled_count, starts_on, status, category:categories(name, slug), course_days(count)")
        .eq("track", "training")
        .neq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(60);
      if (cat) {
        const { data: c } = await supabase.from("categories").select("id").eq("slug", cat).maybeSingle();
        if (c) q = q.eq("category_id", c.id);
      }
      const { data } = await q;
      if (!alive) return;
      setCourses(
        (data ?? []).map((row) => {
          const days = (row as { course_days?: { count: number }[] }).course_days;
          return { ...(row as unknown as CourseListItem), day_count: days?.[0]?.count ?? 0 };
        }),
      );
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [cat]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20">
        <section className="glass rounded-3xl p-8 shadow-soft">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <GraduationCap className="h-4 w-4" /> Learnova Training
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            Structured crash courses. <span className="gradient-text">Still free.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Training courses run for a minimum of 3 days with a published day-by-day blueprint. Tutors either upload proof of their
            score (checked by AI) or run it openly as a peer-to-peer study group — you always see which.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Feature icon={<ShieldCheck className="h-4 w-4" />} title="Score-verified or peer-led" body="Every course card says which — no guessing." />
            <Feature icon={<CalendarCheck className="h-4 w-4" />} title="Attendance matters" body="Notify your tutor 1h+ before to be excused." />
            <Feature icon={<Sparkles className="h-4 w-4" />} title="Day-by-day roadmap" body="Day 1 basics → final day mastery check." />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/courses/new" search={{ track: "training" }}>
              <Button className="rounded-full bg-brand-gradient text-white shadow-soft"><Plus className="mr-1 h-4 w-4" /> Host a training course</Button>
            </Link>
            <Link to="/verify">
              <Button variant="outline" className="rounded-full"><ShieldCheck className="mr-1 h-4 w-4" /> Get score-verified</Button>
            </Link>
          </div>
        </section>

        <h2 className="mt-12 text-xl font-bold tracking-tight">Training categories</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRACK_CARDS.map((t) => (
            <button
              key={t.slug}
              onClick={() => setCat(cat === t.slug ? null : t.slug)}
              className={`glass rounded-2xl p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${
                cat === t.slug ? "ring-2 ring-primary" : ""
              }`}
            >
              <div className="text-2xl">{t.emoji}</div>
              <h3 className="mt-2 font-semibold">{t.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.blurb}</p>
            </button>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">{cat ? "Filtered courses" : "Open courses"}</h2>
          {cat && <button onClick={() => setCat(null)} className="text-xs text-primary hover:underline">Clear filter</button>}
        </div>

        {loading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : courses.length === 0 ? (
          <div className="glass mt-4 rounded-2xl p-10 text-center">
            <p className="text-sm text-muted-foreground">No training courses here yet — be the first to host one.</p>
            <Link to="/courses/new" search={{ track: "training" }}>
              <Button className="mt-4 rounded-full bg-brand-gradient text-white">Create a course</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => <CourseCard key={c.id} c={c} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface-2/50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">{icon} {title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
