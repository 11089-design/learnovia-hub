import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Shield, Flag, Check, X, Trash2, Loader2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Learnova" }] }),
  component: AdminPage,
});

type Report = { id: string; reporter_id: string; target_kind: string; target_id: string; reason: string; status: string; created_at: string };
type Preview = { text: string | null; author: string | null };

function AdminPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [previews, setPreviews] = useState<Record<string, Preview>>({});
  const [reporters, setReporters] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"open" | "resolved" | "dismissed" | "all">("open");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setAllowed(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const ok = (roles ?? []).some((r) => r.role === "admin" || r.role === "moderator");
      setAllowed(ok);
      if (!ok) return;
      const { data: r } = await supabase.from("reports").select("id, reporter_id, target_kind, target_id, reason, status, created_at").order("created_at", { ascending: false }).limit(200);
      setReports((r ?? []) as Report[]);
    })();
  }, []);

  useEffect(() => {
    if (reports.length === 0) return;
    (async () => {
      const reporterIds = Array.from(new Set(reports.map((r) => r.reporter_id)));
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", reporterIds);
      setReporters(Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "Unknown"])));

      const cm = reports.filter((r) => r.target_kind === "community_message").map((r) => r.target_id);
      const sm = reports.filter((r) => r.target_kind === "session_message").map((r) => r.target_id);
      const p: Record<string, Preview> = {};
      if (cm.length) {
        const { data } = await supabase.from("community_messages").select("id, content, user_id").in("id", cm);
        for (const m of data ?? []) p[m.id] = { text: m.content, author: m.user_id };
      }
      if (sm.length) {
        const { data } = await supabase.from("session_messages").select("id, content, user_id").in("id", sm);
        for (const m of data ?? []) p[m.id] = { text: m.content, author: m.user_id };
      }
      setPreviews(p);
    })();
  }, [reports]);

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
    setBusy(id);
    const { error } = await supabase.from("reports").update({ status }).eq("id", id);
    setBusy(null);
    if (error) toast.error(error.message);
    else setReports((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  };

  const deleteTarget = async (report: Report) => {
    setBusy(report.id);
    const table = report.target_kind === "community_message" ? "community_messages" : report.target_kind === "session_message" ? "session_messages" : null;
    if (!table) { toast.error("Unknown target"); setBusy(null); return; }
    const { error } = await supabase.from(table).delete().eq("id", report.target_id);
    if (error) { toast.error(error.message); setBusy(null); return; }
    await supabase.from("reports").update({ status: "resolved" }).eq("id", report.id);
    setPreviews((p) => ({ ...p, [report.target_id]: { text: "(message deleted)", author: null } }));
    setReports((r) => r.map((x) => (x.id === report.id ? { ...x, status: "resolved" } : x)));
    setBusy(null);
    toast.success("Message removed");
  };

  const visible = reports.filter((r) => filter === "all" || r.status === filter);
  const counts = {
    open: reports.filter((r) => r.status === "open").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    dismissed: reports.filter((r) => r.status === "dismissed").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader variant="app" />
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 pt-6">
        <Shield className="h-5 w-5 text-primary" />
        <h1 className="font-display text-2xl font-bold tracking-tight">Moderation</h1>
      </div>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Flag className="h-4 w-4" /> Reports queue</h2>
          <div className="inline-flex rounded-full bg-muted p-0.5 text-xs">
            {(["open", "resolved", "dismissed", "all"] as const).map((k) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`rounded-full px-3 py-1 capitalize ${filter === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                {k}{k !== "all" && ` · ${counts[k]}`}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Nothing to review right now.</div>
        ) : (
          <ul className="space-y-2">
            {visible.map((r) => {
              const preview = previews[r.target_id];
              const canDelete = r.target_kind === "community_message" || r.target_kind === "session_message";
              return (
                <li key={r.id} className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full uppercase">{r.target_kind.replace("_", " ")}</Badge>
                    <Badge className={`rounded-full ${r.status === "open" ? "bg-amber-500/20 text-amber-700" : r.status === "resolved" ? "bg-emerald-500/20 text-emerald-700" : "bg-muted"}`}>{r.status}</Badge>
                    <span className="text-xs text-muted-foreground">by {reporters[r.reporter_id] ?? "…"} · {format(new Date(r.created_at), "MMM d, h:mm a")}</span>
                  </div>
                  <p className="mt-2 text-sm"><span className="font-semibold">Reason:</span> {r.reason}</p>
                  {preview && (
                    <div className="mt-2 rounded-xl border border-dashed border-border bg-muted/30 p-2">
                      <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-muted-foreground"><MessageSquare className="h-3 w-3" /> Message</p>
                      <p className="text-xs">{preview.text ?? "(gone)"}</p>
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    {canDelete && preview?.text && preview.text !== "(message deleted)" && (
                      <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" onClick={() => deleteTarget(r)} disabled={busy === r.id}>
                        {busy === r.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Trash2 className="mr-1 h-3 w-3" />} Delete message
                      </Button>
                    )}
                    {r.status === "open" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "dismissed")} disabled={busy === r.id}><X className="mr-1 h-3 w-3" /> Dismiss</Button>
                        <Button size="sm" className="bg-brand-gradient text-white" onClick={() => setStatus(r.id, "resolved")} disabled={busy === r.id}><Check className="mr-1 h-3 w-3" /> Resolve</Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
