import { supabase } from "@/integrations/supabase/client";

// Light, conservative wordlist. Extend as needed.
const WORDS = [
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "piss",
  "cunt", "slut", "whore", "retard", "faggot", "nigger", "nigga",
  "rape", "kys",
];

const RE = new RegExp(`\\b(${WORDS.join("|")})\\b`, "gi");

export function checkProfanity(text: string): { clean: string; flagged: boolean; matched: string[] } {
  const matched: string[] = [];
  const clean = text.replace(RE, (w) => {
    matched.push(w.toLowerCase());
    return "*".repeat(w.length);
  });
  return { clean, flagged: matched.length > 0, matched };
}

/** Files an auto-report on a message that contained flagged language. Non-blocking. */
export async function autoReportMessage(opts: {
  reporterId: string;
  targetKind: "session_message" | "community_message";
  targetId: string;
  matched: string[];
}) {
  await supabase.from("reports").insert({
    reporter_id: opts.reporterId,
    target_kind: opts.targetKind,
    target_id: opts.targetId,
    reason: `auto:profanity (${opts.matched.join(", ")})`,
  });
}
