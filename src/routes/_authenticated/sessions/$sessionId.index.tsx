import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Calendar, Clock, Globe, Loader2, Lock, MessageSquare,
  Send, Star, Users, Video, HelpCircle, Sparkles, CheckCircle2, Pencil,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/landing/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { isSessionOver } from "@/lib/session-time";

export const Route = createFileRoute("/_authenticated/sessions/$sessionId/")({
  head: () => ({ meta: [{ title: "Session — Learnova" }] }),
  component: SessionDetailPage,
});

type Session = {
  id: string;
  tutor_id: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  format: "one_on_one" | "group";
  kind: "free" | "paid";
  price_cents: number;
  language: string;
  max_participants: number;
  meeting_room_name: string;
  locked: boolean;
  is_homework_help: boolean;
  outcomes: string[];
  cover_url: string | null;
  level: string | null;
};
type TutorProfile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  avg_rating: number;
  free_sessions_taught: number;
};
type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Message = { id: string; user_id: string; content: string; created_at: string };

function SessionDetailPage() {
  const { sessionId } = Route.useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [tab, setTab] = useState<"overview" | "chat">("overview");

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    setUserId(u.user?.id ?? null);

    const { data: s } = await supabase
      .from("sessions")
      .select("id, tutor_id, title, description, status, starts_at, ends_at, format, kind, price_cents, language, max_participants, meeting_room_name, locked, is_homework_help, outcomes, cover_url, level")
      .eq("id", sessionId)
      .maybeSingle();
    if (!s) { setLoading(false); return; }
    setSession(s as Session);

    const [{ data: t }, { count }, partRes] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url, bio, avg_rating, free_sessions_taught").eq("id", s.tutor_id).maybeSingle(),
      supabase.from("session_participants").select("id", { count: "exact", head: true }).eq("session_id", sessionId),
      u.user
        ? supabase.from("session_participants").select("id").eq("session_id", sessionId).eq("user_id", u.user.id).maybeSingle()
        : Promise.resolve({ data: null } as { data: null }),
    ]);
    setTutor((t as TutorProfile) ?? null);
    setEnrolledCount(count ?? 0);
    setEnrolled(!!partRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [sessionId]);

  const isTutor = !!userId && !!session && session.tutor_id === userId;
  const isOver = !!session && isSessionOver(session);
  const canChat = enrolled || isTutor;

  const enroll = async () => {
    if (!userId || !session) return;
    if (session.locked) { toast.error("This session is locked."); return; }
    setEnrolling(true);
    const { error } = await supabase
      .from("session_participants")
      .insert({ session_id: session.id, user_id: userId, role: "student" });
    setEnrolling(false);
    if (error) { toast.error(error.message); return; }
    toast.success("You're in! Group chat unlocked.");
    setEnrolled(true);
    setEnrolledCount((c) => c + 1);
  };

  const leave = async () => {
    if (!userId || !session) return;
    const { error } = await supabase.from("session_participants").delete()
      .eq("session_id", session.id).eq("user_id", userId);
    if (error) { toast.error(error.message); return; }
    setEnrolled(false);
    setEnrolledCount((c) => Math.max(c - 1, 0));
    toast("Left the session");
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold">Session not found</h1>
          <Link to="/explore"><Button className="mt-4 rounded-full">Back to Explore</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 pt-24 pb-16">
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => navigate({ to: "/explore" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT — content */}
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {session.is_homework_help && (
                <Badge variant="secondary" className="rounded-full bg-accent text-accent-foreground">
                  <HelpCircle className="mr-1 h-3 w-3" /> Homework help
                </Badge>
              )}
              <Badge variant="outline" className="rounded-full capitalize">
                {session.format === "one_on_one" ? "1-on-1" : "Group"}
              </Badge>
              <Badge variant="secondary" className="rounded-full">Always free</Badge>
              {session.level && <Badge variant="outline" className="rounded-full capitalize">{session.level}</Badge>}
              {session.locked && <Badge variant="destructive" className="rounded-full"><Lock className="mr-1 h-3 w-3" />Locked</Badge>}
              {isOver && <Badge variant="outline" className="rounded-full border-muted-foreground/40 text-muted-foreground">Ended</Badge>}
            </div>

            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{session.title}</h1>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              {session.starts_at && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-4 w-4" /> {format(new Date(session.starts_at), "EEE, MMM d • h:mm a")}
                </span>
              )}
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {enrolledCount}/{session.max_participants} enrolled</span>
              <span className="inline-flex items-center gap-1"><Globe className="h-4 w-4" /> {session.language}</span>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
              <TabsList className="rounded-full">
                <TabsTrigger value="overview" className="rounded-full">Overview</TabsTrigger>
                <TabsTrigger value="chat" className="rounded-full" disabled={!canChat} title={canChat ? "" : "Enroll to chat"}>
                  <MessageSquare className="mr-1 h-3.5 w-3.5" /> Group chat
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-8">
                {session.description && (
                  <section>
                    <h2 className="mb-2 text-lg font-semibold">About this session</h2>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{session.description}</p>
                  </section>
                )}

                {session.outcomes.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-lg font-semibold">What you'll learn</h2>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {session.outcomes.map((o, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {o}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {tutor && (
                  <section>
                    <h2 className="mb-3 text-lg font-semibold">Meet your tutor</h2>
                    <Link
                      to="/users/$userId"
                      params={{ userId: tutor.id }}
                      className="glass group flex items-start gap-4 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      {tutor.avatar_url ? (
                        <img src={tutor.avatar_url} alt={tutor.display_name ?? "Tutor"} className="h-16 w-16 rounded-full object-cover" />
                      ) : (
                        <div className="grid h-16 w-16 place-items-center rounded-full bg-brand-gradient text-xl font-bold text-white">
                          {(tutor.display_name ?? "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold group-hover:gradient-text">{tutor.display_name ?? "Anonymous tutor"}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-current text-yellow-500" /> {tutor.avg_rating > 0 ? tutor.avg_rating.toFixed(1) : "New"}</span>
                          <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> {tutor.free_sessions_taught} session{tutor.free_sessions_taught === 1 ? "" : "s"} taught</span>
                        </div>
                        {tutor.bio && <p className="mt-2 line-clamp-3 text-sm text-foreground/80">{tutor.bio}</p>}
                        <p className="mt-2 text-xs text-primary">View full profile →</p>
                      </div>
                    </Link>
                  </section>
                )}
              </TabsContent>

              <TabsContent value="chat" className="mt-6">
                {canChat && userId ? (
                  <GroupChat sessionId={session.id} userId={userId} />
                ) : (
                  <div className="glass grid place-items-center rounded-2xl p-12 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    <p className="mt-3 text-sm text-muted-foreground">Enroll to unlock the group chat.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* RIGHT — sticky enrollment card */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="glass space-y-4 rounded-2xl p-5 shadow-soft">
              <div>
                <p className="text-3xl font-bold">
                  Free
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.format === "one_on_one" ? "1-on-1 with tutor" : `Group up to ${session.max_participants}`}
                </p>
              </div>

              {isTutor ? (
                <div className="space-y-2">
                  {isOver ? (
                    <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                      This session has ended. Edit it to reschedule and reopen the room.
                    </div>
                  ) : (
                    <Link to="/sessions/$sessionId/room" params={{ sessionId: session.id }}>
                      <Button className="w-full rounded-full bg-brand-gradient text-white">
                        <Video className="mr-1 h-4 w-4" /> Enter your room
                      </Button>
                    </Link>
                  )}
                  <Link to="/sessions/$sessionId/edit" params={{ sessionId: session.id }}>
                    <Button variant="outline" className="w-full rounded-full">
                      <Pencil className="mr-1 h-4 w-4" /> Edit session
                    </Button>
                  </Link>
                  <Button variant="ghost" className="w-full rounded-full" onClick={() => setTab("chat")}>
                    <MessageSquare className="mr-1 h-4 w-4" /> Group chat
                  </Button>
                </div>
              ) : enrolled ? (
                <div className="space-y-2">
                  {isOver ? (
                    <div className="rounded-2xl border border-border/60 bg-muted/40 p-3 text-center text-xs text-muted-foreground">
                      This session has ended.
                    </div>
                  ) : (
                    <Link to="/sessions/$sessionId/room" params={{ sessionId: session.id }}>
                      <Button className="w-full rounded-full bg-brand-gradient text-white">
                        <Video className="mr-1 h-4 w-4" /> Join live room
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" className="w-full rounded-full" onClick={() => setTab("chat")}>
                    <MessageSquare className="mr-1 h-4 w-4" /> Open group chat
                  </Button>
                  <button onClick={leave} className="block w-full text-xs text-muted-foreground hover:text-destructive">
                    Leave session
                  </button>
                </div>
              ) : (
                <Button
                  className="w-full rounded-full bg-brand-gradient text-white"
                  disabled={enrolling || session.locked || isOver}
                  onClick={enroll}
                >
                  {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    isOver ? "Session ended" :
                    session.locked ? "Locked" :
                    "Enroll now"}
                </Button>
              )}

              <ul className="space-y-2 border-t border-border/50 pt-4 text-xs text-muted-foreground">
                {session.starts_at && (
                  <li className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Starts {formatDistanceToNow(new Date(session.starts_at), { addSuffix: true })}
                  </li>
                )}
                <li className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> {enrolledCount}/{session.max_participants} enrolled</li>
                <li className="flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> Taught in {session.language}</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

/* -------------------------- Realtime group chat -------------------------- */
function GroupChat({ sessionId, userId }: { sessionId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase.from("session_messages")
      .select("id, user_id, content, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }) => { if (active && data) setMessages(data as Message[]); });

    const ch = supabase.channel(`gc-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "session_messages", filter: `session_id=eq.${sessionId}` }, (p) => {
        setMessages((m) => m.some((x) => x.id === (p.new as Message).id) ? m : [...m, p.new as Message]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "session_messages", filter: `session_id=eq.${sessionId}` }, (p) => {
        setMessages((m) => m.filter((x) => x.id !== (p.old as { id: string }).id));
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [sessionId]);

  useEffect(() => {
    const missing = Array.from(new Set(messages.map((m) => m.user_id))).filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    supabase.from("profiles").select("id, display_name, avatar_url").in("id", missing).then(({ data }) => {
      if (data) setProfiles((p) => ({ ...p, ...Object.fromEntries(data.map((x) => [x.id, x as Profile])) }));
    });
  }, [messages, profiles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    // Optimistic
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, user_id: userId, content: body, created_at: new Date().toISOString() }]);
    const { data, error } = await supabase.from("session_messages")
      .insert({ session_id: sessionId, user_id: userId, content: body })
      .select("id, user_id, content, created_at")
      .single();
    setSending(false);
    if (error) {
      setMessages((m) => m.filter((x) => x.id !== tempId));
      toast.error(error.message);
      setText(body);
      return;
    }
    // Replace temp with real (realtime may also fire; dedupe by id)
    setMessages((m) => {
      const withoutTemp = m.filter((x) => x.id !== tempId);
      if (withoutTemp.some((x) => x.id === data.id)) return withoutTemp;
      return [...withoutTemp, data as Message];
    });
  };

  return (
    <div className="glass flex h-[60vh] flex-col rounded-2xl">
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-xs text-muted-foreground">No messages yet — say hi 👋</p>
        )}
        {messages.map((m) => {
          const author = profiles[m.user_id];
          const mine = m.user_id === userId;
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-gradient text-[11px] font-semibold text-white">
                {(author?.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {!mine && <p className="mb-0.5 text-[10px] font-semibold opacity-70">{author?.display_name ?? "…"}</p>}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className="mt-0.5 text-[9px] opacity-60">{format(new Date(m.created_at), "h:mm a")}</p>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border/50 p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the group…" />
        <Button type="submit" size="icon" className="bg-brand-gradient text-white" disabled={sending || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
