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

    const [{ data: messages }, { data: notes }] = await Promise.all([
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
    ]);

    const chatBlob = (messages ?? []).map((m) => `- ${m.content}`).join("\n").slice(0, 12_000);
    const notesBlob = (notes?.content ?? "").slice(0, 8_000);

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
      prompt: `You are an academic coach. Read this peer-learning session and produce:
1) A friendly 3-sentence summary of what happened.
2) Up to 8 short key points learners should remember.
3) Up to 6 topics learners seemed confused about (look for "I don't get", "?", "didn't understand", repeated questions on the same idea).

Session title: ${session.title}
Description: ${session.description ?? "(none)"}

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
