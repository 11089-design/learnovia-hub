# Learnova roadmap

## In progress (this turn)
- [ ] Consistent minimal top navbar across every route (single `SiteHeader`, 3 grouped menus + mobile sheet)
- [ ] Theme persistence without flash (inline pre-hydration script)
- [ ] Screen share: works or clearly explains the iframe/browser limitation + "open room in new tab"
- [ ] Poll votes persist (delete/update policies + upsert instead of delete+insert)
- [ ] Whiteboard no longer goes black a couple of seconds after drawing
- [ ] Live transcript captured during a session, stored, and used for a real AI overview
- [ ] Session transcript/recap accessible afterwards from the profile / past sessions
- [ ] Kids-mode checkbox in profile settings

## Later
- [ ] Full A/V recording playback (needs LiveKit egress storage) — transcript + AI recap ships first

## Update
- [x] LiveCaptions wired into the room (import fixed)
- [x] AI recap now reads the spoken transcript first (session_transcripts), with a clear error when nothing was captured
- [x] Recap + downloadable transcript tab on ended sessions
- [x] One shared SiteHeader on every page (kids, admin, leaderboard, study plan, messages, session detail, settings)
- [x] Kids mode toggle in Settings
- [x] Theme boot no longer causes a hydration mismatch (color-scheme moved to CSS)
- [ ] Full A/V recording/replay still needs LiveKit egress + storage config
