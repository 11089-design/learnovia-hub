import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Plus, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ImageUploader } from "@/components/ImageUploader";
import { toast } from "sonner";

type Track = "training" | "workshop" | "kids";

export const Route = createFileRoute("/_authenticated/courses/new")({
  validateSearch: (search: Record<string, unknown>): { track: Track } => ({
    track: (["training", "workshop", "kids"].includes(String(search.track)) ? String(search.track) : "training") as Track,
  }),
  head: () => ({
    meta: [
      { title: "Create a course — Learnova" },
      { name: "description", content: "Publish a free multi-day course with a day-by-day blueprint, attendance policy and learning outcomes." },
      { property: "og:title", content: "Create a course on Learnova" },
      { property: "og:description", content: "Multi-day blueprint, attendance tracking, free for every learner." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewCoursePage,
});

type Day = { title: string; blueprint: string };
type Verification = { id: string; subject: string; kind: string; status: string; exam: string | null };

function NewCoursePage() {
  const { track } = Route.useSearch() as { track: Track };
  const navigate = useNavigate();
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [verifs, setVerifs] = useState<Verification[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [customCategory, setCustomCategory] = useState("");
  const [verifId, setVerifId] = useState("peer");
  const [cover, setCover] = useState<string | null>(null);
  const [level, setLevel] = useState("beginner");
  const [seats, setSeats] = useState("30");
  const [startsOn, setStartsOn] = useState("");
  const [outcomes, setOutcomes] = useState("");
  // Workshops can be a single day; training and kids courses need a real roadmap.
  const minDays = track === "workshop" ? 1 : 3;
  const [days, setDays] = useState<Day[]>(
    track === "workshop"
      ? [{ title: "Session plan", blueprint: "" }]
      : [
          { title: "Day 1 — Basics & tools", blueprint: "" },
          { title: "Day 2 — Core practice", blueprint: "" },
          { title: "Day 3 — Mastery check", blueprint: "" },
        ],
  );

  useEffect(() => {
    supabase.from("categories").select("id, name").order("name").then(({ data }) => setCategories(data ?? []));
    supabase.from("tutor_verifications").select("id, subject, kind, status, exam").eq("status", "approved")
      .then(({ data }) => setVerifs((data ?? []) as Verification[]));
  }, []);

  const setDay = (i: number, patch: Partial<Day>) =>
    setDays((d) => d.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (days.length < minDays) { toast.error(`This needs at least ${minDays} day${minDays === 1 ? "" : "s"}`); return; }
    if (days.some((d) => !d.title.trim())) { toast.error("Every day needs a title"); return; }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      let resolvedCategory: string | null = categoryId === "none" ? null : categoryId;
      if (categoryId === "other") {
        const label = customCategory.trim();
        if (!label) throw new Error("Name your category");
        const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const { data: existing } = await supabase.from("categories").select("id").eq("slug", slug).maybeSingle();
        if (existing) resolvedCategory = existing.id;
        else {
          const { data: created, error } = await supabase.from("categories")
            .insert({ slug, name: label, kind: "hobby", created_by: u.user.id }).select("id").single();
          if (error) throw error;
          resolvedCategory = created.id;
        }
      }

      const baseSlug = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
      const slug = `${baseSlug || "course"}-${Math.random().toString(36).slice(2, 6)}`;

      const { data: course, error: cErr } = await supabase.from("courses").insert({
        slug,
        title: title.trim(),
        tagline: tagline.trim() || null,
        description: description.trim() || null,
        track,
        category_id: resolvedCategory,
        host_id: u.user.id,
        verification_id: verifId === "peer" ? null : verifId,
        peer_led: verifId === "peer",
        cover_url: cover,
        level,
        seats: Math.max(1, parseInt(seats || "30", 10)),
        starts_on: startsOn || null,
        outcomes: outcomes.split("\n").map((s) => s.trim()).filter(Boolean),
        status: "open",
      }).select("id, slug").single();
      if (cErr) throw cErr;

      const { error: dErr } = await supabase.from("course_days").insert(
        days.map((d, i) => ({
          course_id: course.id,
          day_number: i + 1,
          title: d.title.trim(),
          blueprint: d.blueprint.trim() || null,
        })),
      );
      if (dErr) throw dErr;

      toast.success("Course published!");
      navigate({ to: "/courses/$slug", params: { slug: course.slug } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create course");
    } finally {
      setSaving(false);
    }
  };

  const labels: Record<Track, string> = {
    training: "Training course",
    workshop: "Workshop",
    kids: "Kids class",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate({ to: track === "kids" ? "/kids" : track === "workshop" ? "/workshops" : "/training" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">New {labels[track]}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {track === "workshop"
            ? "One day is fine — add more only if your workshop runs as a series."
            : "Minimum 3 days, each with its own blueprint. Learners must notify you at least an hour before to be excused."}
        </p>

        <form onSubmit={submit} className="glass mt-6 space-y-4 rounded-3xl p-6 shadow-soft">
          <div className="space-y-1.5">
            <Label htmlFor="t">Title *</Label>
            <Input id="t" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder={track === "kids" ? "Clay Animals for Little Makers" : "SAT Math — 5-Day Crash Course"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tg">One-line tagline</Label>
            <Input id="tg" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="From 600 to 750 in five focused days" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="d">Description</Label>
            <Textarea id="d" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  <SelectItem value="other">Other — name your own</SelectItem>
                </SelectContent>
              </Select>
              {categoryId === "other" && (
                <Input className="mt-2" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="e.g. Crocheting" />
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Teaching basis</Label>
              <Select
                value={verifId}
                onValueChange={(v) => {
                  // "get-verified" isn't a real basis — it sends the host to the AI score check.
                  if (v === "get-verified") { navigate({ to: "/verify" }); return; }
                  setVerifId(v);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="peer">Peer-to-peer (no score — I'm preparing too)</SelectItem>
                  {verifs.map((v) => (
                    <SelectItem key={v.id} value={v.id}>Verified · {v.subject} {v.exam ? `(${v.exam})` : ""}</SelectItem>
                  ))}
                  <SelectItem value="get-verified">Verified — upload my score / credential</SelectItem>
                </SelectContent>
              </Select>
              {verifId === "peer" ? (
                <>
                  <Badge variant="outline" className="mt-1 rounded-full border-primary/40 text-primary">Shown as peer-to-peer</Badge>
                  {verifs.length === 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Already sat the exam? <button type="button" onClick={() => navigate({ to: "/verify" })} className="text-primary underline">Upload your score</button> — AI checks it and you can teach as verified.
                    </p>
                  )}
                </>
              ) : (
                <Badge variant="secondary" className="mt-1 rounded-full"><ShieldCheck className="mr-1 h-3 w-3" /> Verified badge</Badge>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["beginner", "intermediate", "advanced"].map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s">Seats</Label>
              <Input id="s" type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="so">Starts on</Label>
              <Input id="so" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="o">Outcomes (one per line)</Label>
            <Textarea id="o" rows={3} value={outcomes} onChange={(e) => setOutcomes(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Cover image</Label>
            <ImageUploader value={cover} onChange={setCover} folder="courses" shape="wide" />
          </div>

          <div className="space-y-3 rounded-2xl border border-border/60 p-4">
            <div className="flex items-center justify-between">
              <Label>Day-by-day blueprint {minDays > 1 ? `(min ${minDays})` : ""}</Label>
              <Button type="button" variant="outline" size="sm" className="rounded-full"
                onClick={() => setDays((d) => [...d, { title: `Day ${d.length + 1} — `, blueprint: "" }])}>
                <Plus className="mr-1 h-3 w-3" /> Add day
              </Button>
            </div>
            {days.map((d, i) => (
              <div key={i} className="rounded-xl bg-surface-2/60 p-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">{i + 1}</span>
                  <Input value={d.title} onChange={(e) => setDay(i, { title: e.target.value })} placeholder={`Day ${i + 1} — topic`} />
                  {days.length > minDays && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setDays((x) => x.filter((_, idx) => idx !== i))}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <Textarea className="mt-2" rows={2} value={d.blueprint} onChange={(e) => setDay(i, { blueprint: e.target.value })}
                  placeholder="What happens this day — roadmap, practice, homework" />
              </div>
            ))}
          </div>

          <Button type="submit" disabled={saving} className="w-full rounded-full bg-brand-gradient text-white shadow-soft">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Publish ${labels[track].toLowerCase()}`}
          </Button>
        </form>
      </div>
    </div>
  );
}
