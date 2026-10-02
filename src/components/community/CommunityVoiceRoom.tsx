import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";
import { Loader2, AlertTriangle, VideoOff, Video as VideoIcon } from "lucide-react";
import { getCommunityVoiceToken } from "@/lib/livekit.functions";
import { Button } from "@/components/ui/button";
import { LiveStage, RoomControls, LIVE_ROOM_OPTIONS } from "@/components/live/LiveStage";

/**
 * Community video room: camera + mic + screen share for a channel.
 * One control bar only — LiveKit's built-in bar is hidden.
 */
export function CommunityVoiceRoom({
  channelId,
  channelName,
  displayName,
  onLeave,
}: {
  channelId: string;
  channelName: string;
  displayName: string;
  onLeave: () => void;
}) {
  const fetchToken = useServerFn(getCommunityVoiceToken);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "missing"; message: string }
    | { kind: "error"; message: string }
    | { kind: "ready"; token: string; url: string }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchToken({ data: { channelId, displayName } })
      .then((res) => {
        if (cancelled) return;
        if (!res.configured) setState({ kind: "missing", message: res.message });
        else setState({ kind: "ready", token: res.token, url: res.url });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Couldn't connect to the video room",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, displayName, fetchToken]);

  if (state.kind === "loading") {
    return (
      <div className="grid h-full min-h-[300px] place-items-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">Joining {channelName}…</span>
        </div>
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="grid h-full min-h-[300px] place-items-center p-6 text-center">
        <div>
          <VideoOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">Live video not yet enabled</h3>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={onLeave}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="grid h-full min-h-[300px] place-items-center p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <p className="mt-3 text-sm text-destructive">{state.message}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={onLeave}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-2xl"
      data-lk-theme="default"
    >
      <LiveKitRoom
        serverUrl={state.url}
        token={state.token}
        connect
        video
        audio
        options={LIVE_ROOM_OPTIONS}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2 text-sm font-semibold">
          <span className="flex items-center gap-1.5">
            <VideoIcon className="h-4 w-4 text-primary" /> {channelName}
          </span>
        </div>
        <div className="min-h-[280px] flex-1">
          <LiveStage />
        </div>
        <RoomControls onLeave={onLeave} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}
