import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useLocalParticipant,
  useTracks,
  ParticipantContext,
  useIsMuted,
  useIsSpeaking,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, type Participant } from "livekit-client";
import { Loader2, Mic, MicOff, PhoneOff, Volume2, AlertTriangle, VideoOff } from "lucide-react";
import { getCommunityVoiceToken } from "@/lib/livekit.functions";
import { Button } from "@/components/ui/button";

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
          message: err instanceof Error ? err.message : "Couldn't connect to voice",
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
          <span className="text-sm">Connecting to voice…</span>
        </div>
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="grid h-full min-h-[300px] place-items-center p-6 text-center">
        <div>
          <VideoOff className="mx-auto h-8 w-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">Voice not yet enabled</h3>
          <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={onLeave}>Back</Button>
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
          <Button variant="outline" className="mt-4 rounded-full" onClick={onLeave}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={state.url}
      token={state.token}
      connect
      audio
      video={false}
      onDisconnected={onLeave}
      data-lk-theme="default"
    >
      <VoiceRoomUI channelName={channelName} onLeave={onLeave} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function VoiceRoomUI({ channelName, onLeave }: { channelName: string; onLeave: () => void }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [muted, setMuted] = useState(!localParticipant?.isMicrophoneEnabled);
  // Subscribe to remote audio tracks so RoomAudioRenderer plays them.
  useTracks([Track.Source.Microphone], { onlySubscribed: false });

  const toggleMute = async () => {
    if (!localParticipant) return;
    const next = !muted;
    await localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="flex items-center gap-1 font-semibold">
          <Volume2 className="h-4 w-4" /> {channelName}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {participants.length} in voice
          </span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {participants.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">
            You're the only one here — invite a friend.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {participants.map((p) => (
              <ParticipantContext.Provider key={p.identity} value={p}>
                <VoiceTile participant={p} isSelf={p.identity === localParticipant?.identity} />
              </ParticipantContext.Provider>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-border/50 p-4">
        <Button
          size="lg"
          variant={muted ? "outline" : "default"}
          className={`rounded-full ${muted ? "" : "bg-brand-gradient text-white"}`}
          onClick={toggleMute}
        >
          {muted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
          {muted ? "Unmute" : "Mute"}
        </Button>
        <Button size="lg" variant="destructive" className="rounded-full" onClick={onLeave}>
          <PhoneOff className="mr-2 h-4 w-4" /> Leave voice
        </Button>
      </div>
    </div>
  );
}

function VoiceTile({ participant, isSelf }: { participant: Participant; isSelf: boolean }) {
  const isMuted = useIsMuted({ source: Track.Source.Microphone, participant });
  const isSpeaking = useIsSpeaking(participant);
  const name = participant.name || participant.identity.slice(0, 6);
  return (
    <li
      className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
        isSpeaking ? "border-primary shadow-soft" : "border-border/60"
      }`}
    >
      <div
        className={`grid h-12 w-12 place-items-center rounded-full bg-brand-gradient text-white ring-2 transition ${
          isSpeaking ? "ring-primary" : "ring-transparent"
        }`}
      >
        <span className="text-sm font-semibold">{name.slice(0, 1).toUpperCase()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {name} {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
        </p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {isMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
          {isMuted ? "Muted" : isSpeaking ? "Speaking" : "Listening"}
        </p>
      </div>
    </li>
  );
}
