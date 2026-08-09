import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { supabase } from "@/integrations/supabase/client";


export function Navbar() {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto mt-4 max-w-7xl px-3 sm:px-4">
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-2.5 sm:px-5">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-base font-bold tracking-tight sm:text-lg">
              Learn<span className="gradient-text">ova</span>
            </span>
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            <Link to="/explore" className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">Explore</Link>
            <Link to="/training" className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">Training</Link>
            <Link to="/workshops" className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">Workshops</Link>
            <Link to="/kids" className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">Kids</Link>
            <Link to="/communities" className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">Communities</Link>
            <Link to="/safety" className="rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">Safety</Link>
          </nav>


          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ThemeSwitcher />

            {signedIn ? (
              <Button
                size="sm"
                onClick={() => navigate({ to: "/dashboard" })}
                className="rounded-full bg-brand-gradient text-white shadow-soft hover:opacity-95"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:block">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="rounded-full bg-brand-gradient text-white shadow-soft hover:opacity-95">
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
