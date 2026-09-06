import { useEffect, useState } from "react";
import { Timer, Coffee, Users } from "lucide-react";

/**
 * Focus Sprint — a Learnova original: every member of a community sees the exact
 * same 25-minute focus / 5-minute break cycle, derived from the clock itself, so
 * nobody has to start anything. Walk in at any time and you're already in sync
 * with everyone else studying in this community.
 */
const FOCUS_MIN = 25;
const BREAK_MIN = 5;
const CYCLE_SEC = (FOCUS_MIN + BREAK_MIN) * 60;

export function FocusSprint({ communityName }: { communityName?: string }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-3">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Focus Sprint</p>
        <p className="mt-2 text-sm text-muted-foreground">Syncing…</p>
      </div>
    );
  }

  const intoCycle = Math.floor(now / 1000) % CYCLE_SEC;
  const onBreak = intoCycle >= FOCUS_MIN * 60;
  const remaining = onBreak ? CYCLE_SEC - intoCycle : FOCUS_MIN * 60 - intoCycle;
  const total = onBreak ? BREAK_MIN * 60 : FOCUS_MIN * 60;
  const pct = Math.round(((total - remaining) / total) * 100);
  const mm = Math.floor(remaining / 60)
    .toString()
    .padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase text-muted-foreground">Focus Sprint</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${onBreak ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-primary"}`}
        >
          {onBreak ? "Break" : "Deep work"}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        {onBreak ? (
          <Coffee className="h-5 w-5 text-primary" />
        ) : (
          <Timer className="h-5 w-5 text-primary" />
        )}
        <span className="font-display text-2xl font-bold tabular-nums">
          {mm}:{ss}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-brand-gradient transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <Users className="mt-0.5 h-3 w-3 shrink-0" />
        {onBreak
          ? "Stretch, water, back in a few — everyone here breaks at the same time."
          : `Everyone in ${communityName ?? "this community"} is heads-down on the same timer right now.`}
      </p>
    </div>
  );
}
