import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, Sparkles, Users, ArrowLeft, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitVerification } from "@/lib/verify.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ProofUploader, type ProofFile } from "@/components/ProofUploader";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/verify")({
  head: () => ({
    meta: [
      { title: "Get verified to teach Training — Learnova" },
      { name: "description", content: "Upload your exam score or credential — our AI checks it — or teach openly as a peer-to-peer study group." },
      { property: "og:title", content: "Get verified to teach on Learnova" },
      { property: "og:description", content: "AI-checked score verification, or run an honest peer-led course." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VerifyPage,
});

type Row = {
  id: string;
  kind: string;
  subject: string;
  exam: string | null;
  claimed_score: string | null;
  status: string;
  ai_confidence: number;
  ai_verdict: unknown;
  created_at: string;
};

function VerifyPage() {
  const navigate = useNavigate();
  const submit = useServerFn(submitVerification);
  const [mode, setMode] = useState<"exam_score" | "credential" | "peer_no_score">("exam_score");
  const [subject, setSubject] = useState("");
  const [exam, setExam] = useState("");
  const [score, setScore] = useState("");
  const [proof, setProof] = useState<ProofFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from("tutor_verifications")
      .select("id, kind, subject, exam, claimed_score, status, ai_confidence, ai_verdict, created_at")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { load(); }, []);

  const go = async () => {
    if (!subject.trim()) { toast.error("What subject do you want to teach?"); return; }
    if (mode !== "peer_no_score" && !proof) { toast.error("Upload your score report or credential"); return; }
    setBusy(true);
    try {
      const res = await submit({
        data: {
          kind: mode,
          subject: subject.trim(),
          exam: exam.trim() || undefined,
          claimedScore: score.trim() || undefined,
          proofUrl: proof?.url ?? undefined,
          proofMime: proof?.mime ?? undefined,
        },
      });
      if (res.status === "approved") toast.success("Verified! You can now host a training course.");
      else toast.info("Submitted — a human moderator will review this shortly.");
      setProof(null); setExam(""); setScore("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate({ to: "/training" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Training
        </Button>

        <h1 className="text-2xl font-bold tracking-tight">Teaching verification</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Learnova Training is free, but learners deserve to know who's teaching. Prove your score, prove a credential, or say plainly
          that you're a peer preparing too — all three are allowed, and every course card shows which.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <ModeCard active={mode === "exam_score"} onClick={() => setMode("exam_score")} icon={<Sparkles className="h-4 w-4" />}
            title="Exam score" body="SAT, AP, IELTS, olympiad — upload the report." />
          <ModeCard active={mode === "credential"} onClick={() => setMode("credential")} icon={<ShieldCheck className="h-4 w-4" />}
            title="Credential" body="Professor, admissions, professional — for workshops." />
          <ModeCard active={mode === "peer_no_score"} onClick={() => setMode("peer_no_score")} icon={<Users className="h-4 w-4" />}
            title="No score / peer" body="You're preparing too — labelled peer-to-peer." />
        </div>

        <div className="glass mt-4 space-y-4 rounded-3xl p-6 shadow-soft">
          <div className="space-y-1.5">
            <Label htmlFor="subj">Subject you want to teach *</Label>
            <Input id="subj" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. SAT Math, AP Biology, College essays" />
          </div>

          {mode !== "peer_no_score" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="exam">{mode === "exam_score" ? "Exam" : "Credential"}</Label>
                  <Input id="exam" value={exam} onChange={(e) => setExam(e.target.value)} placeholder={mode === "exam_score" ? "SAT" : "PhD, Physics — Univ. of X"} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="score">{mode === "exam_score" ? "Your score" : "Role / year"}</Label>
                  <Input id="score" value={score} onChange={(e) => setScore(e.target.value)} placeholder={mode === "exam_score" ? "1540" : "Associate Professor, 2024"} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Proof document *</Label>
                <ProofUploader value={proof} onChange={setProof} folder="verifications" />
                <p className="text-xs text-muted-foreground">
                  Upload a screenshot or the original PDF. Our AI reads the issuer, score and scale, cross-checks it against your claim and looks for tampering. Anything unclear goes to a human reviewer.
                </p>
              </div>
            </>
          )}

          {mode === "peer_no_score" && (
            <div className="flex gap-2 rounded-2xl border border-primary/25 bg-primary/5 p-4 text-sm">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                Totally fine — lots of the best study groups are peer-led. Your course will show a{" "}
                <span className="font-semibold text-primary">Peer-to-peer</span> badge everywhere so learners know you're preparing alongside them.
              </p>
            </div>
          )}

          <Button onClick={go} disabled={busy} className="w-full rounded-full bg-brand-gradient text-white shadow-soft">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "peer_no_score" ? "Continue as peer tutor" : "Submit for AI check"}
          </Button>
        </div>

        {rows.length > 0 && (
          <>
            <h2 className="mt-10 text-lg font-semibold">Your verifications</h2>
            <ul className="mt-3 space-y-2">
              {rows.map((r) => {
                const v = r.ai_verdict as { reasoning?: string; detected_score?: string | null; red_flags?: string[] } | null;
                return (
                  <li key={r.id} className="glass rounded-2xl p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.subject}</span>
                      <Badge
                        variant={r.status === "approved" ? "secondary" : r.status === "rejected" ? "destructive" : "outline"}
                        className="rounded-full capitalize"
                      >
                        {r.status}
                      </Badge>
                      {r.kind === "peer_no_score" ? (
                        <Badge variant="outline" className="rounded-full border-primary/40 text-primary">Peer-to-peer</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {r.exam} {r.claimed_score && `· claimed ${r.claimed_score}`} · AI confidence {Math.round(r.ai_confidence * 100)}%
                        </span>
                      )}
                    </div>
                    {v?.reasoning && <p className="mt-2 text-xs text-muted-foreground">{v.reasoning}</p>}
                    {!!v?.red_flags?.length && (
                      <p className="mt-1 flex items-start gap-1 text-xs text-destructive">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {v.red_flags.join(" · ")}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            <Link to="/courses/new" search={{ track: "training" }}>
              <Button variant="outline" className="mt-4 rounded-full">Create a training course →</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function ModeCard({ active, onClick, icon, title, body }: { active: boolean; onClick: () => void; icon: React.ReactNode; title: string; body: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`glass rounded-2xl p-4 text-left transition hover:-translate-y-0.5 ${active ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">{icon} {title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </button>
  );
}
