import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function ExitReflection({
  open, onOpenChange, sessionId, userId, onDone,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; sessionId: string; userId: string; onDone: () => void;
}) {
  const [learned, setLearned] = useState("");
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!learned.trim()) { toast.error("Share one thing you learned"); return; }
    setBusy(true);
    const { error } = await supabase.from("session_reflections").upsert(
      { session_id: sessionId, user_id: userId, learned: learned.trim(), rating: rating || null },
      { onConflict: "session_id,user_id" },
    );
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Nice work — reflection saved ✨");
    onDone();
  };

  const skip = () => onDone();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Before you go…</DialogTitle>
          <DialogDescription>Take 15 seconds to reflect — it helps you remember.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">One thing you learned</label>
            <Textarea value={learned} onChange={(e) => setLearned(e.target.value)} className="mt-1 min-h-20 rounded-xl" placeholder="I learned that…" />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">How was the session?</label>
            <div className="mt-1 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={`h-6 w-6 transition ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={skip} disabled={busy}>Skip</Button>
          <Button onClick={submit} disabled={busy} className="bg-brand-gradient text-white">
            {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save & leave
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
