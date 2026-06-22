import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/communities/new")({
  head: () => ({ meta: [{ title: "Start a community — Learnova" }] }),
  component: NewCommunityPage,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function NewCommunityPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const slug = slugify(name) || Math.random().toString(36).slice(2, 8);
      const { data, error } = await supabase
        .from("communities")
        .insert({ name: name.trim(), slug, description: description.trim() || null, created_by: u.user.id })
        .select("slug")
        .single();
      if (error) throw error;
      toast.success("Community created!");
      navigate({ to: "/communities/$slug", params: { slug: data.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create community");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-10">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/communities" })} className="mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="mb-6 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Start a community</h1>
        </div>
        <form onSubmit={submit} className="glass space-y-4 rounded-3xl p-6 shadow-soft">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. MUN Basics, Robotics Club" />
            {name && <p className="text-xs text-muted-foreground">URL: /communities/{slugify(name) || "…"}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this community about?" />
          </div>
          <Button type="submit" disabled={saving || !name.trim()} className="w-full rounded-full bg-brand-gradient text-white shadow-soft">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create community"}
          </Button>
        </form>
      </div>
    </div>
  );
}
