import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Star, Sparkles, GraduationCap, MapPin, Trophy, Pencil, Save, Loader2, MessageSquare, X, Plus,
} from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/users/$userId")({
  head: () => ({ meta: [{ title: "Profile — Learnova" }] }),
  component: UserProfilePage,
});

type Profile = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  headline: string | null;
  university: string | null;
  age: number | null;
  grade: string | null;
  interests: string[];
  goals: string | null;
  achievements: string[];
  free_sessions_taught: number;
  avg_rating: number;
  role: string;
};

type SessionItem = {
  id: string; title: string; status: string; starts_at: string | null; kind: string;
};

function UserProfilePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [me, setMe] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  // edit fields
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [university, setUniversity] = useState("");
  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const [bio, setBio] = useState("");
  const [achievements, setAchievements] = useState<string[]>([]);
  const [newAch, setNewAch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user?.id ?? null);
    const [{ data: p }, { data: sess }] = await Promise.all([
      supabase.from("profiles")
        .select("id, display_name, full_name, avatar_url, bio, headline, university, age, grade, interests, goals, achievements, free_sessions_taught, avg_rating, role")
        .eq("id", userId).maybeSingle(),
      supabase.from("sessions")
        .select("id, title, status, starts_at, kind")
        .eq("tutor_id", userId).order("starts_at", { ascending: false, nullsFirst: false }).limit(20),
    ]);
    setProfile((p as Profile) ?? null);
    setSessions((sess ?? []) as SessionItem[]);
    if (p) {
      setDisplayName(p.display_name ?? "");
      setHeadline(p.headline ?? "");
      setUniversity(p.university ?? "");
      setAge(p.age ? String(p.age) : "");
      setGrade(p.grade ?? "");
      setBio(p.bio ?? "");
      setAchievements(p.achievements ?? []);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [userId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim() || null,
      headline: headline.trim() || null,
      university: university.trim() || null,
      age: age ? parseInt(age, 10) : null,
      grade: grade.trim() || null,
      bio: bio.trim() || null,
      achievements,
    }).eq("id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile updated");
    setEditing(false);
    load();
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div><h1 className="text-2xl font-bold">User not found</h1>
          <Button onClick={() => navigate({ to: "/explore" })} className="mt-4 rounded-full">Explore</Button>
        </div>
      </div>
    );
  }

  const isMe = me === profile.id;
  const upcoming = sessions.filter((s) => s.status === "scheduled" || s.status === "live");
  const past = sessions.filter((s) => s.status === "ended");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 pt-24 pb-16">
        <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/explore" })} className="mb-4">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <div className="glass rounded-3xl p-6 shadow-soft sm:p-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name ?? "Profile"} className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28" />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-2xl bg-brand-gradient text-3xl font-bold text-white sm:h-28 sm:w-28">
                {(profile.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              {!editing ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{profile.display_name ?? "Anonymous"}</h1>
                    <Badge variant="secondary" className="rounded-full capitalize">{profile.role}</Badge>
                  </div>
                  {profile.headline && <p className="mt-1 text-base text-foreground/85">{profile.headline}</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {profile.university && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {profile.university}</span>}
                    {profile.grade && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {profile.grade}</span>}
                    {profile.age != null && <span>Age {profile.age}</span>}
                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-current text-yellow-500" /> {profile.avg_rating > 0 ? profile.avg_rating.toFixed(1) : "New"}</span>
                    <span className="inline-flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> {profile.free_sessions_taught} session{profile.free_sessions_taught === 1 ? "" : "s"} taught</span>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1"><Label>Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
                    <div className="space-y-1"><Label>Headline</Label><Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="CS undergrad · Calculus tutor" /></div>
                    <div className="space-y-1"><Label>University / school</Label><Input value={university} onChange={(e) => setUniversity(e.target.value)} /></div>
                    <div className="space-y-1"><Label>Grade / year</Label><Input value={grade} onChange={(e) => setGrade(e.target.value)} /></div>
                    <div className="space-y-1"><Label>Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              {isMe ? (
                editing ? (
                  <>
                    <Button size="sm" onClick={save} disabled={saving} className="rounded-full bg-brand-gradient text-white">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1 h-4 w-4" /> Save</>}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => setEditing(true)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Edit profile
                  </Button>
                )
              ) : null}
            </div>
          </div>

          {/* Bio */}
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">About</h2>
            {!editing ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
                {profile.bio || <span className="text-muted-foreground">No bio yet.</span>}
              </p>
            ) : (
              <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell learners about yourself…" />
            )}
          </section>

          {/* Achievements */}
          <section className="mt-8">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Trophy className="h-4 w-4" /> Achievements
            </h2>
            {!editing ? (
              achievements.length > 0 ? (
                <ul className="space-y-2">
                  {achievements.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/50 p-3 text-sm">
                      <Trophy className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" /> {a}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No achievements listed yet.</p>
            ) : (
              <div className="space-y-2">
                {achievements.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-border/60 p-2 text-sm">
                    <Trophy className="h-4 w-4 shrink-0 text-yellow-500" /><span className="flex-1">{a}</span>
                    <button onClick={() => setAchievements((arr) => arr.filter((_, j) => j !== i))}><X className="h-4 w-4 text-muted-foreground hover:text-destructive" /></button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input value={newAch} onChange={(e) => setNewAch(e.target.value)} placeholder="e.g. AMC 12 Distinguished Honor Roll" />
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => { if (newAch.trim()) { setAchievements((arr) => [...arr, newAch.trim()]); setNewAch(""); } }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Interests */}
          {profile.interests.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Interests</h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((i) => <Badge key={i} variant="secondary" className="rounded-full">{i}</Badge>)}
              </div>
            </section>
          )}

          {/* Sessions */}
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sessions hosted</h2>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            ) : (
              <div className="space-y-4">
                {upcoming.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Upcoming · {upcoming.length}</p>
                    <ul className="space-y-2">
                      {upcoming.map((s) => <SessionRow key={s.id} s={s} />)}
                    </ul>
                  </div>
                )}
                {past.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Past · {past.length}</p>
                    <ul className="space-y-2">
                      {past.map((s) => <SessionRow key={s.id} s={s} />)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function SessionRow({ s }: { s: SessionItem }) {
  return (
    <li>
      <Link to="/sessions/$sessionId" params={{ sessionId: s.id }} className="flex items-center justify-between rounded-xl border border-border/60 p-3 text-sm transition hover:bg-accent/30">
        <div className="min-w-0">
          <p className="truncate font-medium">{s.title}</p>
          <p className="text-xs text-muted-foreground">
            {s.starts_at ? format(new Date(s.starts_at), "MMM d, h:mm a") : "No date"} · Free
          </p>
        </div>
        <Badge variant="outline" className="rounded-full capitalize">{s.status}</Badge>
      </Link>
    </li>
  );
}
