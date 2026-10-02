import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, VideoOff, AlertTriangle } from "lucide-react";
import { getLiveKitToken, getBreakoutToken } from "@/lib/livekit.functions";
import { LiveStage, RoomControls, LIVE_ROOM_OPTIONS } from "@/components/live/LiveStage";

export function LiveVideoRoom({
  sessionId,
  displayName,
  lowBandwidth,
  breakoutId,
  onLeave,
}: {
  sessionId: string;
  displayName: string;
  lowBandwidth: boolean;
  breakoutId?: string | null;
  onLeave?: () => void;
}) {
  const fetchToken = useServerFn(getLiveKitToken);
  const fetchBreakoutToken = useServerFn(getBreakoutToken);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "missing"; message: string }
    | { kind: "error"; message: string }
    | { kind: "ready"; token: string; url: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ kind: "loading" });
    const p = breakoutId
      ? fetchBreakoutToken({ data: { sessionId, breakoutId, displayName } })
      : fetchToken({ data: { sessionId, displayName } });
    p.then((res) => {
      if (cancelled) return;
      if (!res.configured) setState({ kind: "missing", message: res.message });
      else setState({ kind: "ready", token: res.token, url: res.url });
    }).catch((err: unknown) => {
      if (cancelled) return;
      setState({ kind: "error", message: err instanceof Error ? err.message : "Couldn't connect to video" });
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, displayName, fetchToken, fetchBreakoutToken, breakoutId]);

  if (state.kind === "loading") {
    return (
      <div className="grid h-full min-h-[300px] place-items-center rounded-2xl bg-card">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Connecting to live room…</span>
        </div>
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <div>
          <VideoOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">Live video not yet enabled</h3>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="grid h-full min-h-[300px] place-items-center rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm text-destructive">{state.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl" data-lk-theme="default">
      <LiveKitRoom
        key={breakoutId ?? "main"}
        serverUrl={state.url}
        token={state.token}
        connect
        video={!lowBandwidth}
        audio
        options={LIVE_ROOM_OPTIONS}
        style={{ height: "100%", minHeight: 400, display: "flex", flexDirection: "column" }}
      >
        <div className="min-h-[320px] flex-1">
          <LiveStage />
        </div>
        <RoomControls onLeave={onLeave} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
