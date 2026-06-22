import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Users, Flag, Lock } from "lucide-react";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety — Learnova" },
      { name: "description", content: "How Learnova keeps students safe: parent consent, moderation, verified tutor progression, reporting." },
    ],
  }),
  component: SafetyPage,
});

const pillars = [
  { icon: Users, title: "Parent / guardian consent", body: "Anyone under 18 needs guardian consent before monetizing sessions or unlocking certain features." },
  { icon: ShieldCheck, title: "Verified tutor progression", body: "New tutors only run free sessions until they earn 5 sessions and a 4★ rating. Paid sessions unlock after trust is built." },
  { icon: Flag, title: "Reporting & AI moderation", body: "Offensive language is auto-flagged. One tap reports any user, session, or community for review." },
  { icon: Lock, title: "Safe communication", body: "External contact sharing is blocked. Messaging is moderated and tied to sessions, not private DMs by default." },
];

function SafetyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 pt-32 pb-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" /> Safety first
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">Built so students stay safe.</h1>
          <p className="mt-4 mx-auto max-w-2xl text-muted-foreground">
            Learnova is designed for ages 13+. Every part of the platform is shaped by safety and trust — from onboarding to payouts.
          </p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {pillars.map((p) => (
            <div key={p.title} className="glass rounded-3xl p-6 hover-lift">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-gradient text-white">
                <p.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold">{p.title}</div>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/"><Button variant="outline" className="rounded-full">Back home</Button></Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
