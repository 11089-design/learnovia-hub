import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Learnova" },
      { name: "description", content: "Your Learnova dashboard." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-32 pb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">Dashboard</h1>
        <p className="mt-3 text-muted-foreground">Learner & tutor dashboards arrive in Phase 3.</p>
        <Link to="/" className="mt-8 inline-block"><Button variant="outline" className="rounded-full">Back home</Button></Link>
      </main>
      <Footer />
    </div>
  );
}
