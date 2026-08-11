import {
  Video, MonitorUp, Hand, MessageSquare, ListChecks, Palette,
  NotebookPen, FileText, DoorOpen, VenetianMask, Lock, LogOut,
  type LucideIcon,
} from "lucide-react";

export type GuideTool = { icon: LucideIcon; name: string; body: string };

export const CLASSROOM_TOOLS: GuideTool[] = [
  { icon: Video, name: "Camera & microphone", body: "Turn your camera or mic on and off any time from the control bar under the video. You can join with both off — nobody minds." },
  { icon: MonitorUp, name: "Share screen", body: "Press Share screen in the control bar to show your slides, notes or a problem you're stuck on. Press it again to stop sharing." },
  { icon: Hand, name: "Raise hand", body: "In the People tab. Your name joins a queue the host sees, so you don't have to interrupt anyone." },
  { icon: MessageSquare, name: "Chat", body: "Live text chat for the room. Hosts can pin an important message so it stays at the top. Emojis and Learnova stickers included." },
  { icon: ListChecks, name: "Polls", body: "Hosts launch quick polls. After you vote you'll see a tick next to your choice plus the live vote count for every option." },
  { icon: Palette, name: "Whiteboard", body: "A shared drawing board. Draw freely, then press Share board to publish your version, or Get latest to pull in someone else's." },
  { icon: NotebookPen, name: "Notes", body: "Shared class notes everyone can edit, plus a private pad only you can see. Timestamp drops the current moment of the call into your notes." },
  { icon: FileText, name: "Resources", body: "Upload files or paste links. Anyone in the session can add to it, and everything stays available after class." },
  { icon: DoorOpen, name: "Breakout rooms", body: "Hosts can split the room into smaller groups from the Breakouts tab. Join yours, then return to the main room with one click." },
  { icon: VenetianMask, name: "Ask anonymously (the mask)", body: "Shy about asking a question? Turn it on and you appear as something like \"Anon Otter\" instead of your real name. Switch back whenever." },
  { icon: Lock, name: "Lock room toggle", body: "A host-only switch in the room header. When it's on, nobody new walks in — latecomers wait in the waiting room until the host lets them in." },
  { icon: LogOut, name: "Leave", body: "The red Leave button disconnects you properly and frees your camera. Learners get a short reflection prompt on the way out — it feeds your streak and study plan." },
];

export const FAQS: { q: string; a: string }[] = [
  { q: "Where do I find sessions to join?", a: "Explore lists every live and upcoming session. Training holds multi-day courses, Workshops one-off deep dives, and Kids is the 5–12 corner. All of them are linked in the top navigation of your dashboard." },
  { q: "Does Learnova cost anything?", a: "No. Every session, course and workshop on Learnova is free — there are no payments anywhere on the platform." },
  { q: "How do I host my own session?", a: "From your dashboard press Host a session, add a title, subject, time and what learners will walk away with. You instantly get your own room with agenda, polls, whiteboard, resources and attendance." },
  { q: "Where are polls, notes and resources during a call?", a: "They're tabs in the right-hand panel of the live room: Intel, Chat, Notes, Whiteboard, Resources, Polls, People and Breakouts." },
  { q: "How do I share my screen?", a: "Use the Share screen button in the control bar directly above the video grid. Your browser will ask which window or tab to share." },
  { q: "What does locking the room do?", a: "Only the host sees the Lock room switch in the header. While locked, new arrivals land in the waiting room and the host approves them one by one." },
  { q: "Why can't I join a session I see listed?", a: "Enroll first from the session page — enrolling unlocks the group chat and the Enter room button. If the session already ended it's marked Ended and can't be joined." },
  { q: "Can I teach as a verified tutor?", a: "Yes. Upload your exam score or credential in Get verified and our AI check reviews it. You can also run a course openly as a peer-led study group — every card shows which." },
  { q: "How is Learnova kept safe?", a: "Offensive language is auto-flagged and reported, you can report any message or person in one tap, and hosts can mute or remove anyone from their room." },
];

export const ROOM_GUIDE_SEEN_KEY = "learnova:room-guide-seen";
