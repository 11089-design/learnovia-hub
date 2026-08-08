import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";

const VerifyInput = z.object({
  kind: z.enum(["exam_score", "credential", "peer_no_score"]),
  subject: z.string().min(2).max(80),
  exam: z.string().max(80).optional(),
  claimedScore: z.string().max(40).optional(),
  proofUrl: z.string().url().optional(),
});

const Verdict = z.object({
  document_type: z.string().describe("What the image appears to be, e.g. 'College Board SAT score report'"),
  detected_score: z.string().nullable().describe("The score/grade visible in the image, verbatim. Null if none found."),
  matches_claim: z.boolean().describe("Does the visible score match what the tutor claimed?"),
  looks_authentic: z.boolean().describe("Does it look like a genuine, unedited report (layout, logos, consistency)?"),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().describe("2-3 sentences a human reviewer can read"),
  red_flags: z.array(z.string()).max(4),
});

/**
 * Submits a Learnova Training teaching credential.
 * - peer_no_score: instantly approved, but the course is flagged peer-led everywhere.
 * - exam_score / credential: AI reads the uploaded proof and auto-approves only on a
 *   confident, matching, authentic-looking read. Anything else goes to human review.
 */
export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VerifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.kind === "peer_no_score") {
      const { data: row, error } = await supabase
        .from("tutor_verifications")
        .insert({
          user_id: userId,
          kind: "peer_no_score",
          subject: data.subject,
          status: "approved",
          ai_confidence: 1,
          ai_verdict: { note: "Peer-led: tutor declared no score. Sessions are labelled peer-to-peer." } as never,
        })
        .select("id, status")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id, status: row.status as string, verdict: null };
    }

    if (!data.proofUrl) throw new Error("Upload your score report or credential first");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: Verdict }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You verify teaching credentials for a student learning platform. A tutor wants to teach "${data.subject}".
They claim: exam/credential = "${data.exam ?? "unspecified"}", score/result = "${data.claimedScore ?? "unspecified"}".

Examine the attached image. Decide:
- what document it is,
- what score/result is actually visible,
- whether it matches their claim,
- whether it looks like an unedited, genuine report.

Be strict but fair. Blurry, cropped-to-hide, mismatched fonts, inconsistent alignment, or a screenshot of a screenshot with no identifying header are red flags. If you cannot read a score, set detected_score null, matches_claim false and confidence low.`,
            },
            { type: "image", image: new URL(data.proofUrl) },
          ],
        },
      ],
    });

    const autoApprove = output.matches_claim && output.looks_authentic && output.confidence >= 0.75 && output.red_flags.length === 0;

    const { data: row, error } = await supabase
      .from("tutor_verifications")
      .insert({
        user_id: userId,
        kind: data.kind,
        subject: data.subject,
        exam: data.exam ?? null,
        claimed_score: data.claimedScore ?? null,
        proof_path: data.proofUrl,
        ai_verdict: output as never,
        ai_confidence: output.confidence,
        status: autoApprove ? "approved" : "pending",
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id, status: row.status as string, verdict: output };
  });
