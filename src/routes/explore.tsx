import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore sessions — Learnova" },
      { name: "description", content: "Browse peer-led sessions, homework help, and hobby classes on Learnova." },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-32 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Explore sessions</h1>
        <p className="mt-3 text-muted-foreground">Browsing, filters, and homework help are coming online in Phase 4 of the build.</p>
        <Link to="/" className="mt-8 inline-block"><Button variant="outline" className="rounded-full">Back home</Button></Link>
      </main>
      <Footer />
    </div>
  );
}
