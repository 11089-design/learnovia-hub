import { useEffect, useMemo, useState } from "react";
import {
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  VideoTrack,
  isTrackReference,
  useLocalParticipant,
  useRoomContext,
  useTracks,
  type TrackReference,
} from "@livekit/components-react";
import {
  ParticipantEvent,
  type RemoteTrackPublication,
  RoomEvent,
  ScreenSharePresets,
  Track,
  VideoQuality,
  type RemoteParticipant,
  type RoomOptions,
} from "livekit-client";
import {
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  PhoneOff,
  Video as VideoIcon,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Room options shared by every Learnova video room. */
export const LIVE_ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: { pixelDensity: "screen" },
  dynacast: true,
  publishDefaults: {
    screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
    screenShareSimulcastLayers: [ScreenSharePresets.h720fps5],
  },
};

/**
 * Presenter-first stage. Any screen share (yours or someone else's) is shown
 * large on top; cameras move to a strip underneath. With no share, cameras
 * fill a grid.
 */
export function LiveStage() {
  const room = useRoomContext();
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const screens = useMemo(
    () =>
      tracks.filter(
        (t): t is TrackReference =>
          isTrackReference(t) &&
          t.publication.source === Track.Source.ScreenShare &&
          !t.publication.isMuted,
      ),
    [tracks],
  );
  const cameras = useMemo(
    () => tracks.filter((t) => t.source === Track.Source.Camera),
    [tracks],
  );

  const [selected, setSelected] = useState<string | null>(null);
  const active =
    screens.find((s) => s.participant.identity === selected) ?? screens[screens.length - 1] ?? null;

  // Make sure every incoming screen share is subscribed and streamed at full quality.
  useEffect(() => {
    const boost = (pub: RemoteTrackPublication) => {
      if (pub.source !== Track.Source.ScreenShare && pub.source !== Track.Source.ScreenShareAudio) return;
      if (!pub.isSubscribed) pub.setSubscribed(true);
      if (pub.source === Track.Source.ScreenShare) pub.setVideoQuality(VideoQuality.HIGH);
    };
    const onPublished = (pub: RemoteTrackPublication, p: RemoteParticipant) => {
      boost(pub);
      if (pub.source === Track.Source.ScreenShare) {
        toast.info(`${p.name || "Someone"} is sharing their screen`);
      }
    };
    const onSubscribed = (_t: unknown, pub: RemoteTrackPublication) => boost(pub);

    room.remoteParticipants.forEach((p) => p.trackPublications.forEach((pub) => boost(pub)));
    room.on(RoomEvent.TrackPublished, onPublished);
    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    return () => {
      room.off(RoomEvent.TrackPublished, onPublished);
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
    };
  }, [room]);

  return (
    <LayoutContextProvider>
      {active ? (
        <div className="flex h-full min-h-0 flex-col gap-2 p-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-background/80 ring-1 ring-border/50">
            <VideoTrack
              trackRef={active}
              className="h-full w-full object-contain"
              style={{ objectFit: "contain" }}
            />
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-card/85 px-3 py-1 text-xs font-semibold backdrop-blur">
              <MonitorUp className="h-3.5 w-3.5 text-primary" />
              {active.participant.isLocal
                ? "You're presenting"
                : `${active.participant.name || "Someone"} is presenting`}
            </div>
            {screens.length > 1 && (
              <div className="absolute right-3 top-3 flex gap-1">
                {screens.map((s) => (
                  <button
                    key={s.participant.identity}
                    onClick={() => setSelected(s.participant.identity)}
                    className={`rounded-full px-2.5 py-1 text-xs backdrop-blur ${
                      s === active ? "bg-primary text-primary-foreground" : "bg-card/85"
                    }`}
                  >
                    {s.participant.isLocal ? "You" : s.participant.name || "Guest"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex h-28 shrink-0 gap-2 overflow-x-auto">
            {cameras.map((t) => (
              <div
                key={`${t.participant.identity}-${t.source}`}
                className="h-full w-44 shrink-0 overflow-hidden rounded-lg"
              >
                <ParticipantTile trackRef={t} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <GridLayout tracks={cameras} style={{ height: "100%" }}>
          <ParticipantTile />
        </GridLayout>
      )}
    </LayoutContextProvider>
  );
}

function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Single bottom control bar: mic, camera, screen share (+ tab audio), leave. */
export function RoomControls({ onLeave }: { onLeave?: () => void }) {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [shareAudio, setShareAudio] = useState(true);
  const [shareBusy, setShareBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!localParticipant) return;
    const sync = () => {
      setMicOn(localParticipant.isMicrophoneEnabled);
      setCamOn(localParticipant.isCameraEnabled);
      setSharing(localParticipant.isScreenShareEnabled);
    };
    sync();
    const events = [
      ParticipantEvent.LocalTrackPublished,
      ParticipantEvent.LocalTrackUnpublished,
      ParticipantEvent.TrackMuted,
      ParticipantEvent.TrackUnmuted,
    ] as const;
    events.forEach((e) => localParticipant.on(e, sync));
    return () => events.forEach((e) => localParticipant.off(e, sync));
  }, [localParticipant]);

  const toggleMic = async () => {
    try {
      await localParticipant.setMicrophoneEnabled(!micOn);
    } catch {
      toast.error("Couldn't reach your microphone. Check your browser permissions.");
    }
    setMicOn(localParticipant.isMicrophoneEnabled);
  };

  const toggleCam = async () => {
    try {
      await localParticipant.setCameraEnabled(!camOn);
    } catch {
      toast.error("Couldn't reach your camera. Check your browser permissions.");
    }
    setCamOn(localParticipant.isCameraEnabled);
  };

  const openFullTab = () => window.open(window.location.href, "_blank", "noopener");

  const startShare = async (withAudio: boolean) =>
    localParticipant.setScreenShareEnabled(
      true,
      {
        audio: withAudio,
        video: { displaySurface: "monitor" },
        contentHint: "text",
        selfBrowserSurface: "exclude",
        surfaceSwitching: "include",
        systemAudio: withAudio ? "include" : "exclude",
      },
      {
        screenShareEncoding: ScreenSharePresets.h1080fps15.encoding,
        screenShareSimulcastLayers: [ScreenSharePresets.h720fps5],
      },
    );

  const toggleShare = async () => {
    if (shareBusy) return;
    if (sharing) {
      setShareBusy(true);
      try {
        await localParticipant.setScreenShareEnabled(false);
      } finally {
        setSharing(localParticipant.isScreenShareEnabled);
        setShareBusy(false);
      }
      return;
    }

    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Screen sharing needs a desktop browser (Chrome, Edge, Firefox or Safari).");
      return;
    }

    setShareBusy(true);
    try {
      let pub;
      try {
        pub = await startShare(shareAudio);
      } catch (err) {
        // Some browsers reject audio capture — retry video-only.
        const name = err instanceof Error ? err.name : "";
        if (shareAudio && (name === "TypeError" || name === "NotSupportedError" || name === "OverconstrainedError")) {
          pub = await startShare(false);
        } else {
          throw err;
        }
      }
      const ok = pub?.source === Track.Source.ScreenShare || localParticipant.isScreenShareEnabled;
      setSharing(ok);
      if (ok) {
        const audioPub = localParticipant.getTrackPublication(Track.Source.ScreenShareAudio);
        toast.success(
          shareAudio && !audioPub
            ? "You're presenting (this window has no sound to share)"
            : "You're presenting — everyone can see your screen",
        );
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const msg = err instanceof Error ? err.message : "";
      if (name === "AbortError" || /cancel|abort|dismiss/i.test(msg)) {
        toast.info("Screen share cancelled.");
      } else if (isEmbedded()) {
        // The preview frame won't open the screen picker — continue in a full tab.
        const w = openFullTab();
        toast.info(
          w
            ? "Opened the room in its own tab — press Share screen there to present."
            : "Open the room in its own tab to present your screen.",
          { action: { label: "Open room", onClick: openFullTab }, duration: 10000 },
        );
      } else if (name === "NotAllowedError" || /permission|denied/i.test(msg)) {
        toast.error(
          "Screen sharing is blocked. Allow screen recording for your browser in your computer's privacy settings, then try again.",
          { duration: 10000 },
        );
      } else {
        toast.error(msg || "Screen share failed. Please try again.");
      }
      setSharing(localParticipant.isScreenShareEnabled);
    } finally {
      setShareBusy(false);
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
    <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-card/80 px-3 py-2 backdrop-blur">
      <Button size="sm" variant={micOn ? "outline" : "secondary"} className="rounded-full" onClick={toggleMic}>
        {micOn ? <Mic className="mr-1 h-3.5 w-3.5" /> : <MicOff className="mr-1 h-3.5 w-3.5 text-destructive" />}
        {micOn ? "Mic on" : "Mic off"}
      </Button>
      <Button size="sm" variant={camOn ? "outline" : "secondary"} className="rounded-full" onClick={toggleCam}>
        {camOn ? <VideoIcon className="mr-1 h-3.5 w-3.5" /> : <VideoOff className="mr-1 h-3.5 w-3.5 text-destructive" />}
        {camOn ? "Camera on" : "Camera off"}
      </Button>
      <div className="flex items-center">
        <Button
          size="sm"
          variant={sharing ? "default" : "outline"}
          className="rounded-l-full rounded-r-none"
          onClick={toggleShare}
          disabled={shareBusy}
        >
          {shareBusy ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : sharing ? (
            <MonitorX className="mr-1 h-3.5 w-3.5" />
          ) : (
            <MonitorUp className="mr-1 h-3.5 w-3.5" />
          )}
          {shareBusy ? "Starting…" : sharing ? "Stop sharing" : "Share screen"}
        </Button>
        <Button
          size="sm"
          variant={sharing ? "default" : "outline"}
          className="rounded-l-none rounded-r-full border-l-0 px-2"
          onClick={() => setShareAudio((v) => !v)}
          disabled={sharing || shareBusy}
          title={shareAudio ? "Share sound with screen: on" : "Share sound with screen: off"}
          aria-label="Toggle sharing sound with your screen"
        >
          {shareAudio ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <Button size="sm" variant="destructive" className="ml-auto rounded-full" onClick={leave} disabled={leaving}>
        {leaving ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <PhoneOff className="mr-1 h-3.5 w-3.5" />}
        Leave
      </Button>
    </div>
  );
}
