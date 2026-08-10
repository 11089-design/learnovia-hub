import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const VerifyInput = z.object({
  kind: z.enum(["exam_score", "credential", "peer_no_score"]),
  subject: z.string().min(2).max(80),
  exam: z.string().max(80).optional(),
  claimedScore: z.string().max(40).optional(),
  proofUrl: z.string().url().optional(),
  proofMime: z.string().max(120).optional(),
});

const Verdict = z.object({
  document_type: z.string(),
  issuer: z.string().nullable(),
  candidate_name: z.string().nullable(),
  detected_score: z.string().nullable(),
  detected_subject: z.string().nullable(),
  score_scale: z.string().nullable(),
  date_on_document: z.string().nullable(),
  matches_claim: z.boolean(),
  subject_relevant: z.boolean(),
  looks_authentic: z.boolean(),
  tampering_signals: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  red_flags: z.array(z.string()),
});
type VerdictT = z.infer<typeof Verdict>;

const RUBRIC = `You are a strict credential examiner for a student learning platform. You must decide whether an uploaded document genuinely proves the claim a tutor makes.

Work through these steps before answering:
1. IDENTIFY — what document is this? Name the issuing body (College Board, Cambridge, ETS, a university, a school, an employer). If you cannot identify an issuer, that alone caps confidence at 0.4.
2. READ — transcribe the score, grade, band or role exactly as printed, plus the scale it sits on (e.g. "1520 / 1600", "Band 8.0 / 9", "AP 5 / 5", "A*"). Also read the candidate name and the date if visible.
3. RELEVANCE — is the document about the subject the tutor wants to teach? A maths olympiad certificate does not support teaching IELTS speaking.
4. MATCH — does the printed result equal the claimed result? Treat rounding, different notation of the same number, and section-vs-total confusion carefully: a claimed total that only appears as a section score is NOT a match.
5. AUTHENTICITY — look for tampering: mismatched or re-typed fonts, misaligned baselines, inconsistent kerning, pixelated or smudged regions around the score, compression halos limited to one area, missing official headers/logos/candidate IDs, a screenshot of a screenshot, obvious cropping that hides identifying information, editor UI visible, or an unrelated screenshot (a game, a random webpage, a photo, a chat) with no credential content at all.
6. DECIDE — set matches_claim, subject_relevant, looks_authentic and a calibrated confidence between 0 and 1.

Hard rules:
- If the document is not a credential/score document at all (a random screenshot, meme, selfie, unrelated webpage), set document_type to what it actually is, detected_score null, matches_claim false, looks_authentic false, confidence at most 0.1, and add a red flag saying it is not a score or credential document.
- Never guess a score that is not legible. Use null.
- List every tampering signal you notice in tampering_signals, even minor ones.
- red_flags is for issues a human reviewer must see. Keep each under 12 words.
- Be fair: a clean, legible, official-looking report that matches the claim deserves high confidence.

Reply with ONLY a JSON object, no markdown, in exactly this shape:
{"document_type":string,"issuer":string|null,"candidate_name":string|null,"detected_score":string|null,"detected_subject":string|null,"score_scale":string|null,"date_on_document":string|null,"matches_claim":boolean,"subject_relevant":boolean,"looks_authentic":boolean,"tampering_signals":string[],"confidence":number,"reasoning":string,"red_flags":string[]}`;

/** Fetches the proof (signed URL) and inlines it as base64 so the model never depends on our storage host. */
async function inlineProof(url: string, hintedMime?: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't read your uploaded file (${res.status}). Try uploading it again.`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength === 0) throw new Error("That file appears to be empty — please upload it again.");
  const mime = (res.headers.get("content-type") ?? hintedMime ?? "").split(";")[0].trim() || "application/octet-stream";
  let binary = "";
  for (let i = 0; i < buf.length; i += 8192) {
    binary += String.fromCharCode(...buf.subarray(i, i + 8192));
  }
  return { base64: btoa(binary), mime, isPdf: mime.includes("pdf") || /\.pdf(\?|$)/i.test(url) };
}

function numbersIn(text: string) {
  return (text.match(/\d+(\.\d+)?/g) ?? []).map(Number);
}

/**
 * Submits a Learnova Training teaching credential.
 * - peer_no_score: instantly approved, but the course is flagged peer-led everywhere.
 * - exam_score / credential: the AI reads the uploaded image or PDF against a strict
 *   rubric. Auto-approval needs a confident, matching, relevant, untampered read plus
 *   a deterministic cross-check of the claimed number. Anything else goes to a human.
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
    if (!apiKey) throw new Error("AI verification is not configured yet");

    const proof = await inlineProof(data.proofUrl, data.proofMime);

    const instruction = `A tutor wants to teach "${data.subject}" on Learnova.
They claim: ${data.kind === "exam_score" ? "exam" : "credential"} = "${data.exam ?? "unspecified"}", result/role = "${data.claimedScore ?? "unspecified"}".
Examine the attached ${proof.isPdf ? "PDF document" : "image"} and judge the claim.`;

    const content: Record<string, unknown>[] = [{ type: "text", text: instruction }];
    if (proof.isPdf) {
      content.push({
        type: "file",
        file: { filename: "proof.pdf", file_data: `data:application/pdf;base64,${proof.base64}` },
      });
    } else {
      content.push({
        type: "image_url",
        image_url: { url: `data:${proof.mime || "image/jpeg"};base64,${proof.base64}` },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: RUBRIC },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      console.error(`Verification AI failed [${aiRes.status}]: ${body}`);
      if (aiRes.status === 429) throw new Error("Verification is busy right now — try again in a minute.");
      if (aiRes.status === 402) throw new Error("AI credits are exhausted for this workspace.");
      throw new Error(`Couldn't check that document (${aiRes.status}). Try a clearer image or a PDF.`);
    }

    const payload = (await aiRes.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = payload.choices?.[0]?.message?.content ?? "";
    const jsonText = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let output: VerdictT;
    try {
      output = Verdict.parse(JSON.parse(jsonText));
    } catch (e) {
      console.error("Verification parse failed", e, raw.slice(0, 400));
      throw new Error("The AI couldn't read that document clearly. Try a sharper image or the original PDF.");
    }

    // Deterministic cross-check: the claimed number must actually appear in the read score.
    const claimed = (data.claimedScore ?? "").trim();
    const claimedNums = numbersIn(claimed);
    const detectedNums = numbersIn(output.detected_score ?? "");
    const numericMatch =
      claimedNums.length === 0 || detectedNums.length === 0
        ? null
        : claimedNums.every((n) => detectedNums.includes(n));

    const autoApprove =
      output.matches_claim &&
      output.subject_relevant &&
      output.looks_authentic &&
      output.confidence >= 0.8 &&
      output.red_flags.length === 0 &&
      output.tampering_signals.length === 0 &&
      !!output.detected_score &&
      numericMatch !== false;

    const finalVerdict = {
      ...output,
      numeric_cross_check: numericMatch,
      red_flags:
        numericMatch === false
          ? [...output.red_flags, `Claimed "${claimed}" not found in the document`]
          : output.red_flags,
    };

    const { data: row, error } = await supabase
      .from("tutor_verifications")
      .insert({
        user_id: userId,
        kind: data.kind,
        subject: data.subject,
        exam: data.exam ?? null,
        claimed_score: data.claimedScore ?? null,
        proof_path: data.proofUrl,
        ai_verdict: finalVerdict as never,
        ai_confidence: output.confidence,
        status: autoApprove ? "approved" : "pending",
      })
      .select("id, status")
      .single();
    if (error) throw new Error(error.message);

    return { id: row.id, status: row.status as string, verdict: finalVerdict };
  });
