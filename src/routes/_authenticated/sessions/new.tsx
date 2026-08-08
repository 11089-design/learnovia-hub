import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";

export const Route = createFileRoute("/_authenticated/sessions/new")({
  head: () => ({ meta: [{ title: "Host a session — Learnova" }] }),
  component: NewSessionPage,
});

type Category = { id: string; name: string; slug: string };

function NewSessionPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [format, setFormat] = useState<"group" | "one_on_one">("group");
  const [customCategory, setCustomCategory] = useState("");
  const [language, setLanguage] = useState("English");
  const [maxP, setMaxP] = useState("20");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [outcomes, setOutcomes] = useState("");
  const [hw, setHw] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("categories").select("id, name, slug").order("name").then(({ data }) => setCategories(data ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");

      // Resolve category — "other" creates (or reuses) a category from what the tutor typed
      let resolvedCategoryId: string | null = categoryId === "none" ? null : categoryId;
      if (categoryId === "other") {
        const label = customCategory.trim();
        if (!label) throw new Error("Please name your category");
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
        if (existing) {
          resolvedCategoryId = existing.id;
        } else {
          const { data: created, error: catErr } = await supabase
            .from("categories")
            .insert({ slug, name: label, kind: "hobby", created_by: userData.user.id })
            .select("id")
            .single();
          if (catErr) throw catErr;
          resolvedCategoryId = created.id;
        }
      }
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          tutor_id: userData.user.id,
          title: title.trim(),
          description: description.trim() || null,
          category_id: resolvedCategoryId,
          format,
          kind: "free",
          price_cents: 0,
          language,
          max_participants: Math.max(1, parseInt(maxP || "1", 10)),
          starts_at: startsAt || null,
          ends_at: endsAt || null,
          outcomes: outcomes.split("\n").map((s) => s.trim()).filter(Boolean),
          is_homework_help: hw,
          cover_url: coverUrl,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Self-register tutor as a participant
      await supabase.from("session_participants").insert({
        session_id: data.id,
        user_id: userData.user.id,
        role: "tutor",
      });

      toast.success("Session created!");
      navigate({ to: "/sessions/$sessionId", params: { sessionId: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create session");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })} className="mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Host a session</h1>
        </div>

        <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-6 shadow-soft">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Intro to Calculus — limits & derivatives" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will learners take away?" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  <SelectItem value="other">Other — teach anything ✨</SelectItem>
                </SelectContent>
              </Select>
              {categoryId === "other" && (
                <Input
                  autoFocus
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Crocheting, Beatboxing, Chess openings…"
                  className="mt-2"
                />
              )}
              {categoryId === "other" && (
                <p className="text-xs text-muted-foreground">This becomes a real category others can browse.</p>
              )}
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

          <div className="rounded-2xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm">
            <span className="font-semibold text-primary">100% free session.</span>{" "}
            <span className="text-muted-foreground">Learnova has no payments — every session you host is free for learners.</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="lang">Language</Label>
              <Input id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max">Max participants</Label>
              <Input id="max" type="number" min={1} value={maxP} onChange={(e) => setMaxP(e.target.value)} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={hw} onCheckedChange={(v) => setHw(Boolean(v))} />
                Homework help
              </label>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="start">Starts at</Label>
              <Input id="start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">Ends at</Label>
              <Input id="end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="outcomes">Learning outcomes (one per line)</Label>
            <Textarea id="outcomes" rows={3} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} placeholder={"Understand the chain rule\nSolve 5 practice problems"} />
          </div>

          <div className="space-y-1.5">
            <Label>Cover image</Label>
            <ImageUploader value={coverUrl} onChange={setCoverUrl} folder="sessions" shape="wide" />
          </div>

          <Button type="submit" disabled={saving} className="w-full rounded-full bg-brand-gradient text-white shadow-soft">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create session"}
          </Button>
        </form>
      </div>
    </div>
  );
}
