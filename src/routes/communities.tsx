import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Communities — Learnova" },
      { name: "description", content: "Join student-led communities for academics, hobbies, and creative pursuits." },
    ],
  }),
  component: CommunitiesPage,
});

function CommunitiesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-32 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Communities</h1>
        <p className="mt-3 text-muted-foreground">Channels, voice rooms, and pinned resources arrive in Phase 5.</p>
        <Link to="/" className="mt-8 inline-block"><Button variant="outline" className="rounded-full">Back home</Button></Link>
      </main>
      <Footer />
    </div>
  );
}
