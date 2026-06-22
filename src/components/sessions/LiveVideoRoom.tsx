import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, VideoOff, AlertTriangle } from "lucide-react";
import { getLiveKitToken } from "@/lib/livekit.functions";

export function LiveVideoRoom({
  sessionId,
  displayName,
  lowBandwidth,
}: {
  sessionId: string;
  displayName: string;
  lowBandwidth: boolean;
}) {
  const fetchToken = useServerFn(getLiveKitToken);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "missing"; message: string }
    | { kind: "error"; message: string }
    | { kind: "ready"; token: string; url: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchToken({ data: { sessionId, displayName } })
      .then((res) => {
        if (cancelled) return;
        if (!res.configured) {
          setState({ kind: "missing", message: res.message });
        } else {
          setState({ kind: "ready", token: res.token, url: res.url });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Couldn't connect to video";
        setState({ kind: "error", message: msg });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, displayName, fetchToken]);

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
    <div className="h-full overflow-hidden rounded-2xl" data-lk-theme="default">
      <LiveKitRoom
        serverUrl={state.url}
        token={state.token}
        connect
        video={!lowBandwidth}
        audio
        data-lk-theme="default"
        style={{ height: "100%", minHeight: 400 }}
      >
        <VideoConference />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
