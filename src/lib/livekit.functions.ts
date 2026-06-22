import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  sessionId: z.string().uuid(),
  displayName: z.string().min(1).max(60),
});

export const getLiveKitToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const url = process.env.LIVEKIT_URL;
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!url || !apiKey || !apiSecret) {
      return {
        configured: false as const,
        message:
          "Live video isn't configured yet. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET as Cloud secrets.",
      };
    }

    const { supabase, userId } = context;

    // Authorize: must be tutor or participant
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

    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(apiSecret);

    const token = await new SignJWT({
      name: data.displayName,
      video: {
        room: session.meeting_room_name,
        roomJoin: true,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      },
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(apiKey)
      .setSubject(userId)
      .setNotBefore(0)
      .setExpirationTime("6h")
      .sign(secret);

    return {
      configured: true as const,
      token,
      url,
      room: session.meeting_room_name,
      isTutor,
    };
  });
