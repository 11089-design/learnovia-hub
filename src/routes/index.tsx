import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, Sparkles, GraduationCap, Users, Trophy, ShieldCheck,
  BookOpen, Brain, UsersRound, UserRound, Palette, FileQuestion, Lightbulb,
  Star, Music, Code2, Video, Calculator, Globe, Mic, Camera, Flame, Heart
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-learnova.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Learnova — Learn from peers. Teach what you know." },
      { name: "description", content: "Learnova is a safe peer-to-peer learning platform where students 13+ teach, learn, collaborate, and grow together." },
      { property: "og:title", content: "Learnova — Learn from peers. Teach what you know." },
      { property: "og:description", content: "A safe peer-to-peer learning ecosystem for students 13+ — sessions, communities, hobbies, mentorship." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <SessionTypes />
      <FeaturedTutors />
      <Communities />
      <Safety />
      <Testimonials />
      <CTABanner />
      <Footer />
    </div>
  );
}

/* ───────────────────────── HERO ───────────────────────── */
function Hero() {
  return (
    <section className="relative pt-36 pb-24">
      {/* gradient blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-96 w-96 rounded-full opacity-50 blur-3xl animate-blob"
          style={{ background: "radial-gradient(circle, var(--brand), transparent 60%)" }} />
        <div className="absolute top-20 right-0 h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl animate-blob"
          style={{ background: "radial-gradient(circle, var(--mint), transparent 60%)", animationDelay: "-6s" }} />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full opacity-40 blur-3xl animate-blob"
          style={{ background: "radial-gradient(circle, var(--lavender), transparent 60%)", animationDelay: "-12s" }} />
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:items-center">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Peer-to-peer · Ages 13+
          </span>
          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            Learn Together.{" "}
            <span className="gradient-text">Grow Together.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            A safe peer-to-peer learning platform where students teach, learn, collaborate, and grow — across academics, hobbies and creative skills.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full bg-brand-gradient text-white shadow-glow hover:opacity-95">
                Start Learning <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="rounded-full border-brand/30 hover:bg-brand/5">
                Become a Tutor
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
            <Stat n="12k+" l="Students" />
            <div className="h-8 w-px bg-border" />
            <Stat n="2.5k" l="Tutors" />
            <div className="h-8 w-px bg-border" />
            <Stat n="98%" l="Safe rating" />
          </div>
        </div>

        <div className="relative">
          <div className="glass-strong overflow-hidden rounded-[2rem] p-2 animate-fade-in">
            <img
              src={heroImg}
              alt="Students collaborating in a Learnova session"
              width={1536}
              height={1152}
              className="w-full rounded-[1.6rem]"
            />
          </div>
          {/* floating profile cards */}
          <FloatingCard className="-left-4 top-10 animate-float" name="Aanya, 16" tag="SAT · 1480" color="from-brand to-lavender" />
          <FloatingCard className="-right-2 top-1/3 animate-float-slow" name="Kabir, 15" tag="JEE · Physics" color="from-mint to-brand" delay="-3s" />
          <FloatingCard className="left-8 -bottom-2 animate-float" name="Mei, 14" tag="Guitar · Hobby" color="from-lavender to-mint" delay="-5s" />
        </div>
      </div>
    </section>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-foreground">{n}</div>
      <div className="text-xs">{l}</div>
    </div>
  );
}

function FloatingCard({ className = "", name, tag, color, delay }: { className?: string; name: string; tag: string; color: string; delay?: string }) {
  return (
    <div
      className={`absolute hidden md:flex items-center gap-3 glass rounded-2xl px-3 py-2.5 ${className}`}
      style={delay ? { animationDelay: delay } : undefined}
    >
      <div className={`grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br ${color} text-white text-xs font-bold`}>
        {name[0]}
      </div>
      <div className="leading-tight">
        <div className="text-xs font-semibold">{name}</div>
        <div className="text-[10px] text-muted-foreground">{tag}</div>
      </div>
    </div>
  );
}

/* ───────────────────────── HOW IT WORKS ───────────────────────── */
function HowItWorks() {
  const steps = [
    { icon: GraduationCap, title: "Learn", body: "Browse peer-led sessions in subjects you love. Ask doubts, join groups, follow your interests.", color: "from-brand to-lavender" },
    { icon: Users, title: "Teach", body: "Share what you're best at. Host free sessions, build your audience, earn ratings and badges.", color: "from-lavender to-mint" },
    { icon: Trophy, title: "Level up", body: "Earn badges, streaks and a public trust score as you teach. Everything on Learnova is 100% free — forever.", color: "from-mint to-brand" },
  ];
  return (
    <Section id="how" eyebrow="How it works" title="Three steps. Endless growth.">
      <div className="grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className="glass rounded-3xl p-7 hover-lift">
            <div className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${s.color} text-white`}>
              <s.icon className="h-6 w-6" />
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-xs font-bold text-muted-foreground">0{i + 1}</span>
              <h3 className="text-xl font-semibold">{s.title}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── SESSION TYPES ───────────────────────── */
function SessionTypes() {
  const types = [
    { icon: FileQuestion, label: "Homework Help" },
    { icon: Brain, label: "Concept Sessions" },
    { icon: UsersRound, label: "Group Study" },
    { icon: UserRound, label: "1-on-1 Mentoring" },
    { icon: Palette, label: "Hobby Classes" },
    { icon: BookOpen, label: "Exam Prep" },
    { icon: Lightbulb, label: "Creative Skills" },
    { icon: Sparkles, label: "Custom Topics" },
  ];
  return (
    <Section id="sessions" eyebrow="Session types" title="Whatever you want to learn — or share.">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {types.map((t) => (
          <div key={t.label} className="glass group rounded-2xl p-5 text-center hover-lift">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-white transition-transform group-hover:scale-110">
              <t.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 text-sm font-medium">{t.label}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── FEATURED TUTORS ───────────────────────── */
function FeaturedTutors() {
  const tutors = [
    { name: "Aanya Sharma", age: 16, subjects: ["SAT Math", "Physics"], rating: 4.9, sessions: 42, color: "from-brand to-lavender" },
    { name: "Kabir Mehta", age: 17, subjects: ["JEE Chem", "Bio"], rating: 4.8, sessions: 56, color: "from-mint to-brand" },
    { name: "Mei Tanaka", age: 15, subjects: ["Guitar", "Music Theory"], rating: 5.0, sessions: 28, color: "from-lavender to-mint" },
    { name: "Lucas Reyes", age: 17, subjects: ["Coding", "Web"], rating: 4.7, sessions: 71, color: "from-brand to-mint" },
  ];
  return (
    <Section eyebrow="Featured tutors" title="Real peers. Real impact.">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tutors.map((t) => (
          <div key={t.name} className="glass rounded-3xl p-5 hover-lift">
            <div className={`mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br ${t.color} text-2xl font-bold text-white`}>
              {t.name[0]}
            </div>
            <div className="font-semibold">{t.name}</div>
            <div className="text-xs text-muted-foreground">Age {t.age}</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {t.subjects.map((s) => (
                <span key={s} className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">{s}</span>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Star className="h-3.5 w-3.5 fill-current text-yellow-500" /> {t.rating}
              </span>
              <span className="text-muted-foreground">{t.sessions} sessions</span>
            </div>
            <Button size="sm" className="mt-4 w-full rounded-full bg-brand-gradient text-white">Book session</Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── COMMUNITIES ───────────────────────── */
function Communities() {
  const items = [
    { icon: Calculator, name: "JEE Aspirants", members: "8.2k" },
    { icon: BookOpen, name: "SAT Prep", members: "6.4k" },
    { icon: Music, name: "Beginner Guitar", members: "3.1k" },
    { icon: Palette, name: "Young Designers", members: "2.7k" },
    { icon: Video, name: "Video Editing Club", members: "1.9k" },
    { icon: Code2, name: "Code Newbies", members: "4.5k" },
    { icon: Mic, name: "Public Speaking", members: "1.2k" },
    { icon: Camera, name: "Photo Walks", members: "980" },
  ];
  return (
    <Section id="communities" eyebrow="Communities" title="Find your people. Build together." subtitle="Discord-meets-Reddit spaces with chat channels, voice rooms, pinned resources and polls.">
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {items.map((c) => (
          <div key={c.name} className="glass group rounded-2xl p-5 hover-lift">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.members} members</div>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="mt-4 w-full justify-between rounded-full text-brand hover:bg-brand/5">
              Join <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── SAFETY ───────────────────────── */
function Safety() {
  const items = [
    { icon: ShieldCheck, title: "Parent / guardian consent", body: "Required for under-18 monetization." },
    { icon: Users, title: "Moderated sessions", body: "AI + human moderation on chats and rooms." },
    { icon: Flame, title: "Verified tutor progression", body: "Earn trust before charging — 5 sessions + 4★." },
    { icon: Globe, title: "Safe communication", body: "External contact sharing blocked by default." },
  ];
  return (
    <Section id="safety" eyebrow="Safety first" title="Built for students. Trusted by parents." subtitle="Every part of Learnova is designed for ages 13+. Safety is not a feature — it's the foundation.">
      <div className="glass-strong rounded-[2rem] p-8 md:p-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {items.map((i) => (
            <div key={i.title}>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white">
                <i.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold">{i.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{i.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
          <div className="text-sm text-muted-foreground">Want the full breakdown?</div>
          <Link to="/safety">
            <Button variant="outline" className="rounded-full">Read our safety pledge</Button>
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ───────────────────────── TESTIMONIALS ───────────────────────── */
function Testimonials() {
  const items = [
    { who: "Aanya, learner · age 14", quote: "I went from scared of math to teaching a study group. The community is unreal." },
    { who: "Kabir, tutor · age 17", quote: "Hosted 50+ sessions here. The trust score and badges actually make me feel legit." },
    { who: "Priya, parent", quote: "I love that I get visibility, consent matters, and my kid is learning from real peers — not strangers." },
  ];
  return (
    <Section eyebrow="Loved by students, tutors & parents" title="Stories from the Learnova family.">
      <div className="grid gap-5 md:grid-cols-3">
        {items.map((t) => (
          <div key={t.who} className="glass rounded-3xl p-6">
            <Heart className="h-5 w-5 text-brand" />
            <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.quote}"</p>
            <div className="mt-4 text-xs font-medium text-muted-foreground">{t.who}</div>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ───────────────────────── CTA BANNER ───────────────────────── */
function CTABanner() {
  return (
    <section className="mx-auto mt-24 max-w-6xl px-4">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-hero-gradient p-10 text-white md:p-16">
        <div aria-hidden className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute -left-12 -bottom-16 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Ready to join the next generation of learners?</h2>
          <p className="mt-3 text-white/85">Free to start. Safe by design. Built by students, for students.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="rounded-full bg-white text-brand hover:bg-white/90">
                Get started <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/explore">
              <Button size="lg" variant="outline" className="rounded-full border-white/40 bg-white/10 text-white hover:bg-white/20">
                Explore sessions
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── SECTION SHELL ───────────────────────── */
function Section({ id, eyebrow, title, subtitle, children }: { id?: string; eyebrow: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-6xl px-4 py-20 md:py-24">
      <div className="mb-10 max-w-2xl">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
