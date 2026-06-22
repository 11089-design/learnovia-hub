import { createFileRoute, Link } from "@tanstack/react-router";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Learnova" },
      { name: "description", content: "Sign in or create your Learnova account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-md px-4 pt-32 pb-16">
        <div className="glass-strong rounded-3xl p-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Learnova</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Authentication (email + Google), onboarding wizard, and persistent sessions ship in Phase 2 — right after Lovable Cloud is enabled.
          </p>
          <div className="mt-6 space-y-2">
            <Button className="w-full rounded-full bg-brand-gradient text-white" disabled>Continue with Google</Button>
            <Button variant="outline" className="w-full rounded-full" disabled>Continue with email</Button>
          </div>
          <Link to="/" className="mt-6 inline-block text-xs text-muted-foreground hover:text-foreground">← Back home</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
