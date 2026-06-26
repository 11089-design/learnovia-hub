import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Sparkles, GraduationCap, Users, ArrowRight, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — Learnova" }] }),
  component: OnboardingPage,
});

const INTEREST_TAGS = [
  "Math", "Physics", "Chemistry", "Biology", "Coding", "Web Dev",
  "AI / ML", "Robotics", "Music", "Guitar", "Piano", "Art", "Design",
  "Public Speaking", "Debate", "MUN", "Chess", "Writing", "Languages",
  "Spanish", "French", "Photography", "Finance", "Business",
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [role, setRole] = useState<"learner" | "tutor">("learner");
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState<string>("");
  const [grade, setGrade] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [goals, setGoals] = useState("");
  const [parentConsent, setParentConsent] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, role, age, grade, interests, goals, parent_consent, onboarded, avatar_url")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (data) {
        if (data.onboarded) {
          navigate({ to: "/dashboard" });
          return;
        }
        setDisplayName(data.display_name ?? "");
        setRole((data.role as "learner" | "tutor") ?? "learner");
        setAge(data.age ? String(data.age) : "");
        setGrade(data.grade ?? "");
        setInterests(data.interests ?? []);
        setGoals(data.goals ?? "");
        setParentConsent(data.parent_consent ?? false);
        setAvatarUrl(data.avatar_url ?? null);
      }
    })();
  }, [navigate]);

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const ageNum = age ? parseInt(age, 10) : NaN;
  const isUnder18 = !isNaN(ageNum) && ageNum < 18;

  const canContinue = () => {
    if (step === 0) return role === "learner" || role === "tutor";
    if (step === 1) return displayName.trim().length >= 2 && ageNum >= 13 && ageNum <= 100 && grade.trim().length > 0;
    if (step === 2) return interests.length >= 1;
    if (step === 3) return true;
    return true;
  };

  const finish = async () => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim(),
          role,
          age: ageNum,
          grade: grade.trim(),
          interests,
          goals: goals.trim() || null,
          parent_consent: isUnder18 ? parentConsent : true,
          onboarded: true,
          avatar_url: avatarUrl,
        })
        .eq("id", userData.user.id);

      if (error) throw error;
      toast.success("You're all set!");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Learn<span className="gradient-text">ova</span>
          </span>
        </div>

        {/* Stepper */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 w-10 rounded-full transition-all ${i <= step ? "bg-brand-gradient" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="glass rounded-3xl p-6 shadow-soft">
          {step === 0 && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">How will you start?</h1>
              <p className="mt-1 text-sm text-muted-foreground">You can switch anytime — most people do both.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <RolePick selected={role === "learner"} onClick={() => setRole("learner")} icon={<GraduationCap />} title="I want to learn" desc="Find peers to learn from in classes, hobbies & homework." />
                <RolePick selected={role === "tutor"} onClick={() => setRole("tutor")} icon={<Users />} title="I want to teach" desc="Share what you know. Build trust. Earn from paid sessions." />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Tell us about you</h1>
                <p className="mt-1 text-sm text-muted-foreground">Your display name is what other students see.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-name">Display name</Label>
                <Input id="ob-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="e.g. Aanya" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ob-age">Age</Label>
                  <Input id="ob-age" type="number" min={13} max={100} value={age} onChange={(e) => setAge(e.target.value)} placeholder="16" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ob-grade">Grade / Year</Label>
                  <Input id="ob-grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="Grade 11 / Year 1" />
                </div>
              </div>
              {ageNum && ageNum < 13 && (
                <p className="text-xs text-destructive">Learnova is for students 13 and older.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Pick your interests</h1>
              <p className="mt-1 text-sm text-muted-foreground">We'll match you with the right sessions and communities.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {INTEREST_TAGS.map((tag) => {
                  const active = interests.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleInterest(tag)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-soft"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      {active && <Check className="mr-1 inline h-3 w-3" />}
                      {tag}
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Pick at least 1. You can edit these later.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Almost there</h1>
                <p className="mt-1 text-sm text-muted-foreground">Optional, but it helps tutors prep for you.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ob-goals">What do you want to achieve? (optional)</Label>
                <Textarea id="ob-goals" value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="e.g. Crack JEE physics, build my first website, get better at debate." rows={4} />
              </div>

              {isUnder18 && role === "tutor" && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox id="consent" checked={parentConsent} onCheckedChange={(v) => setParentConsent(Boolean(v))} />
                    <div>
                      <Label htmlFor="consent" className="cursor-pointer">I have parent/guardian consent</Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Under 18 tutors need parent/guardian consent to earn from paid sessions. You can still teach free sessions either way.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="rounded-full"
            >
              Back
            </Button>
            {step < 3 ? (
              <Button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue()}
                className="rounded-full bg-brand-gradient text-white shadow-soft hover:opacity-95"
              >
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={finish}
                disabled={saving || !canContinue()}
                className="rounded-full bg-brand-gradient text-white shadow-soft hover:opacity-95"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter Learnova"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RolePick({
  selected,
  onClick,
  icon,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-soft"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-gradient text-white shadow-soft">
        {icon}
      </div>
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">{title}</h3>
        {selected && <Badge variant="secondary" className="rounded-full">Picked</Badge>}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
