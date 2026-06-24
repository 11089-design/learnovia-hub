import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ArrowLeft, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId/edit")({
  head: () => ({ meta: [{ title: "Edit session — Learnova" }] }),
  component: EditSessionPage,
});

type Category = { id: string; name: string };

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function EditSessionPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [denied, setDenied] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [format, setFormat] = useState<"group" | "one_on_one">("group");
  const [language, setLanguage] = useState("English");
  const [maxP, setMaxP] = useState("20");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [hw, setHw] = useState(false);
  const [locked, setLocked] = useState(false);
  const [status, setStatus] = useState("scheduled");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setDenied("Please sign in"); setLoading(false); return; }
      const [{ data: s }, { data: cats }] = await Promise.all([
        supabase.from("sessions")
          .select("tutor_id, title, description, category_id, format, language, max_participants, starts_at, ends_at, outcomes, is_homework_help, locked, status")
          .eq("id", sessionId).maybeSingle(),
        supabase.from("categories").select("id, name").order("name"),
      ]);
      if (!s) { setDenied("Session not found"); setLoading(false); return; }
      if (s.tutor_id !== u.user.id) { setDenied("Only the tutor can edit this session"); setLoading(false); return; }
      setCategories(cats ?? []);
      setTitle(s.title);
      setDescription(s.description ?? "");
      setCategoryId(s.category_id ?? "none");
      setFormat(s.format as "group" | "one_on_one");
      setLanguage(s.language);
      setMaxP(String(s.max_participants));
      setStartsAt(toLocalInput(s.starts_at));
      setEndsAt(toLocalInput(s.ends_at));
      setOutcomes((s.outcomes ?? []).join("\n"));
      setHw(s.is_homework_help);
      setLocked(s.locked);
      setStatus(s.status);
      setLoading(false);
    })();
  }, [sessionId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("sessions").update({
      title: title.trim(),
      description: description.trim() || null,
      category_id: categoryId === "none" ? null : categoryId,
      format,
      language,
      max_participants: Math.max(1, parseInt(maxP || "1", 10)),
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      outcomes: outcomes.split("\n").map((s) => s.trim()).filter(Boolean),
      is_homework_help: hw,
      locked,
      status,
    }).eq("id", sessionId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    navigate({ to: "/sessions/$sessionId", params: { sessionId } });
  };

  const remove = async () => {
    if (!confirm("Delete this session? This can't be undone.")) return;
    setDeleting(true);
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Session deleted");
    navigate({ to: "/dashboard" });
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (denied) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">{denied}</h1>
          <Button onClick={() => navigate({ to: "/sessions/$sessionId", params: { sessionId } })} className="mt-4 rounded-full">Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-2xl px-4 pt-24 pb-16">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/sessions/$sessionId", params: { sessionId } })} className="mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to session
        </Button>
        <h1 className="mb-6 text-2xl font-bold">Edit session</h1>

        <form onSubmit={save} className="glass space-y-4 rounded-3xl p-6 shadow-soft">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as "group" | "one_on_one")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="one_on_one">1-on-1</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Language</Label><Input value={language} onChange={(e) => setLanguage(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Max participants</Label><Input type="number" min={1} value={maxP} onChange={(e) => setMaxP(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="ended">Ended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Starts at</Label><Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Ends at</Label><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
          </div>

          <div className="space-y-1.5">
            <Label>Learning outcomes (one per line)</Label>
            <Textarea rows={3} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={hw} onCheckedChange={(v) => setHw(Boolean(v))} /> Homework help
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={locked} onCheckedChange={(v) => setLocked(Boolean(v))} /> Locked (no new enrollments)
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4">
            <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={remove} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Trash2 className="mr-1 h-4 w-4" /> Delete</>}
            </Button>
            <Button type="submit" disabled={saving} className="rounded-full bg-brand-gradient text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1 h-4 w-4" /> Save changes</>}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
