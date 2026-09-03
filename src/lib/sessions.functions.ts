import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";

const SummaryInput = z.object({ sessionId: z.string().uuid() });

export const generateSessionSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SummaryInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const { supabase, userId } = context;

    // Authorize: must be tutor or participant
    const { data: session } = await supabase
      .from("sessions")
      .select("id, title, description, tutor_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Session not found");

    if (session.tutor_id !== userId) {
      const { data: p } = await supabase
        .from("session_participants")
        .select("id")
        .eq("session_id", data.sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!p) throw new Error("Forbidden");
    }

    const [{ data: messages }, { data: notes }, { data: transcript }] = await Promise.all([
      supabase
        .from("session_messages")
        .select("content, created_at")
        .eq("session_id", data.sessionId)
        .order("created_at", { ascending: true })
        .limit(500),
      supabase
        .from("session_notes_shared")
        .select("content")
        .eq("session_id", data.sessionId)
        .maybeSingle(),
      supabase
        .from("session_transcripts")
        .select("speaker_name, content, at_seconds")
        .eq("session_id", data.sessionId)
        .order("at_seconds", { ascending: true })
        .limit(2000),
    ]);

    const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
    const spokenLines = transcript ?? [];
    const spokenBlob = spokenLines
      .map((t) => `[${mmss(t.at_seconds)}] ${t.speaker_name}: ${t.content}`)
      .join("\n")
      .slice(0, 40_000);
    const chatBlob = (messages ?? []).map((m) => `- ${m.content}`).join("\n").slice(0, 8_000);
    const notesBlob = (notes?.content ?? "").slice(0, 8_000);

    if (spokenLines.length === 0 && !chatBlob && !notesBlob) {
      throw new Error(
        "There's nothing to summarise yet. Turn on \"Record transcript\" in the Intel tab so the recap can hear the session.",
      );
    }

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          summary: z.string(),
          key_points: z.array(z.string()).max(8),
          confused_topics: z.array(z.string()).max(6),
        }),
      }),
      prompt: `You are an academic coach reviewing a peer-learning session. The SPOKEN TRANSCRIPT is your primary source of truth — it is what the tutor and learners actually said. Chat and notes are secondary context only.

Ground every statement in the transcript. Quote or paraphrase what was actually taught, in the order it was taught. Never invent topics that were not discussed. If the transcript is thin, say so plainly in the summary instead of guessing.

Produce:
1) "summary": 3-5 sentences on what was actually taught and covered, in plain language.
2) "key_points": up to 8 concrete takeaways a learner should remember, each drawn from the transcript (include a definition, rule, formula or example when one was given).
3) "confused_topics": up to 6 things learners struggled with — look for questions, "I don't get", repeated re-explanations of the same idea, or the tutor rephrasing.

Session title: ${session.title}
Description: ${session.description ?? "(none)"}

--- SPOKEN TRANSCRIPT (${spokenLines.length} lines) ---
${spokenBlob || "(no speech captured)"}

--- CHAT ---
${chatBlob || "(no chat)"}

--- SHARED NOTES ---
${notesBlob || "(no notes)"}`,
    });


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("ai_session_summaries")
      .upsert({
        session_id: data.sessionId,
        summary: output.summary,
        key_points: output.key_points,
        confused_topics: output.confused_topics,
      });

    return output;
  });
