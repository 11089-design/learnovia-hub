import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, AlertTriangle, Radio } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

type Line = { id: string; speaker_name: string; content: string; at_seconds: number; user_id: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.continuous = true;
  rec.interimResults = true;
  rec.lang = "en-US";
  return rec;
}

/**
 * Captures what the local person says, stores it as the session transcript, and
 * shows the shared running transcript. The AI recap reads these lines, so the
 * summary reflects what was actually said instead of only the chat.
 */
export function LiveCaptions({
  sessionId,
  userId,
  displayName,
  startedAt,
  autoStart = true,
}: {
  sessionId: string;
  userId: string;
  displayName: string;
  startedAt?: string | null;
  autoStart?: boolean;
}) {
  const [lines, setLines] = useState<Line[]>([]);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const startRef = useRef(startedAt);
  startRef.current = startedAt;

  const offset = useCallback(() => {
    const base = startRef.current ? new Date(startRef.current).getTime() : Date.now();
    return Math.max(0, Math.round((Date.now() - base) / 1000));
  }, []);

  // Existing + incoming transcript lines
  useEffect(() => {
    let alive = true;
    supabase
      .from("session_transcripts")
      .select("id, speaker_name, content, at_seconds, user_id")
      .eq("session_id", sessionId)
      .order("at_seconds", { ascending: true })
      .limit(500)
      .then(({ data }) => { if (alive) setLines((data ?? []) as Line[]); });

    const ch = supabase
      .channel(`transcript-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_transcripts", filter: `session_id=eq.${sessionId}` }, (p) => {
        const row = p.new as Line;
        setLines((cur) => (cur.some((l) => l.id === row.id) ? cur : [...cur, row]));
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [sessionId]);

  const save = useCallback(async (text: string) => {
    const content = text.trim();
    if (content.length < 2) return;
    await supabase.from("session_transcripts").insert({
      session_id: sessionId,
      user_id: userId,
      speaker_name: displayName || "Speaker",
      content,
      at_seconds: offset(),
    });
  }, [sessionId, userId, displayName, offset]);

  const start = useCallback(() => {
    const rec = getRecognition();
    if (!rec) { setSupported(false); return; }
    recRef.current = rec;
    wantRef.current = true;

    rec.onresult = (e) => {
      let pending = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) void save(r[0].transcript);
        else pending += r[0].transcript;
      }
      setInterim(pending);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantRef.current = false;
        setListening(false);
        toast.error("Microphone access is needed for captions and the AI recap.");
      }
    };
    rec.onend = () => {
      setInterim("");
      // Browsers stop the recognizer periodically — restart while still wanted.
      if (wantRef.current) { try { rec.start(); } catch { /* already starting */ } }
      else setListening(false);
    };
    try {
      rec.start();
      setListening(true);
    } catch { /* already started */ }
  }, [save]);

  const stop = useCallback(() => {
    wantRef.current = false;
    try { recRef.current?.stop(); } catch { /* ignore */ }
    setListening(false);
  }, []);

  useEffect(() => {
    if (autoStart) start();
    return () => { wantRef.current = false; try { recRef.current?.stop(); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={listening ? "default" : "outline"}
          className={`rounded-full ${listening ? "bg-brand-gradient text-white" : ""}`}
          onClick={() => (listening ? stop() : start())}
          disabled={!supported}
        >
          {listening ? <Radio className="mr-1 h-3.5 w-3.5 animate-pulse" /> : <Mic className="mr-1 h-3.5 w-3.5" />}
          {listening ? "Recording transcript" : "Record transcript"}
        </Button>
        {!listening && supported && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MicOff className="h-3 w-3" /> paused</span>
        )}
        {!supported && (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <AlertTriangle className="h-3 w-3" /> This browser can't transcribe — use desktop Chrome or Edge.
          </span>
        )}
      </div>

      <ScrollArea className="min-h-[120px] flex-1 rounded-2xl border border-border/60 bg-background/50 p-3">
        {lines.length === 0 && !interim ? (
          <p className="text-xs text-muted-foreground">
            The transcript starts as soon as someone speaks. It's saved with the session, so you and your learners can read it
            afterwards — and the AI recap is built from it.
          </p>
        ) : (
          <div className="space-y-2 text-xs leading-relaxed">
            {lines.map((l) => (
              <p key={l.id}>
                <span className="font-mono text-[10px] text-muted-foreground">{mmss(l.at_seconds)}</span>{" "}
                <span className="font-semibold">{l.speaker_name}:</span> {l.content}
              </p>
            ))}
            {interim && <p className="italic text-muted-foreground">{interim}</p>}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
