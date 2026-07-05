import { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, type Editor, type TLStoreSnapshot, loadSnapshot, getSnapshot } from "tldraw";
import "tldraw/tldraw.css";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared whiteboard for a session. Snapshot is persisted in
 * `session_whiteboards.snapshot`. On local edits, we debounce-upsert the
 * snapshot. Realtime UPDATE events from other participants trigger a reload.
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
  const applyingRemote = useRef(false);
  const lastSavedAt = useRef(0);
  const [loaded, setLoaded] = useState(false);

  const applySnapshot = useCallback((snap: unknown) => {
    const editor = editorRef.current;
    if (!editor || !snap || typeof snap !== "object") return;
    try {
      applyingRemote.current = true;
      loadSnapshot(editor.store, snap as TLStoreSnapshot);
    } catch (e) {
      console.warn("whiteboard snapshot load failed", e);
    } finally {
      // release on next tick so listener sees the flag during apply
      setTimeout(() => {
        applyingRemote.current = false;
      }, 0);
    }
  }, []);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Initial load
      (async () => {
        const { data } = await supabase
          .from("session_whiteboards")
          .select("snapshot")
          .eq("session_id", sessionId)
          .maybeSingle();
        if (data?.snapshot && Object.keys(data.snapshot as object).length > 0) {
          applySnapshot(data.snapshot);
        }
        setLoaded(true);
      })();

      // Listen to local user changes only
      const unlisten = editor.store.listen(
        () => {
          if (applyingRemote.current) return;
          if (saveTimer.current) clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(async () => {
            const snap = getSnapshot(editor.store);
            lastSavedAt.current = Date.now();
            const { error } = await supabase
              .from("session_whiteboards")
              .upsert({
                session_id: sessionId,
                snapshot: snap as unknown as never,
                updated_by: userId,
                updated_at: new Date().toISOString(),
              });
            if (error) console.warn("whiteboard save failed", error.message);
          }, 800);
        },
        { source: "user", scope: "document" },
      );

      return () => {
        unlisten();
        if (saveTimer.current) clearTimeout(saveTimer.current);
      };
    },
    [sessionId, userId, applySnapshot],
  );


  useEffect(() => {
    const ch = supabase
      .channel(`wb-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_whiteboards",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const next = payload.new as { snapshot: unknown; updated_by: string | null; updated_at: string } | undefined;
          if (!next) return;
          if (next.updated_by === userId) return;
          // Ignore echoes shortly after our own save
          if (Date.now() - lastSavedAt.current < 500) return;
          applySnapshot(next.snapshot);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [sessionId, userId, applySnapshot]);

  return (
    <div className="relative h-full min-h-[400px] w-full overflow-hidden rounded-2xl border border-border/60 bg-card">
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-background/60">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      <Tldraw
        persistenceKey={`wb-${sessionId}`}
        onMount={handleMount}
        

      />
    </div>
  );
}
