import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Hash, Send, Plus, Users, Megaphone, Loader2, FolderOpen,
  Upload, FileText, Download, Trash2, Sparkles, Folder, Volume2,
} from "lucide-react";
import { CommunityVoiceRoom } from "@/components/community/CommunityVoiceRoom";
import { FocusSprint } from "@/components/community/FocusSprint";

import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ImageUploader";
import { EmojiStickerPicker } from "@/components/chat/EmojiStickerPicker";
import { MessageContent } from "@/components/chat/MessageContent";
import { MessageReactions } from "@/components/chat/MessageReactions";
import { checkProfanity, autoReportMessage } from "@/lib/profanity";
import { toStickerMessage } from "@/lib/stickers";

export const Route = createFileRoute("/_authenticated/communities/$slug")({
  head: () => ({ meta: [{ title: "Community — Learnova" }] }),
  component: CommunityPage,
});

type Community = { id: string; slug: string; name: string; description: string | null; member_count: number; created_by: string; cover_url: string | null };
type Channel = { id: string; name: string; kind: string; position: number };
type Profile = { id: string; display_name: string | null };
type ChannelMessage = { id: string; user_id: string; content: string; pinned: boolean; created_at: string };
type Post = { id: string; user_id: string; title: string; body: string | null; hashtags: string[]; featured: boolean; upvotes: number; created_at: string };
type Resource = {
  id: string; community_id: string; channel_id: string | null; folder: string;
  name: string; file_url: string; size_bytes: number | null; mime_type: string | null;
  uploaded_by: string; created_at: string;
};

function CommunityPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [tab, setTab] = useState<"chat" | "posts" | "resources">("chat");
  const [me, setMe] = useState<string | null>(null);
  const [myName, setMyName] = useState<string>("Anonymous");
  const [isMember, setIsMember] = useState(false);
  const [role, setRole] = useState<"owner" | "mod" | "member" | null>(null);


  const isMod = role === "owner" || role === "mod";

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
        const [{ data: m }, { data: p }] = await Promise.all([
          supabase.from("community_members").select("user_id, role").eq("community_id", c.id).eq("user_id", u.user.id).maybeSingle(),
          supabase.from("profiles").select("display_name").eq("id", u.user.id).maybeSingle(),
        ]);
        setIsMember(!!m);
        setRole((m?.role as "owner" | "mod" | "member") ?? null);
        if (p?.display_name) setMyName(p.display_name);
      }

    })();
  }, [slug]);

  // Realtime: channels added by mods
  useEffect(() => {
    if (!community) return;
    const ch = supabase
      .channel(`channels-${community.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "community_channels", filter: `community_id=eq.${community.id}` },
        async () => {
          const { data } = await supabase.from("community_channels").select("id, name, kind, position").eq("community_id", community.id).order("position");
          setChannels(data ?? []);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [community?.id]);

  const join = async () => {
    if (!community || !me) return;
    const { error } = await supabase.from("community_members").insert({ community_id: community.id, user_id: me });
    if (error) toast.error(error.message); else { toast.success("Joined!"); setIsMember(true); setRole("member"); }
  };
  const leave = async () => {
    if (!community || !me) return;
    await supabase.from("community_members").delete().eq("community_id", community.id).eq("user_id", me);
    setIsMember(false); setRole(null);
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
          <FocusSprint communityName={community.name} />
          <div className="rounded-2xl border border-border/60 bg-card p-3">
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">Channels</p>
              {isMod && <NewChannelButton communityId={community.id} nextPos={channels.length} />}
            </div>
            <ul className="space-y-0.5">
              {channels.map((c) => {
                const Icon = c.kind === "voice" ? Video : Hash;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => { setActiveChannel(c); setTab("chat"); }}
                      className={`flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ${activeChannel?.id === c.id && tab === "chat" ? "bg-primary/10 text-primary" : "hover:bg-accent/40"}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {c.name}
                      {c.kind === "voice" && <span className="ml-auto text-[9px] uppercase text-muted-foreground">video</span>}
                    </button>
                  </li>
                );
              })}
            </ul>

            <button onClick={() => setTab("resources")}
              className={`mt-2 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ${tab === "resources" ? "bg-primary/10 text-primary" : "hover:bg-accent/40"}`}>
              <FolderOpen className="h-3.5 w-3.5" /> Resources
            </button>
            <button onClick={() => setTab("posts")}
              className={`mt-1 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition ${tab === "posts" ? "bg-primary/10 text-primary" : "hover:bg-accent/40"}`}>
              <Megaphone className="h-3.5 w-3.5" /> Posts
            </button>
          </div>
          {community.description && (
            <div className="rounded-2xl border border-border/60 bg-card p-3 text-xs text-muted-foreground">
              {community.description}
            </div>
          )}
          {isMod && (
            <div className="rounded-2xl border border-border/60 bg-card p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase text-muted-foreground">Community cover</p>
              <ImageUploader
                value={community.cover_url}
                onChange={async (url) => {
                  const { error } = await supabase.from("communities").update({ cover_url: url }).eq("id", community.id);
                  if (error) { toast.error(error.message); return; }
                  setCommunity({ ...community, cover_url: url });
                  toast.success("Cover updated");
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
            activeChannel.kind === "voice" ? (
              isMember ? (
                <CommunityVoiceRoom
                  key={activeChannel.id}
                  channelId={activeChannel.id}
                  channelName={activeChannel.name}
                  displayName={myName}
                  onLeave={() => {
                    // Drop back into a text channel so the voice room fully unmounts.
                    const text = channels.find((c) => c.kind === "text");
                    setActiveChannel(text ?? null);
                  }}
                />

              ) : (
                <div className="grid h-[calc(100vh-12rem)] place-items-center p-6 text-center text-sm text-muted-foreground">
                  Join the community to enter the video room.
                </div>
              )
            ) : (
              <ChannelChat channel={activeChannel} community={community} userId={me} isMember={isMember} />
            )
          ) : tab === "resources" ? (
            <ResourcesPanel community={community} userId={me} isMember={isMember} isMod={isMod} />
          ) : (
            <PostsFeed community={community} userId={me} isMember={isMember} />
          )}

        </section>
      </main>
    </div>
  );
}

/* -------------------- New channel button (mod only) -------------------- */
function NewChannelButton({ communityId, nextPos }: { communityId: string; nextPos: number }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"text" | "voice">("text");
  const [busy, setBusy] = useState(false);
  const create = async () => {
    const clean = name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24);
    if (!clean) return;
    setBusy(true);
    const { error } = await supabase.from("community_channels").insert({ community_id: communityId, name: clean, kind, position: nextPos });
    setBusy(false);
    if (error) toast.error(error.message);
    else { setName(""); setKind("text"); setOpen(false); toast.success(`${kind === "voice" ? "Video room " : "#"}${clean} created`); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground" title="New channel">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New channel</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setKind("text")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition ${kind === "text" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/40"}`}
          >
            <Hash className="h-4 w-4" /> Text
          </button>
          <button
            type="button"
            onClick={() => setKind("voice")}
            className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition ${kind === "voice" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/40"}`}
          >
            <Video className="h-4 w-4" /> Video room
          </button>
        </div>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "voice" ? "study-hall" : "study-tips"} onKeyDown={(e) => e.key === "Enter" && create()} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy || !name.trim()} className="bg-brand-gradient text-white">Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


/* ------------------------------ Chat ---------------------------------- */
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
        const incoming = p.new as ChannelMessage;
        setMessages((m) => (m.some((x) => x.id === incoming.id) ? m : [...m, incoming]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages", filter: `channel_id=eq.${channel.id}` }, (p) => {
        setMessages((m) => m.filter((x) => x.id !== (p.old as { id: string }).id));
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

  const sendBody = async (body: string) => {
    if (!userId) return null;
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, user_id: userId, content: body, pinned: false, created_at: new Date().toISOString() }]);
    const { data, error } = await supabase.from("community_messages")
      .insert({ channel_id: channel.id, community_id: community.id, user_id: userId, content: body })
      .select("id, user_id, content, pinned, created_at").single();
    if (error) { setMessages((m) => m.filter((x) => x.id !== tempId)); toast.error(error.message); return null; }
    setMessages((m) => {
      const without = m.filter((x) => x.id !== tempId);
      if (without.some((x) => x.id === (data as ChannelMessage).id)) return without;
      return [...without, data as ChannelMessage];
    });
    return data as ChannelMessage;
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !userId) return;
    const raw = text.trim();
    setText("");
    const { clean, flagged, matched } = checkProfanity(raw);
    const sent = await sendBody(clean);
    if (sent && flagged) {
      toast.warning("Heads up: language was flagged and reported to mods.");
      autoReportMessage({ reporterId: userId, targetKind: "community_message", targetId: sent.id, matched });
    }
  };

  const sendSticker = async (id: string) => { await sendBody(toStickerMessage(id)); };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="border-b border-border/50 px-4 py-3">
        <h2 className="flex items-center gap-1 font-semibold"><Hash className="h-4 w-4" /> {channel.name}</h2>
      </div>
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.map((m) => {
          const mine = m.user_id === userId;
          const isTemp = m.id.startsWith("tmp-");
          return (
            <div key={m.id} className="flex gap-2">
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-[10px] font-semibold text-white">
                {(profiles[m.user_id]?.display_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{profiles[m.user_id]?.display_name ?? "…"}</span>
                  <span className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "MMM d, h:mm a")}</span>
                </div>
                <div className="text-sm"><MessageContent content={m.content} /></div>
                {userId && !isTemp && (
                  <MessageReactions targetKind="community_message" messageId={m.id} userId={userId} channelKey={channel.id} />
                )}
              </div>
              {mine && !isTemp && (
                <button title="Delete" className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive" onClick={() => supabase.from("community_messages").delete().eq("id", m.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          );
        })}
        {messages.length === 0 && <p className="py-12 text-center text-xs text-muted-foreground">No messages yet. Be the first.</p>}
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border/50 p-3">
        <EmojiStickerPicker
          onPickEmoji={(e) => setText((t) => t + e)}
          onPickSticker={(id) => sendSticker(id)}
          align="start"
        />
        <Input value={text} onChange={(e) => setText(e.target.value)}
          placeholder={isMember ? `Message #${channel.name}` : "Join the community to chat"} disabled={!isMember} />
        <Button type="submit" size="icon" className="bg-brand-gradient text-white" disabled={!isMember}><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}

/* ---------------------------- Resources ------------------------------- */
function ResourcesPanel({ community, userId, isMember, isMod }: { community: Community; userId: string | null; isMember: boolean; isMod: boolean }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("All");
  const [newFolder, setNewFolder] = useState("");
  const [uploadFolder, setUploadFolder] = useState("General");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.from("community_resources")
      .select("id, community_id, channel_id, folder, name, file_url, size_bytes, mime_type, uploaded_by, created_at")
      .eq("community_id", community.id).order("created_at", { ascending: false })
      .then(({ data }) => setResources((data ?? []) as Resource[]));

    const ch = supabase.channel(`cr-${community.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "community_resources", filter: `community_id=eq.${community.id}` }, (p) => {
        if (p.eventType === "INSERT") setResources((r) => [p.new as Resource, ...r]);
        if (p.eventType === "DELETE") setResources((r) => r.filter((x) => x.id !== (p.old as Resource).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [community.id]);

  const folders = useMemo(() => {
    const set = new Set<string>(["General"]);
    resources.forEach((r) => set.add(r.folder));
    if (newFolder.trim()) set.add(newFolder.trim());
    return Array.from(set);
  }, [resources, newFolder]);

  const visible = useMemo(
    () => resources.filter((r) => activeFolder === "All" || r.folder === activeFolder),
    [resources, activeFolder],
  );

  const onPick = () => fileRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 25 * 1024 * 1024) { toast.error("Max 25 MB"); return; }
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^\w.-]+/g, "_");
      const path = `${userId}/community-resources/${community.id}/${Date.now()}-${safeName}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed?.signedUrl) throw sErr ?? new Error("Failed to get URL");
      const { error: insErr } = await supabase.from("community_resources").insert({
        community_id: community.id,
        folder: uploadFolder || "General",
        name: file.name,
        file_url: signed.signedUrl,
        file_path: path,
        size_bytes: file.size,
        mime_type: file.type,
        uploaded_by: userId,
      });
      if (insErr) throw insErr;
      toast.success("Uploaded");
      setNewFolder("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const del = async (r: Resource) => {
    if (!confirm("Delete this file?")) return;
    await supabase.from("community_resources").delete().eq("id", r.id);
  };

  return (
    <div className="flex h-[calc(100vh-12rem)] flex-col">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="flex items-center gap-1 font-semibold"><FolderOpen className="h-4 w-4" /> Resources</h2>
        {isMember && (
          <div className="flex items-center gap-2">
            <select value={uploadFolder} onChange={(e) => setUploadFolder(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1 text-xs">
              {folders.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <Input placeholder="+ folder" value={newFolder} onChange={(e) => { setNewFolder(e.target.value); setUploadFolder(e.target.value || "General"); }} className="h-8 w-24 text-xs" />
            <Button size="sm" onClick={onPick} disabled={busy} className="rounded-full bg-brand-gradient text-white">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="mr-1 h-3.5 w-3.5" /> Upload</>}
            </Button>
            <input ref={fileRef} type="file" className="hidden" onChange={onFile} />
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border/40 px-4 py-2">
        {(["All", ...folders] as string[]).map((f) => (
          <button key={f} onClick={() => setActiveFolder(f)}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition ${activeFolder === f ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/40"}`}>
            <Folder className="h-3 w-3" /> {f}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {visible.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-xs text-muted-foreground">
            <div>
              <Sparkles className="mx-auto h-6 w-6" />
              <p className="mt-2">No files in <b>{activeFolder}</b> yet.</p>
              {isMember && <p>Click <b>Upload</b> to add the first one.</p>}
            </div>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {visible.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3 transition hover:bg-accent/20">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.folder} · {r.size_bytes ? `${(r.size_bytes / 1024).toFixed(1)} KB` : "—"} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <a href={r.file_url} target="_blank" rel="noreferrer" className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-primary" title="Open">
                  <Download className="h-4 w-4" />
                </a>
                {(userId === r.uploaded_by || isMod) && (
                  <button onClick={() => del(r)} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-destructive" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Posts feed ----------------------------- */
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
