import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, Check, HelpCircle, LifeBuoy, Palette, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CLASSROOM_TOOLS, FAQS, ROOM_GUIDE_SEEN_KEY } from "@/lib/guide-content";
import { RoomWelcomeDialog } from "@/components/sessions/RoomWelcomeDialog";
import { THEMES, applyTheme } from "@/components/ThemeSwitcher";

const THEME_KEY = "learnova-theme";

function ThemePicker() {
  const [theme, setTheme] = useState<string>("lavender");

  useEffect(() => {
    setTheme(localStorage.getItem(THEME_KEY) ?? "lavender");
  }, []);

  const pick = (id: string) => {
    setTheme(id);
    localStorage.setItem(THEME_KEY, id);
    applyTheme(id);
  };

  return (
    <section className="glass rounded-3xl p-6 md:p-8">
      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Palette className="h-3.5 w-3.5" /> Appearance
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">Theme</h2>
      <p className="mt-2 text-sm text-muted-foreground">Each theme brings its own colours and typography. It sticks on this device.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => pick(t.id)}
            className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${theme === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
          >
            <span className="h-8 w-8 shrink-0 rounded-full" style={{ background: t.swatch }} />
            <span className="flex-1 text-sm font-semibold">{t.label}</span>
            {theme === t.id && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>
    </section>
  );
}


export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Help — Learnova" },
      { name: "description", content: "Your Learnova help centre: how to find and host sessions, what every live-classroom tool does, and answers to common questions." },
      { property: "og:title", content: "Settings & Help — Learnova" },
      { property: "og:description", content: "How to use Learnova: sessions, hosting, live tools and FAQs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [tourOpen, setTourOpen] = useState(false);

  const replayTour = () => {
    try {
      localStorage.removeItem(ROOM_GUIDE_SEEN_KEY);
    } catch {
      /* ignore */
    }
    toast.success("The welcome tour will show again next time you enter a room.");
  };

  return (
    <div className="min-h-screen bg-background">
      <RoomWelcomeDialog open={tourOpen} onOpenChange={setTourOpen} />

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <h1 className="text-base font-semibold md:text-lg">Settings &amp; Help</h1>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <ThemePicker />

        <section className="glass mt-6 rounded-3xl p-6 md:p-8">

          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Welcome guide
          </span>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">How to use Learnova</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Explore lists every free session. Training holds multi-day courses, Workshops one-off deep dives, Kids the
            5–12 corner, and Communities the Discord-style spaces. Inside a live room, the right-hand tabs hold Chat,
            Notes, Whiteboard, Resources, Polls, People and Breakouts, and the bar above the video holds mic, camera and
            screen share.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="rounded-full bg-brand-gradient text-white" onClick={() => setTourOpen(true)}>
              <LifeBuoy className="mr-1 h-4 w-4" /> Open classroom tour
            </Button>
            <Link to="/guide">
              <Button variant="outline" className="rounded-full"><BookOpen className="mr-1 h-4 w-4" /> Full guide</Button>
            </Link>
            <Button variant="ghost" className="rounded-full" onClick={replayTour}>
              <RotateCcw className="mr-1 h-4 w-4" /> Show tour again on next session
            </Button>
          </div>
        </section>

        <h2 className="mt-10 text-xl font-bold tracking-tight">Every tool in the live classroom</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CLASSROOM_TOOLS.map((t) => (
            <div key={t.name} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2">
                <t.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t.name}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-10 flex items-center gap-2 text-xl font-bold tracking-tight">
          <HelpCircle className="h-5 w-5 text-primary" /> Frequently asked questions
        </h2>
        <div className="glass mt-4 rounded-3xl px-5 py-2">
          <Accordion type="single" collapsible>
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Link to="/explore"><Button variant="outline" className="rounded-full">Explore sessions</Button></Link>
          <Link to="/safety"><Button variant="outline" className="rounded-full">Safety</Button></Link>
          <Link to="/dashboard"><Button variant="ghost" className="rounded-full">Back to dashboard</Button></Link>
        </div>
      </main>
    </div>
  );
}
