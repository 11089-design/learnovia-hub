# Learnova Impact Certificates and Session Controls

## User-facing changes
- Remove the sparkle “Intel” tab shown in the uploaded room screenshot and keep the remaining room tabs evenly spaced. Add a heart to the existing live reactions.
- Let tutors finish a started class or workshop and submit its measured duration and learner count for review. Offer a separate form for preparation (maximum 30 minutes per session), mentoring, initiatives, and campaigns; submissions do not earn credit until approved.
- Add an admin-only queue to approve or reject contributions and set verified hours, learners supported, subject, and countries served.
- Show approved hours, progress to the six supplied Learnova milestones, supported special achievements, and earned certificates on the dashboard.
- Download milestone certificates as PDFs with name, level, hours, contribution period, skills/subjects, learners supported, unique ID, QR verification, Learnova issuer, founder signature “K Niharikaa,” and a clear note that these are Learnova awards rather than official school-service records.
- Add a public QR verification page that reveals only the certificate’s public details.

## Technical approach
- Use additive Lovable Cloud schema for contribution review and issued certificates, explicit grants/RLS, and an authenticated server function to validate tutor ownership and finish sessions atomically. Never accept approved hours directly from contributors.
- Use the existing protected admin area for review; backend policies remain the authorization boundary. Keep names and certificates private except when a specific public verification code is presented.
- Keep milestone thresholds and badge derivation in a small tested domain module; generate PDFs and QR codes in the browser from earned certificate data.
- Add route metadata to the public verification page and record the impact/certificate architecture rule in `AGENTS.md`.

## Verification
- Test each supplied milestone threshold and the 30-minute preparation cap.
- Check the room tab/reaction source, review authorization, dashboard certificate visibility, PDF download, and public QR lookup.
- Check preview build and runtime logs before completion.
