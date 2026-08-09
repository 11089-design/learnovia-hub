import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Landmark, Loader2, Plus, BadgeCheck, Mic } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { CourseCard, type CourseListItem } from "@/components/CourseCard";

export const Route = createFileRoute("/workshops")({
  head: () => ({
    meta: [
      { title: "Workshops — guidance from professors & professionals | Learnova" },
      { name: "description", content: "Live workshops on college admissions, careers and research, hosted by professors and verified professionals. Free to attend." },
      { property: "og:title", content: "Learnova Workshops — guidance from professors & professionals" },
      { property: "og:description", content: "College admissions, essays, research and career workshops from verified experts. Free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkshopsPage,
});

function WorkshopsPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase
      .from("courses")
      .select("id, slug, title, tagline, track, peer_led, cover_url, level, seats, enrolled_count, starts_on, status, category:categories(name, slug), course_days(count)")
      .eq("track", "workshop")
      .neq("status", "draft")
      .order("starts_on", { ascending: true })
      .limit(60)
      .then(({ data }) => {
        if (!alive) return;
        setCourses((data ?? []).map((row) => {
          const days = (row as { course_days?: { count: number }[] }).course_days;
          return { ...(row as unknown as CourseListItem), day_count: days?.[0]?.count ?? 0 };
        }));
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-20">
        <section className="glass rounded-3xl p-8 shadow-soft">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Landmark className="h-4 w-4" /> Workshops
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">
            Ask the people who've <span className="gradient-text">actually done it.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Workshops are hosted by professors, admissions readers, researchers and working professionals. Come for college admissions,
            essays, research, scholarships and careers. A workshop can be a single day — no minimum length.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            {["College admissions", "Scholarships & financial aid", "Research & labs", "Careers & internships", "Interview prep"].map((t) => (
              <span key={t} className="rounded-full border border-border px-3 py-1 text-muted-foreground">{t}</span>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to="/courses/new" search={{ track: "workshop" }}>
              <Button className="rounded-full bg-brand-gradient text-white shadow-soft"><Plus className="mr-1 h-4 w-4" /> Host a workshop</Button>
            </Link>
            <Link to="/verify">
              <Button variant="outline" className="rounded-full"><BadgeCheck className="mr-1 h-4 w-4" /> Verify your credential</Button>
            </Link>
          </div>
        </section>

        <h2 className="mt-12 text-xl font-bold tracking-tight">Upcoming workshops</h2>
        {loading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : courses.length === 0 ? (
          <div className="glass mt-4 rounded-2xl p-10 text-center">
            <Mic className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No workshops scheduled yet. Verified experts can host one anytime.</p>
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
