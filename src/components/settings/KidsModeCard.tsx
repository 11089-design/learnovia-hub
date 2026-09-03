import { useEffect, useState } from "react";
import { Baby, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

/** Lets a family mark the account as a young learner's, unlocking Kids sessions. */
export function KidsModeCard() {
  const [kids, setKids] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("profiles").select("kids_mode").eq("id", u.user.id).maybeSingle();
      if (!alive) return;
      setKids(!!data?.kids_mode);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    setKids(next);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({ kids_mode: next }).eq("id", u.user!.id);
    setSaving(false);
    if (error) {
      setKids(!next);
      toast.error(error.message);
      return;
    }
    toast.success(next ? "Kids mode is on — Learnova Kids is unlocked." : "Kids mode is off.");
  };

  return (
    <section className="glass rounded-3xl p-6 md:p-8">
      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        <Baby className="h-3.5 w-3.5" /> Learner profile
      </span>
      <h2 className="mt-4 text-2xl font-bold tracking-tight">Kids mode</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Turn this on for a younger learner (5–12) using the account with a grown-up. It surfaces the Learnova Kids corner and
        keeps the playful layout as the default.
      </p>
      <label className="mt-5 flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-border p-4">
        <span className="text-sm font-semibold">This is a kid's learning account</span>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : (
          <Switch checked={kids} onCheckedChange={toggle} disabled={saving} aria-label="Kids mode" />
        )}
      </label>
    </section>
  );
}
