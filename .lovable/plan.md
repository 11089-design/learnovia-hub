# Learnova — Build Plan

This is a large platform. I'll ship it in phases so each milestone is usable and reviewable, instead of one giant unreviewable dump. You've given a clear visual direction (indigo #6C63FF / lavender / mint, glassmorphism, Gen Z startup feel), so I'll build directly to it.

## Phase 1 — Foundation (this turn)
- Design system in `src/styles.css`: brand tokens (indigo, lavender, mint, bg, ink), gradients, glass surfaces, soft shadows, animations (float, fade-in, scale, gradient shift), rounded radii, typography (Plus Jakarta Sans / Inter).
- Landing page (`/`) with all 8 sections you listed: hero with floating profile cards + animated gradient blobs, How It Works (Learn/Teach/Earn), Session Types, Featured Tutors, Communities, Safety, Testimonials, Footer.
- Top nav with logo, links, Sign In / Get Started.
- Routes scaffolded (placeholders): `/explore`, `/communities`, `/safety`, `/auth`, `/onboarding`, `/dashboard`.

## Phase 2 — Auth + Onboarding
- Enable Lovable Cloud (Postgres + Auth + Storage + server functions).
- Email/password + Google sign-in, persistent session.
- `profiles` table + role (`learner` | `tutor`), age, parent-consent flag for under-18 monetization.
- Onboarding wizard: role pick → age/grade → interests/hobbies → goals → done.
- Protected `_authenticated` subtree.

## Phase 3 — Profiles + Dashboards
- Learner dashboard: upcoming sessions, saved tutors, messages, progress, notifications.
- Tutor dashboard: sessions, students, earnings (locked until eligible), analytics, calendar.
- Trust system: free-sessions counter + avg rating → unlock paid sessions at 5 sessions & ≥4★ (progress bars + badges).

## Phase 4 — Sessions + Homework Help
- Session model (free/paid, 1-on-1/group, academic/hobby, multi-day schedule).
- Explore page with full filter set (subject, level, price, rating, language, etc.).
- Homework Help lives **inside** Explore (post doubts with images, quick live help).
- Auto-generated meeting link + built-in anonymous video room (waiting room w/ display-name override).
- Session page: tutor achievements (e.g. "BIO: 5"), outcomes, schedule, chat, resources, assignments.

## Phase 5 — Communities
- Discord/Reddit hybrid: channels, chat, pinned resources, polls, voice rooms, hashtag posts.
- Featured-by-members ordering. User-created categories (e.g. "MUN Basics").
- AI moderation flag on offensive language.

## Phase 6 — Messaging, Gamification, AI, Admin
- 1:1 chat with moderation + external-contact filter.
- Streaks, badges, leaderboard.
- AI study planner (**learners only**), tutor recommendations, session summaries, smart matching — via Lovable AI Gateway (Gemini).
- Admin panel: moderation, reports, verification, payouts, featured curation.

## Technical notes
- Stack stays as the template's TanStack Start + React 19 + Tailwind v4 + shadcn (you said "React / Next.js"; TanStack Start is the React full-stack framework already wired here — same capabilities, no migration needed).
- Backend: Lovable Cloud (Supabase under the hood) for auth, DB, storage, RLS.
- AI: Lovable AI Gateway (no key setup needed from you).
- Video: I'll integrate an embeddable WebRTC room (Jitsi Meet external_api) since it requires no API keys and supports anonymous join + display-name change.
- Payments (Phase 3+ unlock): we'll wire Lovable Stripe when you're ready.

## What I need from you to proceed past Phase 1
1. Approve this plan (or tell me what to cut/reorder).
2. Confirm: OK to enable Lovable Cloud in Phase 2? (Required for auth, DB, file uploads, AI.)
3. Confirm video provider: Jitsi (free, anonymous, no keys) vs. Daily.co / LiveKit (need account + key).

I'll start Phase 1 (design system + full landing page + route scaffolding) as soon as you approve.