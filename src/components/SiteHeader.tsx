import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Menu, ChevronDown, Compass, GraduationCap, Briefcase, Baby, Users,
  MessageSquare, Trophy, ShieldCheck, BookOpen, LifeBuoy, Wand2, Shield, LogOut, LayoutDashboard,
} from "lucide-react";
import { LearnovaMark } from "@/components/LearnovaMark";

import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

type NavLink = { to: string; label: string; desc: string; icon: typeof Compass };

/** Three groups keep the bar calm — every destination lives in exactly one of them. */
const GROUPS: { label: string; links: NavLink[] }[] = [
  {
    label: "Learn",
    links: [
      { to: "/explore", label: "Explore", desc: "Every live & upcoming session", icon: Compass },
      { to: "/training", label: "Training", desc: "Multi-day structured courses", icon: GraduationCap },
      { to: "/workshops", label: "Workshops", desc: "One-off deep dives", icon: Briefcase },
      { to: "/kids", label: "Kids", desc: "The playful 5–12 corner", icon: Baby },
    ],
  },
  {
    label: "Community",
    links: [
      { to: "/communities", label: "Communities", desc: "Channels, video rooms, resources", icon: Users },
      { to: "/messages", label: "Messages", desc: "Your 1:1 conversations", icon: MessageSquare },
      { to: "/leaderboard", label: "Leaderboard", desc: "Streaks and top peers", icon: Trophy },
    ],
  },
  {
    label: "Support",
    links: [
      { to: "/guide", label: "Guide", desc: "How Learnova works", icon: BookOpen },
      { to: "/safety", label: "Safety", desc: "How we keep rooms safe", icon: ShieldCheck },
      { to: "/settings", label: "Settings & Help", desc: "Theme, profile, FAQs", icon: LifeBuoy },
    ],
  },
];

export function SiteHeader({ variant = "public" }: { variant?: "public" | "app" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [signedIn, setSignedIn] = useState(variant === "app");
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSignedIn(!!data.session);
      const uid = data.session?.user.id;
      if (!uid) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      if (alive) setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(!!session);
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const groups = isAdmin
    ? GROUPS.map((g) =>
        g.label === "Support"
          ? { ...g, links: [...g.links, { to: "/admin", label: "Admin", desc: "Reports & moderation", icon: Shield }] }
          : g,
      )
    : GROUPS;

  return (
    <header className={variant === "app"
      ? "sticky top-0 z-50 border-b border-border/50 bg-background/70 backdrop-blur-xl"
      : "fixed left-0 right-0 top-0 z-50"}
    >
      <div className={variant === "app" ? "mx-auto max-w-7xl px-4" : "mx-auto mt-4 max-w-7xl px-3 sm:px-4"}>
        <div className={variant === "app"
          ? "flex items-center gap-2 py-2.5"
          : "glass flex items-center gap-2 rounded-2xl px-3 py-2.5 sm:px-5"}
        >
          <Link to={signedIn ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2">
            <LearnovaMark />
            <span className="font-display text-base font-bold tracking-tight sm:text-lg">
              Learn<span className="gradient-text">ova</span>
            </span>
          </Link>


          {/* Grouped desktop nav — three calm entry points */}
          <nav className="ml-2 hidden flex-1 items-center gap-1 md:flex">
            {groups.map((g) => (
              <DropdownMenu key={g.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="rounded-full text-sm font-medium text-muted-foreground hover:text-foreground">
                    {g.label} <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 rounded-2xl p-1.5">
                  {g.links.map((l) => (
                    <DropdownMenuItem key={l.to} asChild className="rounded-xl p-0">
                      <Link to={l.to} className="flex w-full items-start gap-3 px-3 py-2.5">
                        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <l.icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold">{l.label}</span>
                          <span className="block text-xs text-muted-foreground">{l.desc}</span>
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
            {signedIn && (
              <Link to="/study-plan" className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-foreground">
                <Wand2 className="mr-1 inline h-3.5 w-3.5" /> Study plan
              </Link>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <ThemeSwitcher />

            {signedIn ? (
              <>
                <Button
                  size="sm"
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="hidden rounded-full bg-brand-gradient text-white shadow-soft hover:opacity-95 sm:inline-flex"
                >
                  <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
                </Button>
                <Button variant="ghost" size="sm" className="hidden rounded-full lg:inline-flex" onClick={signOut}>
                  <LogOut className="mr-1 h-4 w-4" /> Sign out
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth" className="hidden sm:block">
                  <Button variant="ghost" size="sm" className="rounded-full">Sign in</Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="rounded-full bg-brand-gradient text-white shadow-soft hover:opacity-95">
                    Get started
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile: one sheet holds everything, so nothing hides at any width */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full md:hidden" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[19rem] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="font-display">Learn<span className="gradient-text">ova</span></SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-5">
                  {groups.map((g) => (
                    <div key={g.label}>
                      <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
                      <div className="mt-1.5 space-y-1">
                        {g.links.map((l) => (
                          <Link
                            key={l.to}
                            to={l.to}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium hover:bg-primary/10"
                          >
                            <l.icon className="h-4 w-4 text-primary" /> {l.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                  {signedIn && (
                    <div className="space-y-1 border-t border-border/60 pt-3">
                      <Link to="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium hover:bg-primary/10">
                        <LayoutDashboard className="h-4 w-4 text-primary" /> Dashboard
                      </Link>
                      <Link to="/study-plan" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium hover:bg-primary/10">
                        <Wand2 className="h-4 w-4 text-primary" /> Study plan
                      </Link>
                      <button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
                        <LogOut className="h-4 w-4" /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
