import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Compass, Video, Mic, MonitorUp, Hand, MessageSquare, ListChecks, Palette,
  NotebookPen, FileText, DoorOpen, VenetianMask, Lock, Users, ShieldCheck,
  Sparkles, GraduationCap, Baby, Briefcase, LogOut,
} from "lucide-react";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guide")({
  head: () => ({
    meta: [
      { title: "How Learnova works — your welcome guide" },
      { name: "description", content: "Everything you need to start on Learnova: finding sessions, hosting your own, and every tool inside the live classroom explained in plain language." },
      { property: "og:title", content: "How Learnova works — your welcome guide" },
      { property: "og:description", content: "Find sessions, host your own, and learn every tool in the Learnova live classroom." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GuidePage,
});

const CLASSROOM_TOOLS = [
  { icon: Video, name: "Camera & microphone", body: "Turn your camera or mic on and off any time from the control bar under the video. You can join with both off — nobody minds." },
  { icon: MonitorUp, name: "Share screen", body: "Press Share screen to show your slides, notes or a problem you're stuck on. Press it again to stop sharing." },
  { icon: Hand, name: "Raise hand", body: "In the People tab. Your name joins a queue the host sees, so you don't have to interrupt anyone." },
  { icon: MessageSquare, name: "Chat", body: "Live text chat for the room. Hosts can pin an important message so it stays at the top. Emojis and Learnova stickers included." },
  { icon: ListChecks, name: "Polls", body: "Hosts launch quick polls. After you vote you'll see a tick next to your choice plus the live vote count for every option." },
  { icon: Palette, name: "Whiteboard", body: "A shared drawing board. Draw freely, then press Share board to publish your version, or Get latest to pull in someone else's." },
  { icon: NotebookPen, name: "Notes", body: "Shared class notes everyone can edit, plus a private pad only you can see. Timestamp drops the current moment of the call into your notes." },
  { icon: FileText, name: "Resources", body: "Upload files or paste links. Anyone in the session can add to it, and everything stays available after class." },
  { icon: DoorOpen, name: "Breakout rooms", body: "Hosts can split the room into smaller groups. Join yours, then return to the main room with one click." },
  { icon: VenetianMask, name: "Anonymous name (the mask)", body: "Shy about asking a question? Turn on the mask and you appear as something like \"Anon Otter\" instead of your real name. The host can still see the room is safe, and you can switch back whenever." },
  { icon: Lock, name: "Lock room", body: "A host-only switch. When it's on, nobody new can walk in — latecomers wait in the waiting room until the host lets them in." },
  { icon: LogOut, name: "Leave", body: "The red Leave button disconnects you from the call properly. Learners get a short reflection prompt on the way out — it feeds your streak and study plan." },
];

const SECTIONS = [
  {
    icon: Compass,
    title: "1. Find something to learn",
    body: "Explore lists every live and upcoming session, always free. Filter by subject, or type your own topic under Other. Click a session to read the description, the host's profile and outcomes before you enroll — enrolling unlocks the group chat and the Enter room button.",
    action: { to: "/explore" as const, label: "Open Explore" },
  },
  {
    icon: Video,
    title: "2. Join the live room",
    body: "When it's time, open the session and press Enter room. Allow your browser to use the camera and microphone (you can keep them off). If the host locked the room, you'll wait a moment in the waiting room until you're let in.",
  },
  {
    icon: GraduationCap,
    title: "3. Host your own session",
    body: "Anyone can teach. From your dashboard press Host a session, add a title, subject, time and what learners will walk away with. You'll get your own room, agenda bar, polls, whiteboard and attendance list. For multi-day courses use Training instead.",
    action: { to: "/sessions/new" as const, label: "Host a session" },
  },
  {
    icon: GraduationCap,
    title: "4. Training courses",
    body: "Training is for structured multi-day courses with a day-by-day blueprint. You can teach as a verified tutor by uploading an exam score or credential for an AI check, or run it openly as a peer-led study group — every course card shows which.",
    action: { to: "/training" as const, label: "Browse Training" },
  },
  {
    icon: Briefcase,
    title: "5. Workshops",
    body: "One-off deep dives from people with real-world experience. A single day is perfectly fine.",
    action: { to: "/workshops" as const, label: "Browse Workshops" },
  },
  {
    icon: Baby,
    title: "6. Learnova Kids",
    body: "A gentler, playful corner for ages 5–12: counting, reading, clay and kitchen science. Same tools, friendlier wrapping.",
    action: { to: "/kids" as const, label: "Visit Kids" },
  },
  {
    icon: Users,
    title: "7. Communities",
    body: "Learnova spaces with text channels, video rooms, shared resource folders and posts. Join one, say hi in #general, then hop into a video room and start a Focus Sprint to study together.",
    action: { to: "/communities" as const, label: "Browse Communities" },
  },
  {
    icon: ShieldCheck,
    title: "8. Staying safe",
    body: "Offensive language is auto-flagged and reported. You can report any message, person or session in one tap, and hosts can mute or remove anyone from their room.",
    action: { to: "/safety" as const, label: "Read Safety" },
  },
];

function GuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pt-32 pb-20">
        <div className="text-center">
          <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-brand" /> Welcome to Learnova
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">How Learnova works</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Learn from peers. Teach the world. Stay safe. Here's the whole platform in five minutes — where sessions live,
            how to host one, and what every button in the live classroom actually does.
          </p>
        </div>

        <div className="mt-12 space-y-4">
          {SECTIONS.map((s) => (
            <section key={s.title} className="glass rounded-3xl p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-gradient text-white">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">{s.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  {s.action && (
                    <Link to={s.action.to} className="mt-3 inline-block">
                      <Button size="sm" variant="outline" className="rounded-full">{s.action.label}</Button>
                    </Link>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-bold tracking-tight">Every tool in the live classroom</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          The right-hand panel of a session is a set of tabs. Here's what each one is for.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
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

        <div className="glass mt-12 rounded-3xl p-8 text-center">
          <Mic className="mx-auto h-6 w-6 text-primary" />
          <h2 className="mt-3 text-xl font-bold">That's it — go learn something.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Everything on Learnova is free, forever. Join a session today, and when you're ready, teach the thing you're best at.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link to="/explore"><Button className="rounded-full bg-brand-gradient text-white shadow-soft">Find a session</Button></Link>
            <Link to="/dashboard"><Button variant="outline" className="rounded-full">Go to dashboard</Button></Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
