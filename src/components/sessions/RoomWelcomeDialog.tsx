import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CLASSROOM_TOOLS, ROOM_GUIDE_SEEN_KEY } from "@/lib/guide-content";

/**
 * Shows a one-time welcome/usage guide the first time someone enters a live room.
 * Can also be opened on demand via the `open`/`onOpenChange` props.
 */
export function RoomWelcomeDialog({
  open,
  onOpenChange,
}: {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);

  useEffect(() => {
    if (controlled) return;
    try {
      if (!localStorage.getItem(ROOM_GUIDE_SEEN_KEY)) setInternalOpen(true);
    } catch {
      /* storage blocked — skip */
    }
  }, [controlled]);

  const isOpen = controlled ? open! : internalOpen;
  const setOpen = (v: boolean) => {
    if (controlled) onOpenChange?.(v);
    else {
      setInternalOpen(v);
      if (!v) {
        try {
          localStorage.setItem(ROOM_GUIDE_SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Welcome to your live classroom
          </DialogTitle>
          <DialogDescription>
            A quick tour of every tool in here. The tabs on the right hold Chat, Notes, Whiteboard, Resources,
            Polls, People and Breakouts — the bar above the video holds mic, camera and screen share.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          {CLASSROOM_TOOLS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2">
                <t.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">{t.name}</span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{t.body}</p>
            </div>
          ))}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Link to="/settings" className="text-xs text-muted-foreground underline">
            Find this again in Settings › Help
          </Link>
          <Button className="rounded-full bg-brand-gradient text-white" onClick={() => setOpen(false)}>
            Got it — let's go
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
