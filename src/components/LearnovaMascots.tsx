/**
 * Learnova's own mascot + icon set.
 *
 * Hand-drawn inline SVGs so nothing in the app relies on system emoji — they
 * inherit the active theme through `currentColor` and the `--brand` / `--accent`
 * tokens, so the same mascot reads lavender, neon or candy automatically.
 */
import type { SVGProps } from "react";

type MascotProps = SVGProps<SVGSVGElement> & { className?: string };

const base = (props: MascotProps) => ({
  viewBox: "0 0 48 48",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  ...props,
  className: props.className ?? "h-8 w-8",
});

/** Wise little owl — Learnova's main study buddy. */
export function OwlMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 5c9 0 15 6.6 15 16.5S33 43 24 43 9 31.4 9 21.5 15 5 24 5Z" fill="currentColor" opacity=".16" />
      <path d="M24 7c8 0 13.5 6 13.5 15S32 41 24 41 10.5 31 10.5 22 16 7 24 7Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="18" cy="21" r="4.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="30" cy="21" r="4.6" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="21.6" r="1.7" fill="currentColor" />
      <circle cx="30" cy="21.6" r="1.7" fill="currentColor" />
      <path d="M24 26.5l-2.4 3h4.8l-2.4-3Z" fill="currentColor" />
      <path d="M12.5 10.5 16 15M35.5 10.5 32 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M19 34.5c1.6 1.6 3.4 2.4 5 2.4s3.4-.8 5-2.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Sprout — growth, beginner-friendly. */
export function SproutMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 42V22" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M24 24c-8 0-12-3.4-12-9 6.4 0 12 2.6 12 9Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M24 21c0-7 4.6-11 12-11 0 7-4.6 11-12 11Z" fill="currentColor" opacity=".35" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M15 42h18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Rocket — crash courses, fast progress. */
export function RocketMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 4c6 5.4 9 12 9 19.5L24 32l-9-8.5C15 16 18 9.4 24 4Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="24" cy="19" r="3.6" stroke="currentColor" strokeWidth="2.2" />
      <path d="M15 24 9 30l6 1M33 24l6 6-6 1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 34c1 4 1.5 6.6 3 9 1.5-2.4 2-5 3-9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Numbers / counting. */
export function NumbersMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <rect x="7" y="7" width="34" height="34" rx="9" fill="currentColor" opacity=".15" />
      <rect x="7" y="7" width="34" height="34" rx="9" stroke="currentColor" strokeWidth="2.2" />
      <path d="M17 18h14M17 24h14M17 30h8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="31.5" cy="30" r="2.2" fill="currentColor" />
    </svg>
  );
}

/** Open book — reading & essays. */
export function BookMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 13c-4-3-8.5-4-14-4v27c5.5 0 10 1 14 4 4-3 8.5-4 14-4V9c-5.5 0-10 1-14 4Z" fill="currentColor" opacity=".16" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M24 13v27" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Beaker — science & experiments. */
export function BeakerMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M17 7h14v9l7 17a4 4 0 0 1-3.6 5.6H13.6A4 4 0 0 1 10 32l7-16V7Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M13.5 27h21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="20" cy="33" r="2" fill="currentColor" />
      <circle cx="27.5" cy="35" r="1.5" fill="currentColor" />
      <path d="M15 7h18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Palette — art, clay, crafts. */
export function PaletteMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 6c10 0 18 6.7 18 15 0 5.6-4.3 8-8.5 8H30c-2.5 0-4 2-3.3 4.4.8 2.8-1 5.6-4 5.6C13.4 39 6 31.5 6 21.6C6 12.8 14 6 24 6Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="16" cy="18" r="2.3" fill="currentColor" />
      <circle cx="23" cy="14" r="2.3" fill="currentColor" />
      <circle cx="31" cy="17" r="2.3" fill="currentColor" />
      <circle cx="15" cy="27" r="2.3" fill="currentColor" />
    </svg>
  );
}

/** Speech bubble with waves — language & speaking. */
export function SpeakMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 12a5 5 0 0 1 5-5h20a5 5 0 0 1 5 5v13a5 5 0 0 1-5 5H21l-9 8v-8h-3V12Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M17 18h6M17 23h14M27 18h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Shield with a tick — verified tutors & safety. */
export function ShieldMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 5l15 5v13c0 9-6.3 16.4-15 20-8.7-3.6-15-11-15-20V10l15-5Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m17 24 5 5 10-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Laptop — coding tracks. */
export function LaptopMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <rect x="10" y="9" width="28" height="20" rx="4" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.2" />
      <path d="M6 33h36l-3 5H9l-3-5Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="m20 15-4 4 4 4M28 15l4 4-4 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Compass / protractor — SAT & maths prep. */
export function CompassMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 38 24 8l16 30H8Z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M17 38a10 10 0 0 1 14 0" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 8v22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Bolt — crash courses / streaks. */
export function BoltMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M27 4 12 27h9l-3 17 18-24h-10l4-16H27Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

/** Cap — graduation / training umbrella. */
export function CapMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M24 9 44 18l-20 9-20-9 20-9Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M13 22v10c0 3.3 5 6 11 6s11-2.7 11-6V22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M40 20v11" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Little chick — Learnova Kids empty states. */
export function ChickMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <circle cx="24" cy="26" r="14" fill="currentColor" opacity=".16" />
      <circle cx="24" cy="26" r="14" stroke="currentColor" strokeWidth="2.2" />
      <circle cx="19" cy="23" r="1.9" fill="currentColor" />
      <circle cx="29" cy="23" r="1.9" fill="currentColor" />
      <path d="m24 27 3.5 2.5L24 32l-3.5-2.5L24 27Z" fill="currentColor" />
      <path d="M18 12c1.6-3 4-4.5 6-4.5S28.4 9 30 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Star buddy — rewards, ratings, celebrations. */
export function StarMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="m24 6 5.4 11.4 12.6 1.7-9.2 8.7 2.3 12.4L24 34.4 12.9 40.2l2.3-12.4L6 19.1l12.6-1.7L24 6Z" fill="currentColor" opacity=".2" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="20.5" cy="22" r="1.5" fill="currentColor" />
      <circle cx="27.5" cy="22" r="1.5" fill="currentColor" />
      <path d="M21 27c1.8 1.4 4.2 1.4 6 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Trophy — leaderboard / trusted tutor. */
export function TrophyMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 8h20v9c0 6-4.5 10-10 10S14 23 14 17V8Z" fill="currentColor" opacity=".18" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M14 11H9v3c0 3.3 2.2 5.6 5 6M34 11h5v3c0 3.3-2.2 5.6-5 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M24 27v7M16 40h16l-2-6H18l-2 6Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Clay blob — crafts zone. */
export function ClayMascot(props: MascotProps) {
  return (
    <svg {...base(props)}>
      <path d="M11 30c-3-8 3-19 13-19s16 9 13 19c-2.3 6.6-7.6 9-13 9s-10.7-2.4-13-9Z" fill="currentColor" opacity=".16" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M17 25c2-2.6 4.4-4 7-4s5 1.4 7 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="19" cy="18" r="1.7" fill="currentColor" />
      <circle cx="29" cy="18" r="1.7" fill="currentColor" />
    </svg>
  );
}

export const KIDS_MASCOTS = [OwlMascot, ChickMascot, StarMascot, RocketMascot, ClayMascot, BeakerMascot];
