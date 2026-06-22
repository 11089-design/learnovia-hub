import { Sparkles, Instagram, Twitter, Youtube } from "lucide-react";

export function Footer() {
  const cols = [
    { title: "Platform", links: ["Explore", "Communities", "Tutors", "Pricing"] },
    { title: "Company", links: ["About", "Careers", "Press", "Blog"] },
    { title: "Support", links: ["Help center", "Safety", "Contact", "FAQ"] },
    { title: "Legal", links: ["Terms", "Privacy", "Cookies", "Guidelines"] },
  ];
  return (
    <footer className="mt-32 border-t border-border/60 bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-12 md:grid-cols-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold">Learn<span className="gradient-text">ova</span></span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Learn from peers. Teach what you know. A safe peer-to-peer learning ecosystem for students 13+.
            </p>
            <div className="mt-5 flex gap-3">
              {[Instagram, Twitter, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-full glass hover-lift">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="text-sm font-semibold">{c.title}</div>
              <ul className="mt-4 space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row">
          <span>© {new Date().getFullYear()} Learnova. Built for the next generation of learners.</span>
          <span>Made with care · Safe for ages 13+</span>
        </div>
      </div>
    </footer>
  );
}
