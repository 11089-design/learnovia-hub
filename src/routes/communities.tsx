import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/communities")({
  head: () => ({
    meta: [
      { title: "Communities — Learnova" },
      { name: "description", content: "Join student-run communities to chat, share resources, and learn together." },
    ],
  }),
  component: CommunitiesPage,
});

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cover_url: string | null;
  member_count: number;
};

function CommunitiesPage() {
  const [items, setItems] = useState<Community[]>([]);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.from("communities").select("id, slug, name, description, cover_url, member_count").order("member_count", { ascending: false }).limit(60)
      .then(({ data }) => setItems((data ?? []) as Community[]));
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-28 pb-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Communities</h1>
            <p className="mt-1 text-muted-foreground">Discord-style hubs for the things you love.</p>
          </div>
          {signedIn && (
            <Link to="/communities/new">
              <Button className="rounded-full bg-brand-gradient text-white shadow-soft">
                <Plus className="mr-1 h-4 w-4" /> Start a community
              </Button>
            </Link>
          )}
        </div>

        {items.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No communities yet — be the first to start one.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <Link
                key={c.id}
                to="/communities/$slug"
                params={{ slug: c.slug }}
                className="glass group block overflow-hidden rounded-2xl shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {c.cover_url ? (
                  <img src={c.cover_url} alt="" className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full bg-brand-gradient" />
                )}
                <div className="p-5">
                  <div className="mb-3 -mt-10 grid h-12 w-12 place-items-center rounded-xl bg-brand-gradient text-lg font-bold text-white ring-4 ring-background">
                    {c.name.slice(0, 1).toUpperCase()}
                  </div>
                  <h3 className="text-lg font-semibold group-hover:gradient-text">{c.name}</h3>
                  {c.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>}
                  <p className="mt-3 text-xs text-muted-foreground"><Users className="mr-1 inline h-3 w-3" />{c.member_count} {c.member_count === 1 ? "member" : "members"}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
