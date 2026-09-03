import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, type Editor, type TLStoreSnapshot, loadSnapshot, getSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { Loader2, Download, Share2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Shared whiteboard for a session.
 *
 * Two things used to make the board go blank mid-stroke:
 *  1. React state updates while drawing re-rendered the parent and could tear
 *     down the tldraw canvas. All drawing-time bookkeeping now lives in refs,
 *     and the component is memoised so room re-renders never reach it.
 *  2. No local persistence, so any remount started from an empty store.
 *     `persistenceKey` keeps your work in the browser between mounts.
 *
 * Remote sync stays manual: publish with "Share board", pull with "Get latest".
 */
function WhiteboardImpl({ sessionId, userId }: { sessionId: string; userId: string }) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionRef = useRef(sessionId);
  const userRef = useRef(userId);
  sessionRef.current = sessionId;
  userRef.current = userId;

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [remoteUpdate, setRemoteUpdate] = useState(false);

  const persist = useCallback(async (announce: boolean) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (announce) setSaving(true);
    const snap = getSnapshot(editor.store);
    const { error } = await supabase.from("session_whiteboards").upsert({
      session_id: sessionRef.current,
      snapshot: snap as unknown as never,
      updated_by: userRef.current,
      updated_at: new Date().toISOString(),
    });
    if (announce) setSaving(false);
    if (error) {
      if (announce) toast.error(error.message);
      return;
    }
    if (announce) {
      setSavedAt(Date.now());
      toast.success("Board shared with the room");
    }
  }, []);

  const pull = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;
    const { data } = await supabase
      .from("session_whiteboards")
      .select("snapshot")
      .eq("session_id", sessionRef.current)
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
  }, []);

  // Stable across renders: tldraw never sees a new onMount, so it never remounts.
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      (async () => {
        // Only seed from the server when the local board is still empty, so a
        // remount mid-session never wipes what you just drew.
        const hasLocal = editor.getCurrentPageShapeIds().size > 0;
        if (!hasLocal) {
          const { data } = await supabase
            .from("session_whiteboards")
            .select("snapshot")
            .eq("session_id", sessionRef.current)
            .maybeSingle();
          const snap = data?.snapshot;
          if (
            snap &&
            typeof snap === "object" &&
            Object.keys(snap as object).length > 0 &&
            editor.getCurrentPageShapeIds().size === 0
          ) {
            try {
              loadSnapshot(editor.store, snap as unknown as TLStoreSnapshot);
            } catch (e) {
              console.warn("whiteboard initial load failed", e);
            }
          }
        }
        setLoaded(true);
      })();

      // No timed autosave: any write-while-drawing risked tearing down the
      // canvas mid-stroke. Local work is kept by `persistenceKey`; publishing
      // to the room is an explicit "Share board" action.
      return () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
      };
    },
    [],
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
        <Tldraw persistenceKey={`learnova-wb-${sessionId}`} onMount={handleMount} />
      </div>
    </div>
  );
}

export const Whiteboard = memo(WhiteboardImpl);
