import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SessionInput = z.object({
  sessionId: z.string().uuid(),
  displayName: z.string().min(1).max(60),
});

const CommunityInput = z.object({
  channelId: z.string().uuid(),
  displayName: z.string().min(1).max(60),
});

const BreakoutInput = z.object({
  sessionId: z.string().uuid(),
  breakoutId: z.string().uuid(),
  displayName: z.string().min(1).max(60),
});

function readEnv() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!url || !apiKey || !apiSecret) {
    return {
      configured: false as const,
      message:
        "Live audio/video isn't configured yet. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET as Cloud secrets.",
    };
  }
  return { configured: true as const, url, apiKey, apiSecret };
}

async function mintToken(opts: {
  apiKey: string;
  apiSecret: string;
  identity: string;
  displayName: string;
  room: string;
  canPublishSources?: string[];
}) {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(opts.apiSecret);
  return await new SignJWT({
    name: opts.displayName,
    video: {
      room: opts.room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      ...(opts.canPublishSources ? { canPublishSources: opts.canPublishSources } : {}),
    },
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(opts.apiKey)
    .setSubject(opts.identity)
    .setNotBefore(0)
    .setExpirationTime("6h")
    .sign(secret);
}

export const getLiveKitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SessionInput.parse(input))
  .handler(async ({ data, context }) => {
    const env = readEnv();
    if (!env.configured) return env;

    const { supabase, userId } = context;
    const { data: session, error: sessionErr } = await supabase
      .from("sessions")
      .select("id, tutor_id, meeting_room_name, locked")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (sessionErr || !session) throw new Error("Session not found");

    const isTutor = session.tutor_id === userId;
    if (!isTutor) {
      const { data: participant } = await supabase
        .from("session_participants")
        .select("id")
        .eq("session_id", data.sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!participant) throw new Error("Join the session before entering the room.");
      if (session.locked) throw new Error("This session is locked. No new entries.");
    }

    const token = await mintToken({
      apiKey: env.apiKey,
      apiSecret: env.apiSecret,
      identity: userId,
      displayName: data.displayName,
      room: session.meeting_room_name,
    });

    return { configured: true as const, token, url: env.url, room: session.meeting_room_name, isTutor };
  });

export const getCommunityVoiceToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CommunityInput.parse(input))
  .handler(async ({ data, context }) => {
    const env = readEnv();
    if (!env.configured) return env;

    const { supabase, userId } = context;

    const { data: channel, error: chErr } = await supabase
      .from("community_channels")
      .select("id, community_id, kind, name")
      .eq("id", data.channelId)
      .maybeSingle();
    if (chErr || !channel) throw new Error("Voice channel not found");
    if (channel.kind !== "voice") throw new Error("Not a voice channel");

    const { data: member } = await supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", channel.community_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!member) throw new Error("Join the community to enter voice.");

    const room = `community-${channel.id}`;
    const token = await mintToken({
      apiKey: env.apiKey,
      apiSecret: env.apiSecret,
      identity: userId,
      displayName: data.displayName,
      room,
      // audio-only channel — restrict publishable sources
      canPublishSources: ["microphone"],
    });

    return { configured: true as const, token, url: env.url, room };
  });

export const getBreakoutToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BreakoutInput.parse(input))
  .handler(async ({ data, context }) => {
    const env = readEnv();
    if (!env.configured) return env;

    const { supabase, userId } = context;

    const { data: breakout, error: bErr } = await supabase
      .from("session_breakouts")
      .select("id, session_id, name, closed")
      .eq("id", data.breakoutId)
      .eq("session_id", data.sessionId)
      .maybeSingle();
    if (bErr || !breakout) throw new Error("Breakout not found");
    if (breakout.closed) throw new Error("This breakout is closed.");

    const { data: session } = await supabase
      .from("sessions")
      .select("tutor_id")
      .eq("id", data.sessionId)
      .maybeSingle();
    const isTutor = session?.tutor_id === userId;

    if (!isTutor) {
      const { data: assign } = await supabase
        .from("session_breakout_assignments")
        .select("user_id")
        .eq("breakout_id", data.breakoutId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!assign) throw new Error("You are not assigned to this breakout.");
    }

    const room = `session-${data.sessionId}-breakout-${data.breakoutId}`;
    const token = await mintToken({
      apiKey: env.apiKey,
      apiSecret: env.apiSecret,
      identity: userId,
      displayName: data.displayName,
      room,
    });
    return { configured: true as const, token, url: env.url, room };
  });
