import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto mt-4 max-w-6xl px-4">
        <div className="glass flex items-center justify-between rounded-2xl px-5 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Learn<span className="gradient-text">ova</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <a href="#how" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#sessions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sessions</a>
            <a href="#communities" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Communities</a>
            <a href="#safety" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Safety</a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/auth" className="hidden sm:block">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="rounded-full bg-brand-gradient text-white shadow-soft hover:opacity-95">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
