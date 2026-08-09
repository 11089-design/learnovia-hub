import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2, Plus, Star, Heart, Rocket, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { applyTheme } from "@/components/ThemeSwitcher";
import {
  KIDS_MASCOTS, OwlMascot, ChickMascot, NumbersMascot, BookMascot, ClayMascot, BeakerMascot,
} from "@/components/LearnovaMascots";
import { CourseCard, type CourseListItem } from "@/components/CourseCard";

export const Route = createFileRoute("/kids")({
  head: () => ({
    meta: [
      { title: "Learnova Kids — playful free classes for young learners" },
      { name: "description", content: "Free, friendly classes for kids and homeschoolers: counting, reading, clay modelling, science experiments and more. Taught by kind, verified teens and grown-ups." },
      { property: "og:title", content: "Learnova Kids — playful free classes" },
      { property: "og:description", content: "Counting, reading, clay modelling and science fun for young learners. Always free." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: KidsPage,
});

const MASCOTS = KIDS_MASCOTS;
const ZONES = [
  { slug: "kids-math", name: "Number Town", Icon: NumbersMascot, blurb: "Counting, adding, times tables — with games." },
  { slug: "kids-reading", name: "Story Woods", Icon: BookMascot, blurb: "Read-alouds, phonics and made-up stories." },
  { slug: "kids-crafts", name: "Clay & Craft Cave", Icon: ClayMascot, blurb: "Clay animals, paper art, sticky fun." },
  { slug: "kids-science", name: "Science Lab", Icon: BeakerMascot, blurb: "Kitchen experiments and why-questions." },
];

function KidsPage() {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [zone, setZone] = useState<string | null>(null);

  // Kids world gets its own candy theme + playful type, restored on exit.
  useEffect(() => {
    applyTheme("kids");
    return () => applyTheme(localStorage.getItem("learnova-theme") ?? "lavender");
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("courses")
        .select("id, slug, title, tagline, track, peer_led, cover_url, level, seats, enrolled_count, starts_on, status, category:categories(name, slug), course_days(count)")
        .eq("track", "kids")
        .neq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(60);
      if (zone) {
        const { data: c } = await supabase.from("categories").select("id").eq("slug", zone).maybeSingle();
        if (c) q = q.eq("category_id", c.id);
      }
      const { data } = await q;
      if (!alive) return;
      setCourses((data ?? []).map((row) => {
        const days = (row as { course_days?: { count: number }[] }).course_days;
        return { ...(row as unknown as CourseListItem), day_count: days?.[0]?.count ?? 0 };
      }));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [zone]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-kid">
      {/* floating blobs + mascots */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl" style={{ animation: "blob 14s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute -right-20 top-64 h-80 w-80 rounded-full bg-accent/30 blur-3xl" style={{ animation: "blob 18s ease-in-out infinite reverse" }} />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-gradient text-white shadow-soft animate-wiggle"><OwlMascot className="h-7 w-7" /></span>
          <span className="text-xl font-bold">Learnova <span className="gradient-text">Kids</span></span>
        </Link>
        <Link to="/"><Button variant="ghost" className="rounded-full">Grown-up mode</Button></Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24">
        <section className="glass animate-pop-in rounded-[2.5rem] p-8 text-center shadow-soft">
          <div className="flex justify-center gap-3 text-primary">
            {MASCOTS.map((M, i) => (
              <span key={i} className="animate-bob" style={{ animationDelay: `${i * 0.25}s` }}>
                <M className="h-11 w-11" />
              </span>
            ))}
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
            Learn cool stuff. <span className="gradient-text">Have fun.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
            Tiny classes for kids and homeschoolers — counting, reading, clay animals, bubbly science. Big buddies teach, grown-ups can watch, and everything is free.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link to="/courses/new" search={{ track: "kids" }}>
              <Button size="lg" className="rounded-full bg-brand-gradient text-white shadow-soft">
                <Plus className="mr-1 h-4 w-4" /> Teach a kids class
              </Button>
            </Link>
            <Link to="/safety"><Button size="lg" variant="outline" className="rounded-full">Safety for parents</Button></Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" /> Ages 5–12</span>
            <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> Kind-words rule</span>
            <span className="inline-flex items-center gap-1"><Sun className="h-3 w-3" /> Always free</span>
          </div>
        </section>

        <h2 className="mt-12 text-2xl font-bold">Pick a zone</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ZONES.map((z, i) => (
            <button
              key={z.slug}
              onClick={() => setZone(zone === z.slug ? null : z.slug)}
              className={`glass animate-pop-in rounded-[2rem] p-6 text-left transition hover:-translate-y-1 hover:rotate-1 hover:shadow-lg ${
                zone === z.slug ? "ring-4 ring-primary/40" : ""
              }`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <z.Icon className="h-11 w-11 animate-bob text-primary" style={{ animationDelay: `${i * 0.3}s` }} />
              <h3 className="mt-3 text-lg font-bold">{z.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{z.blurb}</p>
            </button>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between">
          <h2 className="text-2xl font-bold">{zone ? "Classes in this zone" : "All kids classes"}</h2>
          {zone && <button onClick={() => setZone(null)} className="text-xs text-primary hover:underline">Show all</button>}
        </div>

        {loading ? (
          <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : courses.length === 0 ? (
          <div className="glass mt-4 rounded-[2rem] p-10 text-center">
            <ChickMascot className="mx-auto h-12 w-12 animate-wiggle text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">No classes hatched yet! Big buddies — teach the first one.</p>
            <Link to="/courses/new" search={{ track: "kids" }}>
              <Button className="mt-4 rounded-full bg-brand-gradient text-white"><Rocket className="mr-1 h-4 w-4" /> Start a class</Button>
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c) => <CourseCard key={c.id} c={c} playful />)}
          </div>
        )}
      </main>
    </div>
  );
}
