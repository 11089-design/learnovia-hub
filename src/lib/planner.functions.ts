import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";

const PlanInput = z.object({
  goals: z.string().max(500).optional(),
  interests: z.array(z.string()).max(12).optional(),
  hoursPerWeek: z.number().int().min(1).max(60).default(5),
});

export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, age, grade, interests, goals, role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role !== "learner") throw new Error("Only learners can use the study planner");

    const interests = data.interests?.length ? data.interests : (profile?.interests ?? []);
    const goals = data.goals?.trim() || profile?.goals || "improve overall academic skills";

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({
        schema: z.object({
          title: z.string(),
          overview: z.string(),
          days: z.array(z.object({
            day: z.string(),
            focus: z.string(),
            tasks: z.array(z.string()).max(5),
            minutes: z.number().int(),
          })).max(7),
          tips: z.array(z.string()).max(5),
        }),
      }),
      prompt: `Create a friendly 7-day study plan for a peer-learning platform user.

Learner:
- Name: ${profile?.display_name ?? "student"}
- Age: ${profile?.age ?? "?"}
- Grade: ${profile?.grade ?? "?"}
- Interests: ${interests.join(", ") || "(none listed)"}
- Goals: ${goals}
- Weekly time: ${data.hoursPerWeek} hours

Return a plan with:
- title: short punchy title
- overview: 1-2 sentence intro
- days: 5-7 daily blocks (Monday..Sunday). Each has focus, up to 5 concrete tasks, and estimated minutes.
- tips: up to 5 short motivational tips for consistency.

Keep tone warm, Gen-Z friendly, concrete. No fluff.`,
    });

    const weekOf = new Date();
    weekOf.setDate(weekOf.getDate() - weekOf.getDay());
    const week = weekOf.toISOString().slice(0, 10);

    await supabase.from("study_plans").insert({
      user_id: userId,
      title: output.title,
      plan: output as unknown as object,
      week_of: week,
    });

    return output;
  });

const MatchInput = z.object({ limit: z.number().int().min(1).max(20).default(6) });

export const recommendTutors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MatchInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: me } = await supabase
      .from("profiles")
      .select("interests, goals")
      .eq("id", userId)
      .maybeSingle();

    const interests = me?.interests ?? [];
    // Naive matching: tutors whose interests overlap, ordered by rating + sessions taught
    const { data: tutors } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, avg_rating, free_sessions_taught, interests, headline, bio")
      .eq("role", "tutor")
      .neq("id", userId)
      .order("avg_rating", { ascending: false })
      .limit(50);

    const scored = (tutors ?? [])
      .map((t) => {
        const overlap = (t.interests ?? []).filter((x: string) => interests.includes(x)).length;
        const score = overlap * 3 + Number(t.avg_rating ?? 0) + Math.min(t.free_sessions_taught ?? 0, 10) * 0.1;
        return { ...t, _overlap: overlap, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, data.limit);

    return scored;
  });
