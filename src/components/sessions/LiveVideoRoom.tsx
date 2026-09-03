import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRoomContext,
  useLocalParticipant,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  Loader2, VideoOff, AlertTriangle, MonitorUp, MonitorX, Mic, MicOff,
  Video as VideoIcon, PhoneOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getLiveKitToken, getBreakoutToken } from "@/lib/livekit.functions";

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
      if (!res.configured) {
        setState({ kind: "missing", message: res.message });
      } else {
        setState({ kind: "ready", token: res.token, url: res.url });
      }
    }).catch((err: unknown) => {
      if (cancelled) return;
      const msg = err instanceof Error ? err.message : "Couldn't connect to video";
      setState({ kind: "error", message: msg });
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
        data-lk-theme="default"
        style={{ height: "100%", minHeight: 400, display: "flex", flexDirection: "column" }}
      >
        <RoomControls onLeave={onLeave} />
        <div className="flex-1 min-h-[320px]">
          <VideoConference />
        </div>
        <RoomAudioRenderer />
      </LiveKitRoom>
    </div>
  );
}

/** Explicit mic / camera / screen-share / leave controls — always visible. */
function RoomControls({ onLeave }: { onLeave?: () => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [sharing, setSharing] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
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

  /** True when the page is embedded and the embed doesn't allow display-capture. */
  const shareBlockedByEmbed = () => {
    if (typeof window === "undefined") return false;
    const embedded = window.self !== window.top;
    if (!embedded) return false;
    const fp = (document as unknown as { featurePolicy?: { allowsFeature: (f: string) => boolean } }).featurePolicy;
    if (fp?.allowsFeature) return !fp.allowsFeature("display-capture");
    return true; // can't prove it's allowed while embedded
  };

  const toggleShare = async () => {
    if (!localParticipant) return;
    const next = !sharing;
    if (next && typeof navigator !== "undefined" && !navigator.mediaDevices?.getDisplayMedia) {
      toast.error("This browser can't share a screen. Use desktop Chrome, Edge or Safari — mobile browsers don't support it.");
      return;
    }
    if (next && shareBlockedByEmbed()) {
      toast.error("Screen sharing is blocked inside this embedded preview. Open the room in its own tab, then share.", {
        action: { label: "Open in new tab", onClick: () => window.open(window.location.href, "_blank", "noopener") },
        duration: 8000,
      });
      return;
    }
    try {
      await localParticipant.setScreenShareEnabled(next, { audio: true });
      setSharing(next);
      if (next) toast.success("You're sharing your screen");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Screen share failed";
      if (/permission|denied|disallowed|NotAllowed/i.test(msg)) {
        toast.error("Your browser blocked the screen picker. If you're in the embedded preview, open the room in its own tab.", {
          action: { label: "Open in new tab", onClick: () => window.open(window.location.href, "_blank", "noopener") },
          duration: 8000,
        });
      } else if (/abort/i.test(msg)) {
        toast.info("Screen share cancelled.");
      } else {
        toast.error(msg);
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
      onLeave?.();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 bg-card/80 px-3 py-2 backdrop-blur">
      <Button size="sm" variant={micOn ? "outline" : "secondary"} className="rounded-full" onClick={toggleMic}>
        {micOn ? <Mic className="mr-1 h-3.5 w-3.5" /> : <MicOff className="mr-1 h-3.5 w-3.5 text-destructive" />}
        {micOn ? "Mic on" : "Mic off"}
      </Button>
      <Button size="sm" variant={camOn ? "outline" : "secondary"} className="rounded-full" onClick={toggleCam}>
        {camOn ? <VideoIcon className="mr-1 h-3.5 w-3.5" /> : <VideoOff className="mr-1 h-3.5 w-3.5 text-destructive" />}
        {camOn ? "Camera on" : "Camera off"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={`rounded-full ${sharing ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90" : "bg-background text-foreground"}`}
        onClick={toggleShare}
      >
        {sharing ? <MonitorX className="mr-1 h-3.5 w-3.5" /> : <MonitorUp className="mr-1 h-3.5 w-3.5" />}
        {sharing ? "Stop sharing" : "Share screen"}
      </Button>

      <Button size="sm" variant="destructive" className="ml-auto rounded-full" onClick={leave} disabled={leaving}>
        {leaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <PhoneOff className="mr-1 h-3.5 w-3.5" />}
        Leave
      </Button>
    </div>
  );
}
