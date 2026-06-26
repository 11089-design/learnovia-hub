import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft, Hash, Send, Plus, Users, Megaphone, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";

export const Route = createFileRoute("/_authenticated/communities/$slug")({
  head: () => ({ meta: [{ title: "Community — Learnova" }] }),
  component: CommunityPage,
});

type Community = { id: string; slug: string; name: string; description: string | null; member_count: number; created_by: string; cover_url: string | null };
type Channel = { id: string; name: string; kind: string; position: number };
type Profile = { id: string; display_name: string | null };
type ChannelMessage = { id: string; user_id: string; content: string; pinned: boolean; created_at: string };
type Post = { id: string; user_id: string; title: string; body: string | null; hashtags: string[]; featured: boolean; upvotes: number; created_at: string };

function CommunityPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [tab, setTab] = useState<"chat" | "posts">("chat");
  const [me, setMe] = useState<string | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [role, setRole] = useState<"owner" | "mod" | "member" | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (u.user) setMe(u.user.id);
      const { data: c } = await supabase.from("communities").select("id, slug, name, description, member_count, created_by, cover_url").eq("slug", slug).maybeSingle();
      if (!c) return;
      setCommunity(c as Community);
      const { data: ch } = await supabase.from("community_channels").select("id, name, kind, position").eq("community_id", c.id).order("position");
      setChannels(ch ?? []);
      setActiveChannel(ch?.[0] ?? null);
      if (u.user) {
        const { data: m } = await supabase.from("community_members").select("user_id, role").eq("community_id", c.id).eq("user_id", u.user.id).maybeSingle();
        setIsMember(!!m);
        setRole((m?.role as "owner" | "mod" | "member") ?? null);
      }
    })();
  }, [slug]);

  const join = async () => {
    if (!community || !me) return;
    const { error } = await supabase.from("community_members").insert({ community_id: community.id, user_id: me });
    if (error) toast.error(error.message); else { toast.success("Joined!"); setIsMember(true); }
  };
  const leave = async () => {
    if (!community || !me) return;
    await supabase.from("community_members").delete().eq("community_id", community.id).eq("user_id", me);
    setIsMember(false);
  };

  if (!community) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/communities" })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            {community.cover_url ? (
              <img src={community.cover_url} alt="" className="h-9 w-9 rounded-xl object-cover" />
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-gradient text-white">
                {community.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold">{community.name}</h1>
              <p className="text-xs text-muted-foreground"><Users className="mr-1 inline h-3 w-3" />{community.member_count} members</p>
            </div>
          </div>
          {me && (isMember ? (
            <Button variant="outline" size="sm" className="rounded-full" onClick={leave}>Leave</Button>
          ) : (
            <Button size="sm" className="rounded-full bg-brand-gradient text-white" onClick={join}>Join</Button>
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase text-muted-foreground">Channels</p>
            <ul className="space-y-0.5">
              {channels.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => { setActiveChannel(c); setTab("chat"); }}
                    className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ${activeChannel?.id === c.id && tab === "chat" ? "bg-primary/10 text-primary" : "hover:bg-accent/40"}`}
                  >
                    <Hash className="h-3.5 w-3.5" /> {c.name}
                  </button>
                </li>
              ))}
            </ul>
            <button onClick={() => setTab("posts")}
              className={`mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ${tab === "posts" ? "bg-primary/10 text-primary" : "hover:bg-accent/40"}`}>
              <Megaphone className="h-3.5 w-3.5" /> Posts
            </button>
          </div>
          {community.description && (
            <div className="rounded-2xl border border-border/60 bg-card p-3 text-xs text-muted-foreground">
              {community.description}
            </div>
          )}
          {(role === "owner" || role === "mod") && (
            <div className="rounded-2xl border border-border/60 bg-card p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Community cover</p>
              <ImageUploader
                value={community.cover_url}
                onChange={async (url) => {
                  const { error } = await supabase.from("communities").update({ cover_url: url }).eq("id", community.id);
                  if (error) { toast.error(error.message); return; }
                  setCommunity({ ...community, cover_url: url });
                }}
                folder="communities"
                shape="wide"
              />
            </div>
          )}
        </aside>

        {/* Main */}
        <section className="rounded-2xl border border-border/60 bg-card">
          {tab === "chat" && activeChannel ? (
            <ChannelChat channel={activeChannel} community={community} userId={me} isMember={isMember} />
          ) : (
            <PostsFeed community={community} userId={me} isMember={isMember} />
          )}
        </section>
      </main>
    </div>
  );
}

function ChannelChat({ channel, community, userId, isMember }: { channel: Channel; community: Community; userId: string | null; isMember: boolean }) {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    supabase.from("community_messages").select("id, user_id, content, pinned, created_at").eq("channel_id", channel.id).order("created_at").limit(200)
      .then(({ data }) => setMessages((data ?? []) as ChannelMessage[]));
    const ch = supabase.channel(`cm-${channel.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `channel_id=eq.${channel.id}` }, (p) => {
        setMessages((m) => [...m, p.new as ChannelMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channel.id]);

  useEffect(() => {
    const ids = Array.from(new Set(messages.map((m) => m.user_id))).filter((id) => !profiles[id]);
    if (!ids.length) return;
    supabase.from("profiles").select("id, display_name").in("id", ids).then(({ data }) => {
      if (data) setProfiles((p) => ({ ...p, ...Object.fromEntries(data.map((x) => [x.id, x as Profile])) }));
    });
  }, [messages, profiles]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !userId) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("community_messages").insert({
      channel_id: channel.id, community_id: community.id, user_id: userId, content: body,
    });
    if (error) toast.error(error.message);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="border-b border-border/50 px-4 py-3">
        <h2 className="flex items-center gap-1 font-semibold"><Hash className="h-4 w-4" /> {channel.name}</h2>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="flex gap-2">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
              {(profiles[m.user_id]?.display_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{profiles[m.user_id]?.display_name ?? "…"}</span>
                <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "MMM d, h:mm a")}</span>
              </div>
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}
        {messages.length === 0 && <p className="py-12 text-center text-xs text-muted-foreground">No messages yet. Be the first.</p>}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-border/50 p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)}
          placeholder={isMember ? `Message #${channel.name}` : "Join the community to chat"} disabled={!isMember} />
        <Button type="submit" size="icon" className="bg-brand-gradient text-white" disabled={!isMember}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

function PostsFeed({ community, userId, isMember }: { community: Community; userId: string | null; isMember: boolean }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    supabase.from("community_posts").select("id, user_id, title, body, hashtags, featured, upvotes, created_at")
      .eq("community_id", community.id)
      .order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(50)
      .then(({ data }) => setPosts((data ?? []) as Post[]));
  }, [community.id]);

  useEffect(() => {
    const ids = Array.from(new Set(posts.map((p) => p.user_id))).filter((id) => !profiles[id]);
    if (!ids.length) return;
    supabase.from("profiles").select("id, display_name").in("id", ids).then(({ data }) => {
      if (data) setProfiles((p) => ({ ...p, ...Object.fromEntries(data.map((x) => [x.id, x as Profile])) }));
    });
  }, [posts, profiles]);

  const create = async () => {
    if (!title.trim() || !userId) return;
    const { data, error } = await supabase.from("community_posts").insert({
      community_id: community.id, user_id: userId, title: title.trim(), body: body.trim() || null,
      hashtags: tags.split(/[\s,]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean),
    }).select("id, user_id, title, body, hashtags, featured, upvotes, created_at").single();
    if (error) { toast.error(error.message); return; }
    setPosts([data as Post, ...posts]);
    setTitle(""); setBody(""); setTags(""); setCreating(false);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-1 font-semibold"><Megaphone className="h-4 w-4" /> Posts</h2>
        {isMember && (
          <Button size="sm" onClick={() => setCreating((v) => !v)} className="rounded-full bg-brand-gradient text-white">
            <Plus className="mr-1 h-3.5 w-3.5" /> New post
          </Button>
        )}
      </div>
      {creating && (
        <div className="mb-4 space-y-2 rounded-xl border border-border p-3">
          <Input placeholder="Post title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="What's up?" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
          <Input placeholder="hashtags (space-separated, e.g. study tips)" value={tags} onChange={(e) => setTags(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button size="sm" onClick={create} className="bg-brand-gradient text-white">Post</Button>
          </div>
        </div>
      )}
      <ul className="space-y-3">
        {posts.map((p) => (
          <li key={p.id} className="rounded-2xl border border-border/60 p-4 transition hover:bg-accent/20">
            <div className="flex items-center gap-2">
              {p.featured && <Badge className="rounded-full bg-brand-gradient text-white">Featured</Badge>}
              <span className="text-xs text-muted-foreground">
                {profiles[p.user_id]?.display_name ?? "…"} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
              </span>
            </div>
            <h3 className="mt-1 font-semibold">{p.title}</h3>
            {p.body && <p className="mt-1 text-sm text-muted-foreground">{p.body}</p>}
            {p.hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.hashtags.map((t) => <span key={t} className="text-xs text-primary">#{t}</span>)}
              </div>
            )}
          </li>
        ))}
        {posts.length === 0 && <p className="py-10 text-center text-xs text-muted-foreground">No posts yet.</p>}
      </ul>
    </div>
  );
}
