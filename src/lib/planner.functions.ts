import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";

const PlanInput = z.object({
  goals: z.string().max(600).optional(),
  subjects: z.array(z.string().max(40)).max(8).optional(),
  topics: z.array(z.string().max(80)).max(15).optional(),
  weakAreas: z.string().max(400).optional(),
  deadlines: z.string().max(300).optional(),
  style: z.enum(["visual", "practice", "reading", "mixed"]).default("mixed"),
  sessionLength: z.number().int().min(15).max(120).default(45),
  hoursPerWeek: z.number().int().min(1).max(40).default(5),
  daysAvailable: z.array(z.string()).max(7).optional(),
});

const DayBlockSchema = z.object({
  time: z.string().describe("Human time slot e.g. '30 min' or '45 min block'"),
  task: z.string().describe("What exactly to do — concrete, not vague"),
  technique: z.string().describe("Study technique: active recall, spaced retrieval, practice problems, Feynman, past-paper, flashcards, worked example, timed drill, mind map"),
  resource_hint: z.string().nullable().describe("Search query for a resource (YouTube/Khan/textbook chapter). Null if none."),
}).describe("One focused study block within a day");

const DaySchema = z.object({
  day: z.string().describe("Weekday name e.g. Monday"),
  theme: z.string().describe("The umbrella focus for this day"),
  total_minutes: z.number().int(),
  blocks: z.array(DayBlockSchema).max(5),
  reflection_prompt: z.string().describe("A one-line self-check question for end of day"),
});

const PlanSchema = z.object({
  title: z.string(),
  overview: z.string().describe("2-3 sentences framing the week"),
  weekly_theme: z.string().describe("The one big idea binding the week together"),
  milestones: z.array(z.string()).max(4).describe("Concrete checkpoints: 'By Wed, solve 15 quadratics unaided'"),
  days: z.array(DaySchema).max(7),
  study_techniques: z.array(z.object({
    name: z.string(),
    why: z.string().describe("Why this technique fits this learner right now"),
  })).max(4),
  resources: z.array(z.object({
    label: z.string(),
    search_query: z.string(),
    kind: z.string().describe("video | article | practice-set | textbook"),
  })).max(6),
  tutor_topics: z.array(z.string()).max(5).describe("Specific topics to book a tutor for — used for matching"),
  tips: z.array(z.string()).max(5),
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

    // Pull last plan's incomplete tasks + recent session history for continuity
    const { data: lastPlan } = await supabase
      .from("study_plans")
      .select("plan, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: recentReflections } = await supabase
      .from("session_reflections")
      .select("learned, rating, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);

    const interests = data.subjects?.length ? data.subjects : (profile?.interests ?? []);
    const goals = data.goals?.trim() || profile?.goals || "improve overall academic skills";
    const daysAvailable = data.daysAvailable?.length ? data.daysAvailable : ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const totalMinutes = data.hoursPerWeek * 60;
    const minutesPerDay = Math.round(totalMinutes / Math.max(daysAvailable.length, 1));

    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const styleGuide = {
      visual: "Prefer diagrams, mind maps, video walkthroughs, and worked examples visualized step-by-step.",
      practice: "Front-load problem sets, timed drills, and past-paper questions; keep reading short and targeted.",
      reading: "Use textbook sections and articles first, then verify with 2–3 practice questions per block.",
      mixed: "Alternate a short concept-input block (video/reading) with an active-recall or problem block.",
    }[data.style];

    const prompt = `You are a rigorous, warm study coach designing a realistic 7-day plan for a learner on a peer-tutoring platform.

## Learner profile
- Name: ${profile?.display_name ?? "student"}
- Age / grade: ${profile?.age ?? "?"} / ${profile?.grade ?? "?"}
- Broader interests: ${(profile?.interests ?? []).join(", ") || "none listed"}
- Long-term goals: ${profile?.goals ?? "n/a"}

## This week's brief
- Goals this week: ${goals}
- Subjects to cover: ${interests.join(", ") || "learner's choice"}
- Specific topics/chapters: ${data.topics?.join("; ") || "not specified — infer sensible ones from subjects"}
- Weak areas / stuck on: ${data.weakAreas || "not specified"}
- Upcoming deadlines: ${data.deadlines || "none specified"}
- Preferred learning style: ${data.style} — ${styleGuide}
- Available days: ${daysAvailable.join(", ")}
- Time budget: ${data.hoursPerWeek}h/week ≈ ${minutesPerDay} min per available day
- Preferred block length: ~${data.sessionLength} min

## Continuity
${lastPlan ? `- Previous plan title: "${(lastPlan.plan as { title?: string } | null)?.title ?? "n/a"}" (from ${lastPlan.created_at?.slice(0,10)}). If topics look unfinished, carry them forward as review — do NOT repeat everything.` : "- First plan — treat as a fresh baseline."}
${recentReflections?.length ? `- Recent session reflections: ${recentReflections.map(r => `"${r.learned}" (${r.rating ?? "?"}★)`).join("; ")}` : ""}

## Design rules — follow strictly
1. Be **specific**: never say "study math" — say "Trigonometry: prove sin²+cos²=1 and solve 6 identity questions".
2. Use **evidence-based techniques**: active recall, spaced retrieval, interleaving, worked examples, past-paper practice, Feynman explain-back, timed drills. Name the technique in every block.
3. **Realistic pacing**: split each day into ${Math.max(1, Math.round(minutesPerDay/data.sessionLength))}–${Math.max(2, Math.round(minutesPerDay/data.sessionLength)+1)} blocks of ~${data.sessionLength} min. Total should roughly match the day's budget. No 4-hour blocks. Include short breaks in the reflection_prompt where relevant.
4. **Interleave**: don't hammer one subject 3 days straight — mix with retrieval days.
5. **Milestones**: 3–4 concrete, testable checkpoints across the week (e.g. "By Friday, complete 20 practice quadratics with ≥80% accuracy").
6. **Resource hints**: for blocks that need external material, give a precise search query — not "watch a video".
7. **Tutor topics**: extract 3–5 specific topics the learner should book a peer tutor for (used for matching).
8. **Weekend**: lighter — spaced review + one stretch/challenge task, unless deadlines demand otherwise.
9. Skip days not in Available days. Days array should only contain available days.
10. Tone: warm, direct, Gen-Z-friendly but not cringe. No emojis in day themes or tasks (tips can have 1).`;

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({ schema: PlanSchema }),
        prompt,
      });

      const weekOf = new Date();
      weekOf.setDate(weekOf.getDate() - weekOf.getDay());
      const week = weekOf.toISOString().slice(0, 10);

      await supabase.from("study_plans").insert({
        user_id: userId,
        title: output.title,
        plan: output as never,
        week_of: week,
      });

      return output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("The planner had trouble structuring the plan. Try again with slightly different inputs.");
      }
      throw error;
    }
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

    // Pull tutor_topics from latest plan for smarter matching
    const { data: latestPlan } = await supabase
      .from("study_plans")
      .select("plan")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planTopics = ((latestPlan?.plan as { tutor_topics?: string[] } | null)?.tutor_topics ?? []).map(t => t.toLowerCase());
    const interests = me?.interests ?? [];
    const signals = [...interests.map(i => i.toLowerCase()), ...planTopics];

    const { data: tutors } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, avg_rating, free_sessions_taught, interests, headline, bio")
      .eq("role", "tutor")
      .neq("id", userId)
      .order("avg_rating", { ascending: false })
      .limit(60);

    const scored = (tutors ?? [])
      .map((t) => {
        const tInterests = (t.interests ?? []).map((x: string) => x.toLowerCase());
        const overlap = tInterests.filter((x: string) => signals.includes(x)).length;
        const bioMatch = signals.filter(s => (t.bio ?? "").toLowerCase().includes(s) || (t.headline ?? "").toLowerCase().includes(s)).length;
        const score = overlap * 3 + bioMatch * 2 + Number(t.avg_rating ?? 0) + Math.min(t.free_sessions_taught ?? 0, 10) * 0.1;
        return { ...t, _overlap: overlap, _score: score };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, data.limit);

    return scored;
  });
