import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  AlertTriangle,
  VideoOff,
  Video as VideoIcon,
  MonitorUp,
  MonitorX,
} from "lucide-react";
import { toast } from "sonner";
import { getCommunityVoiceToken } from "@/lib/livekit.functions";
import { Button } from "@/components/ui/button";

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
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <div className="flex items-center justify-between border-b border-border/50 px-3 py-2 text-sm font-semibold">
          <span className="flex items-center gap-1.5">
            <VideoIcon className="h-4 w-4 text-primary" /> {channelName}
          </span>
        </div>
        <div className="flex-1 min-h-[280px] [&_.lk-control-bar]:hidden">
          <VideoConference />
        </div>
        <RoomControls onLeave={onLeave} />
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

function RoomControls({ onLeave }: { onLeave: () => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!localParticipant) return;
    setMicOn(localParticipant.isMicrophoneEnabled);
    setCamOn(localParticipant.isCameraEnabled);
    setSharing(localParticipant.isScreenShareEnabled);
  }, [localParticipant]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    const next = !micOn;
    await localParticipant.setMicrophoneEnabled(next);
    setMicOn(next);
  };

  const toggleCam = async () => {
    if (!localParticipant) return;
    const next = !camOn;
    await localParticipant.setCameraEnabled(next);
    setCamOn(next);
  };

  const toggleShare = async () => {
    if (!localParticipant) return;
    const next = !sharing;
    try {
      await localParticipant.setScreenShareEnabled(next, { audio: true });
      setSharing(next);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Screen share failed";
      if (/abort|cancel/i.test(msg)) toast.info("Screen share cancelled.");
      else {
        toast.error(
          "Your browser blocked the screen picker. Try opening this page in its own tab.",
          {
            action: {
              label: "Open in new tab",
              onClick: () => window.open(window.location.href, "_blank", "noopener"),
            },
          },
        );
      }
      setSharing(localParticipant.isScreenShareEnabled);
    }
  };

  const leave = async () => {
    setLeaving(true);
    try {
      await room.disconnect(true);
    } catch {
      /* already gone */
    } finally {
      setLeaving(false);
      onLeave();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-card/80 px-3 py-2 backdrop-blur">
      <Button
        size="sm"
        variant={micOn ? "outline" : "secondary"}
        className="rounded-full"
        onClick={toggleMic}
      >
        {micOn ? (
          <Mic className="mr-1 h-3.5 w-3.5" />
        ) : (
          <MicOff className="mr-1 h-3.5 w-3.5 text-destructive" />
        )}
        {micOn ? "Mic on" : "Mic off"}
      </Button>
      <Button
        size="sm"
        variant={camOn ? "outline" : "secondary"}
        className="rounded-full"
        onClick={toggleCam}
      >
        {camOn ? (
          <VideoIcon className="mr-1 h-3.5 w-3.5" />
        ) : (
          <VideoOff className="mr-1 h-3.5 w-3.5 text-destructive" />
        )}
        {camOn ? "Camera on" : "Camera off"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={`rounded-full ${sharing ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
        onClick={toggleShare}
      >
        {sharing ? (
          <MonitorX className="mr-1 h-3.5 w-3.5" />
        ) : (
          <MonitorUp className="mr-1 h-3.5 w-3.5" />
        )}
        {sharing ? "Stop sharing" : "Share screen"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="ml-auto rounded-full"
        onClick={leave}
        disabled={leaving}
      >
        {leaving ? (
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
        ) : (
          <PhoneOff className="mr-1 h-3.5 w-3.5" />
        )}
        Leave
      </Button>
    </div>
  );
}
