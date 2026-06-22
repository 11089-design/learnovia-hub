import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Shield, Flag, Check, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Learnova" }] }),
  component: AdminPage,
});

type Report = { id: string; reporter_id: string; target_kind: string; target_id: string; reason: string; status: string; created_at: string };

function AdminPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setAllowed(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const ok = (roles ?? []).some((r) => r.role === "admin" || r.role === "moderator");
      setAllowed(ok);
      if (ok) {
        const { data: r } = await supabase.from("reports").select("id, reporter_id, target_kind, target_id, reason, status, created_at").order("created_at", { ascending: false });
        setReports((r ?? []) as Report[]);
      }
    })();
  }, []);

  if (allowed === null) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="mt-2 text-2xl font-bold">Admins only</h1>
          <p className="mt-1 text-sm text-muted-foreground">This area is restricted.</p>
          <Button onClick={() => navigate({ to: "/dashboard" })} className="mt-4 rounded-full">Back to dashboard</Button>
        </div>
      </div>
    );
  }

  const setStatus = async (id: string, status: "resolved" | "dismissed") => {
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else setReports((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Shield className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Moderation</h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Flag className="h-4 w-4" /> Reports queue</h2>
        {reports.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Nothing to review. ✨</div>
        ) : (
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full uppercase">{r.target_kind}</Badge>
                    <Badge className={`rounded-full ${r.status === "open" ? "bg-amber-500/20 text-amber-700" : r.status === "resolved" ? "bg-emerald-500/20 text-emerald-700" : ""}`}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM d, yyyy h:mm a")}</span>
                  </div>
                  <p className="mt-1 text-sm">{r.reason}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Target #{r.target_id.slice(0, 8)}</p>
                </div>
                {r.status === "open" && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "dismissed")}><X className="mr-1 h-3 w-3" /> Dismiss</Button>
                    <Button size="sm" className="bg-brand-gradient text-white" onClick={() => setStatus(r.id, "resolved")}><Check className="mr-1 h-3 w-3" /> Resolve</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
