import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Send, Pin, Trash2, Hand, Smile, Plus, Upload, Download, X, Loader2,
  Sparkles, Lock, Unlock, Eye, EyeOff, Radio, FileText, Users as UsersIcon,
  ListChecks, ArrowLeft, MessageSquare, Video, NotebookPen, Wand2, Palette,
  MicOff, UserX, Star, Clock, VenetianMask, DoorOpen, Check,
} from "lucide-react";
import { format, formatDistanceToNow, formatDistanceStrict } from "date-fns";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoomWelcomeDialog } from "@/components/sessions/RoomWelcomeDialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";

import { LiveVideoRoom } from "./LiveVideoRoom";
import { ExitReflection } from "./ExitReflection";
import { Whiteboard } from "./Whiteboard";
import { LiveCaptions } from "./LiveCaptions";

import { AgendaBar, type AgendaItem } from "./AgendaBar";
import { WaitingRoomPanel } from "./WaitingRoomPanel";
import { BreakoutsPanel } from "./BreakoutsPanel";

import { generateSessionSummary } from "@/lib/sessions.functions";
import { EmojiStickerPicker } from "@/components/chat/EmojiStickerPicker";
import { MessageContent } from "@/components/chat/MessageContent";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { checkProfanity, autoReportMessage } from "@/lib/profanity";
import { toStickerMessage } from "@/lib/stickers";

const REACTIONS = ["🔥", "💡", "👍", "😵", "❓", "🎉"];

type Session = {
  id: string;
  tutor_id: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  meeting_room_name: string;
  locked: boolean;
  focus_mode: boolean;
  is_homework_help: boolean;
};

type SessionExtras = {
  agenda: AgendaItem[];
  spotlight_user_id: string | null;
  started_at: string | null;
  allow_anonymous: boolean;
  locked: boolean;
  focus_mode: boolean;
};


type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Message = { id: string; user_id: string; content: string; pinned: boolean; created_at: string };
type Resource = { id: string; title: string; kind: string; url: string | null; file_path: string | null; created_at: string };
type Poll = { id: string; question: string; options: string[]; closed: boolean; created_at: string };
type PollVote = { poll_id: string; user_id: string; option_index: number };
type HandRaise = { id: string; user_id: string; raised_at: string; resolved_at: string | null };
type Participant = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  left_at: string | null;
  muted: boolean;
  removed: boolean;
  anonymous_name: string | null;
};

export function SessionRoom({
  session,
  currentUserId,
  myDisplayName,
}: {
  session: Session;
  currentUserId: string;
  myDisplayName: string;
}) {
  const navigate = useNavigate();
  const isTutor = session.tutor_id === currentUserId;
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [reflectOpen, setReflectOpen] = useState(false);
  const [activeBreakoutId, setActiveBreakoutId] = useState<string | null>(null);
  const [extras, setExtras] = useState<SessionExtras>({
    agenda: [],
    spotlight_user_id: null,
    started_at: null,
    allow_anonymous: true,
    locked: session.locked,
    focus_mode: session.focus_mode,
  });
  const [useAnon, setUseAnon] = useState(false);
  const [anonName, setAnonName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "video" | "chat" | "notes" | "board" | "resources" | "polls" | "people" | "breakouts" | "summary"
  >("video");

  // Load session extras (agenda/spotlight/started_at/allow_anonymous/locked/focus)
  useEffect(() => {
    supabase
      .from("sessions")
      .select("agenda, spotlight_user_id, started_at, allow_anonymous, locked, focus_mode")
      .eq("id", session.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setExtras({
            agenda: (Array.isArray(data.agenda) ? data.agenda : []) as AgendaItem[],
            spotlight_user_id: data.spotlight_user_id ?? null,
            started_at: data.started_at ?? null,
            allow_anonymous: data.allow_anonymous ?? true,
            locked: data.locked ?? false,
            focus_mode: data.focus_mode ?? false,
          });
        }
      });
    const ch = supabase
      .channel(`sess-extras-${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${session.id}` },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          setExtras((prev) => ({
            agenda: Array.isArray(n.agenda) ? (n.agenda as AgendaItem[]) : prev.agenda,
            spotlight_user_id: (n.spotlight_user_id as string | null) ?? null,
            started_at: (n.started_at as string | null) ?? null,
            allow_anonymous: (n.allow_anonymous as boolean) ?? true,
            locked: (n.locked as boolean) ?? false,
            focus_mode: (n.focus_mode as boolean) ?? false,
          }));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session.id]);

  const effectiveDisplayName = useAnon && anonName ? anonName : myDisplayName;




  const leave = () => { if (isTutor) navigate({ to: "/dashboard" }); else setReflectOpen(true); };

  // Auto-join as student, and mark left_at on unmount so attendance duration is tracked
  useEffect(() => {
    if (isTutor) return;
    supabase
      .from("session_participants")
      .upsert(
        {
          session_id: session.id,
          user_id: currentUserId,
          role: "student",
          anonymous_name: useAnon ? anonName : null,
          left_at: null,
        },
        { onConflict: "session_id,user_id" },
      )
      .then(({ error }) => {
        if (error && !error.message.includes("duplicate")) console.warn(error);
      });
    const onBeforeUnload = () => {
      // Best-effort: mark leave time
      supabase.from("session_participants").update({ left_at: new Date().toISOString() })
        .eq("session_id", session.id).eq("user_id", currentUserId).then(() => {});
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      onBeforeUnload();
    };
  }, [isTutor, session.id, currentUserId, useAnon, anonName]);

  // Enforce being kicked out if tutor marked me as removed
  useEffect(() => {
    if (isTutor) return;
    const ch = supabase
      .channel(`me-part-${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_participants", filter: `session_id=eq.${session.id}` },
        (payload) => {
          const n = payload.new as { user_id: string; removed: boolean } | undefined;
          if (n && n.user_id === currentUserId && n.removed) {
            toast.error("You were removed from the session.");
            navigate({ to: "/dashboard" });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isTutor, session.id, currentUserId, navigate]);

  const setLocked = async (next: boolean) => {
    setExtras((p) => ({ ...p, locked: next }));
    const { error } = await supabase.from("sessions").update({ locked: next }).eq("id", session.id);
    if (error) {
      setExtras((p) => ({ ...p, locked: !next }));
      toast.error(error.message);
    } else {
      toast.success(next ? "Room locked — new arrivals wait to be let in" : "Room unlocked — anyone enrolled can walk in");
    }
  };

  const setFocus = async (next: boolean) => {
    setExtras((p) => ({ ...p, focus_mode: next }));
    const { error } = await supabase.from("sessions").update({ focus_mode: next }).eq("id", session.id);
    if (error) {
      setExtras((p) => ({ ...p, focus_mode: !next }));
      toast.error(error.message);
    }
  };

  const toggleAnonymous = () => {
    setUseAnon((prev) => {
      const next = !prev;
      if (next && !anonName) {
        const pool = ["Lynx", "Otter", "Falcon", "Panda", "Fox", "Koala", "Heron", "Wolf", "Deer", "Owl"];
        setAnonName(`Anon ${pool[Math.floor(Math.random() * pool.length)]}`);
      }
      toast.info(next ? "You now appear under a nickname — ask anything." : "Your real name is showing again.");
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <RoomWelcomeDialog />
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={leave} className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold md:text-lg">{session.title}</h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-full capitalize">{session.status}</Badge>
                {session.is_homework_help && <Badge variant="secondary" className="rounded-full">Homework</Badge>}
                {extras.locked && (
                  <Badge variant="destructive" className="rounded-full gap-1"><Lock className="h-3 w-3" /> Room locked</Badge>
                )}
                {extras.focus_mode && <Badge variant="secondary" className="rounded-full">Focus</Badge>}
                {activeBreakoutId && <Badge className="rounded-full bg-primary/15 text-primary">Breakout</Badge>}
                {useAnon && <Badge variant="secondary" className="rounded-full">Anon: {anonName}</Badge>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {extras.allow_anonymous && !isTutor && (
              <Button
                size="sm"
                variant={useAnon ? "default" : "outline"}
                className={`rounded-full ${useAnon ? "bg-brand-gradient text-white" : ""}`}
                onClick={toggleAnonymous}
                title="Ask questions under a nickname instead of your real name"
              >
                <VenetianMask className="mr-1 h-3.5 w-3.5" />
                {useAnon ? "Nickname on" : "Ask anonymously"}
              </Button>
            )}
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => setLowBandwidth((v) => !v)} title="Turn video off to save data">
              {lowBandwidth ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}
              {lowBandwidth ? "Low data" : "Full video"}
            </Button>
            {isTutor && (
              <>
                <label className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
                  <Radio className="h-3.5 w-3.5" />
                  <span>Focus mode</span>
                  <Switch checked={extras.focus_mode} onCheckedChange={setFocus} aria-label="Focus mode" />
                </label>
                <label className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${extras.locked ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border"}`}>
                  {extras.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  <span>{extras.locked ? "Locked" : "Lock room"}</span>
                  <Switch checked={extras.locked} onCheckedChange={setLocked} aria-label="Lock room" />
                </label>
              </>
            )}
            <Button size="sm" variant="destructive" className="rounded-full" onClick={leave}>
              <DoorOpen className="mr-1 h-3.5 w-3.5" /> Leave
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_400px]">
        {/* Left: video + agenda + waiting room */}
        <div className="min-h-[60vh] lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] flex flex-col">
          <AgendaBar
            sessionId={session.id}
            isTutor={isTutor}
            startedAt={extras.started_at}
            initialAgenda={extras.agenda}
            onStarted={(iso) => setExtras((p) => ({ ...p, started_at: iso }))}
          />

          <WaitingRoomPanel sessionId={session.id} isTutor={isTutor} />
          <div className="flex-1 min-h-[400px]">
            <LiveVideoRoom
              sessionId={session.id}
              displayName={effectiveDisplayName}
              lowBandwidth={lowBandwidth}
              breakoutId={activeBreakoutId}
              onLeave={leave}
            />
          </div>

          {activeBreakoutId && (
            <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-2 text-center text-xs">
              You're in a breakout room. <button onClick={() => setActiveBreakoutId(null)} className="font-semibold text-primary underline">Return to main room</button>
            </div>
          )}
        </div>

        {/* Right: tabs panel */}
        <div className="rounded-2xl border border-border/60 bg-card lg:h-[calc(100vh-6rem)] lg:sticky lg:top-20">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex h-full flex-col">
            <TabsList className="m-3 grid grid-cols-8 rounded-full">
              <TabsTrigger value="video" className="rounded-full" title="Intel"><Sparkles className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="chat" className="rounded-full" title="Chat"><MessageSquare className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="notes" className="rounded-full" title="Notes"><NotebookPen className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="board" className="rounded-full" title="Whiteboard"><Palette className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="resources" className="rounded-full" title="Resources"><FileText className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="polls" className="rounded-full" title="Polls"><ListChecks className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="people" className="rounded-full" title="People"><UsersIcon className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="breakouts" className="rounded-full" title="Breakouts"><DoorOpen className="h-4 w-4" /></TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4">
              <div className="min-h-[180px] flex-1 overflow-hidden">
                <LiveCaptions
                  sessionId={session.id}
                  userId={currentUserId}
                  displayName={effectiveDisplayName}
                  startedAt={extras.started_at}
                />
              </div>
              <div className="min-h-[200px] flex-1 overflow-hidden">
                <SummaryPanel sessionId={session.id} isTutor={isTutor} />
              </div>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 overflow-hidden px-1 pb-3">
              <ChatPanel sessionId={session.id} userId={currentUserId} isTutor={isTutor} />
            </TabsContent>
            <TabsContent value="notes" className="flex-1 overflow-hidden px-4 pb-3">
              <NotesPanel sessionId={session.id} userId={currentUserId} startedAt={extras.started_at} />
            </TabsContent>
            <TabsContent value="board" className="flex-1 overflow-hidden px-3 pb-3">
              <Whiteboard sessionId={session.id} userId={currentUserId} />
            </TabsContent>
            <TabsContent value="resources" className="flex-1 overflow-hidden px-4 pb-3">
              <ResourcesPanel sessionId={session.id} isTutor={isTutor} />
            </TabsContent>
            <TabsContent value="polls" className="flex-1 overflow-hidden px-4 pb-3">
              <PollsPanel sessionId={session.id} userId={currentUserId} isTutor={isTutor} />
            </TabsContent>
            <TabsContent value="people" className="flex-1 overflow-hidden px-4 pb-3">
              <PeoplePanel
                sessionId={session.id}
                userId={currentUserId}
                isTutor={isTutor}
                spotlightId={extras.spotlight_user_id}
              />
            </TabsContent>
            <TabsContent value="breakouts" className="flex-1 overflow-hidden px-4 pb-3">
              <BreakoutsPanel
                sessionId={session.id}
                userId={currentUserId}
                isTutor={isTutor}
                activeBreakoutId={activeBreakoutId}
                onJoin={setActiveBreakoutId}
                onLeave={() => setActiveBreakoutId(null)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>


      {/* Reactions bar (fixed bottom) */}
      <ReactionsBar sessionId={session.id} userId={currentUserId} />

      {!isTutor && (
        <ExitReflection
          open={reflectOpen}
          onOpenChange={setReflectOpen}
          sessionId={session.id}
          userId={currentUserId}
          onDone={() => { setReflectOpen(false); navigate({ to: "/dashboard" }); }}
        />
      )}
    </div>
  );
}

/* ----------------------------- Chat panel ----------------------------- */
function ChatPanel({ sessionId, userId, isTutor }: { sessionId: string; userId: string; isTutor: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("session_messages")
        .select("id, user_id, content, pinned, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (active && data) setMessages(data as Message[]);
    })();

    const ch = supabase
      .channel(`chat-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_messages", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const incoming = payload.new as Message;
        setMessages((m) => (m.some((x) => x.id === incoming.id) ? m : [...m, incoming]));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "session_messages", filter: `session_id=eq.${sessionId}` }, (payload) => {
        setMessages((m) => m.map((x) => (x.id === (payload.new as Message).id ? (payload.new as Message) : x)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "session_messages", filter: `session_id=eq.${sessionId}` }, (payload) => {
        setMessages((m) => m.filter((x) => x.id !== (payload.old as { id: string }).id));
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [sessionId]);

  // Lazy-load author profiles
  useEffect(() => {
    const missing = Array.from(new Set(messages.map((m) => m.user_id))).filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", missing)
      .then(({ data }) => {
        if (!data) return;
        setProfiles((p) => ({ ...p, ...Object.fromEntries(data.map((x) => [x.id, x as Profile])) }));
      });
  }, [messages, profiles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendBody = async (body: string) => {
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, user_id: userId, content: body, pinned: false, created_at: new Date().toISOString() }]);
    const { data, error } = await supabase
      .from("session_messages")
      .insert({ session_id: sessionId, user_id: userId, content: body })
      .select("id, user_id, content, pinned, created_at")
      .single();
    if (error) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      toast.error(error.message);
      return null;
    }
    setMessages((m) => {
      const without = m.filter((x) => x.id !== tempId);
      if (without.some((x) => x.id === data.id)) return without;
      return [...without, data as Message];
    });
    return data as Message;
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = text.trim();
    if (!raw) return;
    setText("");
    const { clean, flagged, matched } = checkProfanity(raw);
    const sent = await sendBody(clean);
    if (sent && flagged) {
      toast.warning("Heads up: language was flagged and reported to mods.");
      autoReportMessage({ reporterId: userId, targetKind: "session_message", targetId: sent.id, matched });
    }
  };

  const sendSticker = async (id: string) => {
    await sendBody(toStickerMessage(id));
  };

  const pinned = messages.filter((m) => m.pinned);

  return (
    <div className="flex h-full flex-col">
      {pinned.length > 0 && (
        <div className="mx-3 mb-2 rounded-xl border border-primary/20 bg-primary/5 p-2">
          <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-primary"><Pin className="h-3 w-3" /> Pinned</div>
          {pinned.map((m) => (
            <p key={m.id} className="text-xs">{m.content}</p>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-3">
        {messages.map((m) => {
          const author = profiles[m.user_id];
          const mine = m.user_id === userId;
          const isTemp = m.id.startsWith("tmp-");
          return (
            <div key={m.id} className={`group flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
                {(author?.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className={`max-w-[75%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {!mine && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{author?.display_name ?? "…"}</p>}
                  <MessageContent content={m.content} mine={mine} />
                </div>
                {!isTemp && (
                  <MessageReactions targetKind="session_message" messageId={m.id} userId={userId} channelKey={sessionId} />
                )}
              </div>
              {(isTutor || mine) && !isTemp && (
                <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {isTutor && (
                    <button title="Pin" onClick={() => supabase.from("session_messages").update({ pinned: !m.pinned }).eq("id", m.id)}>
                      <Pin className="h-3 w-3 text-muted-foreground hover:text-primary" />
                    </button>
                  )}
                  <button title="Delete" onClick={() => supabase.from("session_messages").delete().eq("id", m.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="py-10 text-center text-xs text-muted-foreground">No messages yet — say hello.</p>
        )}
      </div>

      <form onSubmit={send} className="m-3 flex items-center gap-2">
        <EmojiStickerPicker
          onPickEmoji={(e) => setText((t) => t + e)}
          onPickSticker={(id) => sendSticker(id)}
          align="start"
        />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
        <Button type="submit" size="icon" className="shrink-0 bg-brand-gradient text-white"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

/* ----------------------------- Notes panel ---------------------------- */
function NotesPanel({ sessionId, userId, startedAt }: { sessionId: string; userId: string; startedAt: string | null }) {
  const sharedRef = useRef<HTMLTextAreaElement>(null);
  const privateRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<"shared" | "private">("shared");
  const [shared, setShared] = useState("");
  const [privateText, setPrivateText] = useState("");
  const [savingShared, setSavingShared] = useState(false);
  const [savingPrivate, setSavingPrivate] = useState(false);
  const sharedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const privateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.from("session_notes_shared").select("content").eq("session_id", sessionId).maybeSingle()
      .then(({ data }) => setShared(data?.content ?? ""));
    supabase.from("session_notes_private").select("content").eq("session_id", sessionId).eq("user_id", userId).maybeSingle()
      .then(({ data }) => setPrivateText(data?.content ?? ""));

    const ch = supabase
      .channel(`notes-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_notes_shared", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const next = payload.new as { content: string; updated_by?: string } | undefined;
        if (next && next.updated_by !== userId) setShared(next.content);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, userId]);

  const onSharedChange = (v: string) => {
    setShared(v);
    if (sharedTimer.current) clearTimeout(sharedTimer.current);
    sharedTimer.current = setTimeout(async () => {
      setSavingShared(true);
      await supabase.from("session_notes_shared")
        .upsert({ session_id: sessionId, content: v, updated_by: userId, updated_at: new Date().toISOString() });
      setSavingShared(false);
    }, 600);
  };

  const onPrivateChange = (v: string) => {
    setPrivateText(v);
    if (privateTimer.current) clearTimeout(privateTimer.current);
    privateTimer.current = setTimeout(async () => {
      setSavingPrivate(true);
      await supabase.from("session_notes_private")
        .upsert({ session_id: sessionId, user_id: userId, content: v, updated_at: new Date().toISOString() });
      setSavingPrivate(false);
    }, 600);
  };

  const insertTimestamp = () => {
    if (!startedAt) { toast.info("Tutor hasn't started the session clock yet."); return; }
    const secs = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    const mm = Math.floor(secs / 60).toString().padStart(2, "0");
    const ss = (secs % 60).toString().padStart(2, "0");
    const stamp = `[${mm}:${ss}] `;
    if (tab === "shared") {
      const el = sharedRef.current;
      const pos = el?.selectionStart ?? shared.length;
      const next = shared.slice(0, pos) + stamp + shared.slice(pos);
      onSharedChange(next);
      requestAnimationFrame(() => el?.focus());
    } else {
      const el = privateRef.current;
      const pos = el?.selectionStart ?? privateText.length;
      const next = privateText.slice(0, pos) + stamp + privateText.slice(pos);
      onPrivateChange(next);
      requestAnimationFrame(() => el?.focus());
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex rounded-full bg-muted p-1 text-xs">
          <button onClick={() => setTab("shared")} className={`rounded-full px-3 py-1 ${tab === "shared" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Shared</button>
          <button onClick={() => setTab("private")} className={`rounded-full px-3 py-1 ${tab === "private" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>Private</button>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" className="h-6 rounded-full px-2 text-[10px]" onClick={insertTimestamp} title="Insert timestamp">
            <Clock className="mr-1 h-3 w-3" /> Timestamp
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {tab === "shared" ? (savingShared ? "Saving…" : "Auto-saves") : (savingPrivate ? "Saving…" : "Only you")}
          </span>
        </div>
      </div>
      {tab === "shared" ? (
        <Textarea ref={sharedRef} value={shared} onChange={(e) => onSharedChange(e.target.value)} placeholder="Collaborative class notes…  Tip: use Timestamp to link a moment in the video." className="flex-1 resize-none font-mono text-sm" />
      ) : (
        <Textarea ref={privateRef} value={privateText} onChange={(e) => onPrivateChange(e.target.value)} placeholder="Your private notes (no one else sees these)…" className="flex-1 resize-none font-mono text-sm" />
      )}
    </div>
  );
}

/* --------------------------- Resources panel -------------------------- */
function ResourcesPanel({ sessionId, isTutor }: { sessionId: string; isTutor: boolean }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("session_resources")
      .select("id, title, kind, url, file_path, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    setResources((data ?? []) as Resource[]);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`resources-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_resources", filter: `session_id=eq.${sessionId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const onFile = async (file: File) => {
    setUploading(true);
    const path = `${sessionId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("session-resources").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { error: insErr } = await supabase.from("session_resources").insert({
      session_id: sessionId,
      uploaded_by: (await supabase.auth.getUser()).data.user!.id,
      kind: "file",
      title: file.name,
      file_path: path,
    });
    if (insErr) toast.error(insErr.message);
    else toast.success("Uploaded");
    setUploading(false);
    load();
  };

  const addLink = async () => {
    if (!linkUrl.trim()) return;
    const { error } = await supabase.from("session_resources").insert({
      session_id: sessionId,
      uploaded_by: (await supabase.auth.getUser()).data.user!.id,
      kind: "link",
      title: linkTitle.trim() || linkUrl,
      url: linkUrl.trim(),
    });
    if (error) toast.error(error.message);
    setLinkOpen(false); setLinkUrl(""); setLinkTitle("");
    load();
  };

  const openResource = async (r: Resource) => {
    if (r.url) window.open(r.url, "_blank");
    else if (r.file_path) {
      const { data } = await supabase.storage.from("session-resources").createSignedUrl(r.file_path, 3600);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {(
        // any participant can upload now
        true) && (
        <div className="mb-3 flex flex-wrap gap-2">
          <label className="inline-flex">
            <Button asChild size="sm" variant="outline" className="rounded-full" disabled={uploading}>
              <span><Upload className="mr-1 h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload file"}</span>
            </Button>
            <input type="file" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setLinkOpen((v) => !v)}>
            <Plus className="mr-1 h-3.5 w-3.5" /> Add link
          </Button>
        </div>
      )}
      {linkOpen && (
        <div className="mb-3 space-y-2 rounded-xl border border-border p-3">
          <Input placeholder="Title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} />
          <Input placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={addLink} className="bg-brand-gradient text-white">Add</Button>
          </div>
        </div>
      )}
      <ScrollArea className="flex-1 pr-2">
        {resources.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No resources yet.</p>
        ) : (
          <ul className="space-y-2">
            {resources.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-xl border border-border/60 p-2 text-sm hover:bg-accent/30">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <button onClick={() => openResource(r)} className="flex-1 truncate text-left">{r.title}</button>
                <button onClick={() => openResource(r)}><Download className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" /></button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}

/* ------------------------------ Polls panel --------------------------- */
function PollsPanel({ sessionId, userId, isTutor }: { sessionId: string; userId: string; isTutor: boolean }) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);

  useEffect(() => {
    const loadPolls = async () => {
      const { data } = await supabase.from("session_polls").select("id, question, options, closed, created_at")
        .eq("session_id", sessionId).order("created_at", { ascending: false });
      setPolls((data ?? []).map((p) => ({ ...p, options: p.options as string[] })) as Poll[]);
    };
    const loadVotes = async () => {
      const { data } = await supabase
        .from("session_poll_votes")
        .select("poll_id, user_id, option_index")
        .in("poll_id", polls.map((p) => p.id).concat(["00000000-0000-0000-0000-000000000000"]));
      setVotes((data ?? []) as PollVote[]);
    };
    loadPolls();
    const ch = supabase
      .channel(`polls-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_polls", filter: `session_id=eq.${sessionId}` }, loadPolls)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_poll_votes" }, loadVotes)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (polls.length === 0) { setVotes([]); return; }
    supabase.from("session_poll_votes").select("poll_id, user_id, option_index")
      .in("poll_id", polls.map((p) => p.id))
      .then(({ data }) => setVotes((data ?? []) as PollVote[]));
  }, [polls]);

  const createPoll = async () => {
    const cleaned = opts.map((o) => o.trim()).filter(Boolean);
    if (!q.trim() || cleaned.length < 2) { toast.error("Add a question and at least 2 options"); return; }
    const { error } = await supabase.from("session_polls").insert({
      session_id: sessionId, created_by: userId, question: q.trim(), options: cleaned,
    });
    if (error) { toast.error(error.message); return; }
    setQ(""); setOpts(["", ""]); setCreating(false);
  };

  // One row per person per poll: upsert so changing your pick can't lose it.
  const vote = async (pollId: string, idx: number) => {
    const existing = votes.find((v) => v.poll_id === pollId && v.user_id === userId);
    if (existing?.option_index === idx) return;
    setVotes((cur) => [
      ...cur.filter((v) => !(v.poll_id === pollId && v.user_id === userId)),
      { poll_id: pollId, user_id: userId, option_index: idx },
    ]);
    const { error } = await supabase
      .from("session_poll_votes")
      .upsert({ poll_id: pollId, user_id: userId, option_index: idx }, { onConflict: "poll_id,user_id" });
    if (error) {
      toast.error(error.message);
      setVotes((cur) =>
        existing
          ? [...cur.filter((v) => !(v.poll_id === pollId && v.user_id === userId)), existing]
          : cur.filter((v) => !(v.poll_id === pollId && v.user_id === userId)),
      );
    }
  };


  const closePoll = async (pollId: string, closed: boolean) => {
    const { error } = await supabase.from("session_polls").update({ closed }).eq("id", pollId);
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex h-full flex-col">
      {isTutor && (
        <div className="mb-3">
          {creating ? (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <Input placeholder="Question" value={q} onChange={(e) => setQ(e.target.value)} />
              {opts.map((opt, i) => (
                <Input key={i} placeholder={`Option ${i + 1}`} value={opt}
                  onChange={(e) => setOpts(opts.map((o, j) => j === i ? e.target.value : o))} />
              ))}
              <div className="flex justify-between">
                <Button size="sm" variant="ghost" onClick={() => setOpts([...opts, ""])}>+ Option</Button>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
                  <Button size="sm" onClick={createPoll} className="bg-brand-gradient text-white">Launch</Button>
                </div>
              </div>
            </div>
          ) : (
            <Button size="sm" onClick={() => setCreating(true)} className="rounded-full bg-brand-gradient text-white">
              <Plus className="mr-1 h-3.5 w-3.5" /> New poll
            </Button>
          )}
        </div>
      )}
      <ScrollArea className="flex-1 pr-2">
        {polls.length === 0 ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No polls yet.</p>
        ) : (
          <ul className="space-y-3">
            {polls.map((p) => {
              const pollVotes = votes.filter((v) => v.poll_id === p.id);
              const myVote = pollVotes.find((v) => v.user_id === userId);
              const total = pollVotes.length;
              return (
                <li key={p.id} className="rounded-xl border border-border/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{p.question}</p>
                    {p.closed && <Badge variant="outline" className="rounded-full text-[9px]">Closed</Badge>}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {p.options.map((opt, idx) => {
                      const count = pollVotes.filter((v) => v.option_index === idx).length;
                      const pct = total ? Math.round((count / total) * 100) : 0;
                      const picked = myVote?.option_index === idx;
                      return (
                        <button
                          key={idx}
                          disabled={p.closed}
                          onClick={() => vote(p.id, idx)}
                          className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs transition ${
                            picked ? "border-primary ring-1 ring-primary/50" : "border-border hover:bg-accent/30"
                          } ${p.closed ? "cursor-default opacity-90" : ""}`}
                        >
                          <div
                            className={`absolute inset-y-0 left-0 transition-all ${picked ? "bg-primary/25" : "bg-primary/10"}`}
                            style={{ width: `${pct}%` }}
                          />
                          <span className="relative flex items-center gap-2">
                            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${picked ? "border-primary bg-primary text-white" : "border-muted-foreground/40"}`}>
                              {picked && <Check className="h-2.5 w-2.5" />}
                            </span>
                            <span className="flex-1 truncate">{opt}</span>
                            <span className={`shrink-0 tabular-nums ${picked ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                              {count} {count === 1 ? "vote" : "votes"} · {pct}%
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {total} {total === 1 ? "vote" : "votes"} total
                      {myVote
                        ? ` · you picked “${p.options[myVote.option_index]}”${p.closed ? "" : " — tap another to change"}`
                        : p.closed ? "" : " · tap an option to vote"}
                    </p>
                    {isTutor && (
                      <button onClick={() => closePoll(p.id, !p.closed)} className="text-[10px] text-primary hover:underline">
                        {p.closed ? "Reopen" : "Close poll"}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );

}

/* ----------------------------- People panel --------------------------- */
function PeoplePanel({
  sessionId,
  userId,
  isTutor,
  spotlightId,
}: {
  sessionId: string;
  userId: string;
  isTutor: boolean;
  spotlightId: string | null;
}) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [hands, setHands] = useState<HandRaise[]>([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loadParts = async () => {
      const { data } = await supabase.from("session_participants")
        .select("id, user_id, role, joined_at, left_at, muted, removed, anonymous_name")
        .eq("session_id", sessionId).order("joined_at");
      setParticipants((data ?? []) as Participant[]);
    };
    const loadHands = async () => {
      const { data } = await supabase.from("hand_raises")
        .select("id, user_id, raised_at, resolved_at")
        .eq("session_id", sessionId).is("resolved_at", null);
      setHands((data ?? []) as HandRaise[]);
    };
    loadParts(); loadHands();
    const ch = supabase
      .channel(`people-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` }, loadParts)
      .on("postgres_changes", { event: "*", schema: "public", table: "hand_raises", filter: `session_id=eq.${sessionId}` }, loadHands)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  useEffect(() => {
    const ids = Array.from(new Set(participants.map((p) => p.user_id))).filter((id) => !profiles[id]);
    if (ids.length === 0) return;
    supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids).then(({ data }) => {
      if (data) setProfiles((p) => ({ ...p, ...Object.fromEntries(data.map((x) => [x.id, x as Profile])) }));
    });
  }, [participants, profiles]);

  const myHand = hands.find((h) => h.user_id === userId);
  const raiseHand = async () => {
    if (myHand) {
      await supabase.from("hand_raises").update({ resolved_at: new Date().toISOString() }).eq("id", myHand.id);
    } else {
      await supabase.from("hand_raises").insert({ session_id: sessionId, user_id: userId });
    }
  };
  const resolveHand = async (id: string) => {
    await supabase.from("hand_raises").update({ resolved_at: new Date().toISOString() }).eq("id", id);
  };

  const toggleMute = async (p: Participant) => {
    await supabase.from("session_participants").update({ muted: !p.muted }).eq("id", p.id);
    toast.info(p.muted ? "Unmuted" : "Muted");
  };
  const removeParticipant = async (p: Participant) => {
    if (!confirm(`Remove ${nameFor(p)} from this session?`)) return;
    await supabase.from("session_participants").update({
      removed: true,
      left_at: new Date().toISOString(),
    }).eq("id", p.id);
  };
  const toggleSpotlight = async (p: Participant) => {
    const next = spotlightId === p.user_id ? null : p.user_id;
    await supabase.from("sessions").update({ spotlight_user_id: next }).eq("id", sessionId);
  };

  const nameFor = (p: Participant) =>
    p.anonymous_name ?? profiles[p.user_id]?.display_name ?? "…";

  const fmtDuration = (p: Participant) => {
    const start = new Date(p.joined_at).getTime();
    const end = p.left_at ? new Date(p.left_at).getTime() : now;
    const mins = Math.max(0, Math.floor((end - start) / 60000));
    if (mins < 1) return "just now";
    return formatDistanceStrict(0, mins * 60000);
  };

  const present = participants.filter((p) => !p.left_at && !p.removed);
  const gone = participants.filter((p) => p.left_at || p.removed);

  return (
    <div className="flex h-full flex-col">
      <Button onClick={raiseHand} size="sm" variant={myHand ? "default" : "outline"}
        className={`mb-3 rounded-full ${myHand ? "bg-brand-gradient text-white" : ""}`}>
        <Hand className="mr-1 h-3.5 w-3.5" /> {myHand ? "Lower hand" : "Raise hand"}
      </Button>

      {hands.length > 0 && (
        <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-2">
          <p className="mb-1 text-[10px] font-semibold uppercase text-primary">Hand raise queue</p>
          <ul className="space-y-1">
            {hands.map((h) => {
              const p = participants.find((x) => x.user_id === h.user_id);
              return (
                <li key={h.id} className="flex items-center justify-between text-xs">
                  <span>{p ? nameFor(p) : "…"}</span>
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(h.raised_at), { addSuffix: true })}</span>
                  {isTutor && <button onClick={() => resolveHand(h.id)}><X className="h-3 w-3" /></button>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ScrollArea className="flex-1 pr-2">
        <p className="mb-1 px-1 text-[10px] font-semibold uppercase text-muted-foreground">
          In room · {present.length}
        </p>
        <ul className="space-y-1.5">
          {present.map((p) => {
            const prof = profiles[p.user_id];
            const isMe = p.user_id === userId;
            const spotlit = spotlightId === p.user_id;
            return (
              <li key={p.id} className={`group flex items-center gap-2 rounded-lg p-1.5 text-sm ${spotlit ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-accent/30"}`}>
                <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
                  {nameFor(p).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate">{nameFor(p)}{isMe && <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>}</span>
                    {p.anonymous_name && <Badge variant="outline" className="rounded-full text-[9px]">Anon</Badge>}
                    {p.muted && <MicOff className="h-3 w-3 text-destructive" />}
                    {spotlit && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{fmtDuration(p)}</p>
                </div>
                {p.role === "tutor" && <Badge variant="secondary" className="rounded-full text-[10px]">Tutor</Badge>}
                {isTutor && !isMe && p.role !== "tutor" && (
                  <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button title={spotlit ? "Remove spotlight" : "Spotlight"} onClick={() => toggleSpotlight(p)}>
                      <Star className={`h-3.5 w-3.5 ${spotlit ? "fill-amber-400 text-amber-400" : "text-muted-foreground hover:text-amber-500"}`} />
                    </button>
                    <button title={p.muted ? "Unmute" : "Mute"} onClick={() => toggleMute(p)}>
                      <MicOff className={`h-3.5 w-3.5 ${p.muted ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`} />
                    </button>
                    <button title="Remove" onClick={() => removeParticipant(p)}>
                      <UserX className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {gone.length > 0 && (
          <>
            <p className="mb-1 mt-4 px-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Left · {gone.length}
            </p>
            <ul className="space-y-1">
              {gone.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-lg p-1.5 text-xs text-muted-foreground">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[10px] font-semibold">
                    {nameFor(p).slice(0, 1).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{nameFor(p)}</span>
                  <span>attended {fmtDuration(p)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </ScrollArea>
    </div>
  );
}

/* --------------------------- Summary tab (AI) ------------------------- */
function SummaryPanel({ sessionId, isTutor }: { sessionId: string; isTutor: boolean }) {
  const generate = useServerFn(generateSessionSummary);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ summary: string; key_points: string[]; confused_topics: string[] } | null>(null);

  useEffect(() => {
    supabase.from("ai_session_summaries").select("summary, key_points, confused_topics").eq("session_id", sessionId).maybeSingle()
      .then(({ data }) => { if (data) setSummary(data); });
  }, [sessionId]);

  const onGen = async () => {
    setLoading(true);
    try {
      const out = await generate({ data: { sessionId } });
      setSummary(out);
      toast.success("Summary ready");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Sparkles className="h-3.5 w-3.5 text-primary" /> Session intel</h3>
        {isTutor && (
          <Button size="sm" variant="outline" className="rounded-full" onClick={onGen} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Wand2 className="mr-1 h-3.5 w-3.5" />{summary ? "Regenerate" : "Generate AI summary"}</>}
          </Button>
        )}
      </div>
      <ScrollArea className="flex-1">
        {!summary ? (
          <p className="py-10 text-center text-xs text-muted-foreground">No summary yet. {isTutor ? "Generate one after the session." : "The tutor will generate one."}</p>
        ) : (
          <div className="space-y-4 text-sm">
            <p className="leading-relaxed text-muted-foreground">{summary.summary}</p>
            {summary.key_points.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-primary">Key points</h4>
                <ul className="space-y-1 text-sm">
                  {summary.key_points.map((k, i) => <li key={i}>• {k}</li>)}
                </ul>
              </div>
            )}
            {summary.confused_topics.length > 0 && (
              <div>
                <h4 className="mb-1 text-xs font-semibold uppercase text-amber-600">Topics learners struggled with</h4>
                <ul className="space-y-1 text-sm">
                  {summary.confused_topics.map((k, i) => <li key={i}>• {k}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/* --------------------------- Reactions bar ---------------------------- */
function ReactionsBar({ sessionId, userId }: { sessionId: string; userId: string }) {
  const [recent, setRecent] = useState<{ id: string; emoji: string }[]>([]);

  const show = (id: string, emoji: string) => {
    setRecent((cur) => (cur.some((x) => x.id === id) ? cur : [...cur, { id, emoji }]));
    setTimeout(() => setRecent((cur) => cur.filter((x) => x.id !== id)), 2500);
  };

  useEffect(() => {
    const ch = supabase
      .channel(`reactions-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_reactions", filter: `session_id=eq.${sessionId}` }, (payload) => {
        const r = payload.new as { id: string; emoji: string; user_id: string };
        if (r.user_id === userId) return; // already shown optimistically
        show(r.id, r.emoji);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, userId]);

  const react = async (emoji: string) => {
    show(`local-${Date.now()}-${emoji}`, emoji);
    const { error } = await supabase.from("session_reactions").insert({ session_id: sessionId, user_id: userId, emoji });
    if (error) toast.error("Couldn't send that reaction — " + error.message);
  };

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Floating reactions */}
      <div className="flex h-8 items-end gap-1">
        {recent.map((r) => (
          <span key={r.id} className="animate-bounce text-2xl">{r.emoji}</span>
        ))}
      </div>
      {/* Reaction bar */}
      <div className="pointer-events-auto flex gap-1 rounded-full border border-border bg-background/95 p-1.5 shadow-soft backdrop-blur">
        {REACTIONS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => react(e)}
            aria-label={`React ${e}`}
            className="rounded-full px-1.5 py-0.5 text-lg transition hover:bg-accent"
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}

