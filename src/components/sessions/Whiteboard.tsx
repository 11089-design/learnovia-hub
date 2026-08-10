import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, type Editor, type TLStoreSnapshot, loadSnapshot, getSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { Loader2, Download, Share2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Shared whiteboard for a session.
 *
 * Sync is intentionally *manual*: pushing remote snapshots into a live tldraw
 * store while someone is drawing or panning resets their camera and wipes
 * in-flight strokes, which made the board feel blank and jumpy. Instead we
 * load once on mount, autosave your own work quietly, and let people publish
 * ("Share board") or pull ("Get latest") when they actually want to.
 */
export function Whiteboard({
  sessionId,
  userId,
}: {
  sessionId: string;
  userId: string;
}) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [remoteUpdate, setRemoteUpdate] = useState(false);

  const persist = useCallback(
    async (announce: boolean) => {
      const editor = editorRef.current;
      if (!editor) return;
      setSaving(true);
      const snap = getSnapshot(editor.store);
      const { error } = await supabase.from("session_whiteboards").upsert({
        session_id: sessionId,
        snapshot: snap as unknown as never,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      });
      setSaving(false);
      if (error) {
        if (announce) toast.error(error.message);
        return;
      }
      setSavedAt(Date.now());
      if (announce) toast.success("Board shared with the room");
    },
    [sessionId, userId],
  );

  const pull = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const { data } = await supabase
      .from("session_whiteboards")
      .select("snapshot")
      .eq("session_id", sessionId)
      .maybeSingle();
    const snap = data?.snapshot;
    if (!snap || typeof snap !== "object" || Object.keys(snap as object).length === 0) {
      toast.info("Nothing shared on the board yet");
      return;
    }
    try {
      loadSnapshot(editor.store, snap as unknown as TLStoreSnapshot);
      setRemoteUpdate(false);
      toast.success("Loaded the latest board");
    } catch (e) {
      console.warn("whiteboard snapshot load failed", e);
      toast.error("Couldn't load that board");
    }
  }, [sessionId]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      (async () => {
        const { data } = await supabase
          .from("session_whiteboards")
          .select("snapshot")
          .eq("session_id", sessionId)
          .maybeSingle();
        const snap = data?.snapshot;
        if (snap && typeof snap === "object" && Object.keys(snap as object).length > 0) {
          try {
            loadSnapshot(editor.store, snap as unknown as TLStoreSnapshot);
          } catch (e) {
            console.warn("whiteboard initial load failed", e);
          }
        }
        setLoaded(true);
      })();

      // Quiet autosave of your own drawing, debounced so strokes aren't interrupted.
      const unlisten = editor.store.listen(
        () => {
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => { void persist(false); }, 1500);
        },
        { source: "user", scope: "document" },
      );

      return () => {
        unlisten();
        if (saveTimer.current) clearTimeout(saveTimer.current);
      };
    },
    [sessionId, persist],
  );

  // Only *notify* about remote changes — never force them into the live canvas.
  useEffect(() => {
    const ch = supabase
      .channel(`wb-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "session_whiteboards", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const next = payload.new as { updated_by: string | null } | undefined;
          if (!next || next.updated_by === userId) return;
          setRemoteUpdate(true);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, userId]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => void persist(true)} disabled={saving}>
          {saving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Share2 className="mr-1 h-3.5 w-3.5" />}
          Share board
        </Button>
        <Button
          size="sm"
          variant={remoteUpdate ? "default" : "outline"}
          className={`rounded-full ${remoteUpdate ? "bg-brand-gradient text-white" : ""}`}
          onClick={() => void pull()}
        >
          <Download className="mr-1 h-3.5 w-3.5" /> {remoteUpdate ? "New version — get it" : "Get latest"}
        </Button>
        {savedAt && !saving && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Check className="h-3 w-3 text-primary" /> saved
          </span>
        )}
      </div>
      <div className="relative min-h-[380px] flex-1 w-full overflow-hidden rounded-2xl border border-border/60 bg-card">
        {!loaded && (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <Tldraw onMount={handleMount} />
      </div>
    </div>
  );
}
