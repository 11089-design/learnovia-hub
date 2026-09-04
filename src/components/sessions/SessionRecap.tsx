import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Loader2, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { generateSessionSummary } from "@/lib/sessions.functions";

type Summary = { summary: string; key_points: string[]; confused_topics: string[] };
type Line = { id: string; speaker_name: string; content: string; at_seconds: number };

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/** Post-session record: the AI recap plus the full saved transcript. */
export function SessionRecap({ sessionId, title }: { sessionId: string; title: string }) {
  const run = useServerFn(generateSessionSummary);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from("ai_session_summaries").select("summary, key_points, confused_topics").eq("session_id", sessionId).maybeSingle(),
        supabase.from("session_transcripts").select("id, speaker_name, content, at_seconds").eq("session_id", sessionId).order("at_seconds", { ascending: true }).limit(2000),
      ]);
      if (!alive) return;
      if (s) setSummary(s as Summary);
      setLines((t ?? []) as Line[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [sessionId]);

  const generate = async () => {
    setBusy(true);
    try {
      const out = (await run({ data: { sessionId } })) as Summary;
      setSummary(out);
      toast.success("Recap ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build the recap");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    const body = [
      `${title} — transcript`,
      "",
      ...lines.map((l) => `[${mmss(l.at_seconds)}] ${l.speaker_name}: ${l.content}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^\w -]/g, "")}-transcript.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="grid place-items-center p-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> AI recap</h3>
          <Button size="sm" variant="outline" className="ml-auto rounded-full" onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
            {summary ? "Rebuild from transcript" : "Build recap"}
          </Button>
        </div>

        {summary ? (
          <div className="mt-4 space-y-4 text-sm">
            <p className="leading-relaxed text-foreground/85">{summary.summary}</p>
            {summary.key_points.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-primary">Key points</h4>
                <ul className="space-y-1">{summary.key_points.map((k, i) => <li key={i}>• {k}</li>)}</ul>
              </div>
            )}
            {summary.confused_topics.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-amber-600">Worth revisiting</h4>
                <ul className="space-y-1">{summary.confused_topics.map((k, i) => <li key={i}>• {k}</li>)}</ul>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {lines.length > 0
              ? "The transcript is saved — build the recap to turn it into a summary, key points and things worth revisiting."
              : "No transcript was captured for this session. Turn on \u201cRecord transcript\u201d in the room's Intel tab next time and the recap will be built from what was actually said."}
          </p>
        )}
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-primary" /> Transcript ({lines.length} lines)</h3>
          {lines.length > 0 && (
            <Button size="sm" variant="ghost" className="ml-auto rounded-full" onClick={download}>
              <Download className="mr-1 h-3.5 w-3.5" /> Download
            </Button>
          )}
        </div>
        {lines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nothing recorded.</p>
        ) : (
          <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1 text-xs leading-relaxed">
            {lines.map((l) => (
              <p key={l.id}>
                <span className="font-mono text-[10px] text-muted-foreground">{mmss(l.at_seconds)}</span>{" "}
                <span className="font-semibold">{l.speaker_name}:</span> {l.content}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
