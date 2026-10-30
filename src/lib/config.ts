// Dropdown options and scoring rules, taken from the LISTS, POINT MAP and
// SETTINGS tabs of Scream_Team_Tracker_v4. Change values here only after the
// rule change has been announced to the team.

export const REQUESTED_BY = [
  "CS",
  "ISR",
  "HRC",
  "EVA",
  "RCM",
  "Patient Support Specialist",
  "Patient Collections",
  "Patient (direct)",
  "Co-worker / Other",
] as const;

export const SOURCES = ["iOMS", "Teams", "Email", "Call Transfer", "EOD", "Other"] as const;

export const REQUEST_TYPES = [
  "Billing question",
  "Itemized statement",
  "Refund request",
  "Payment plan",
  "Mail invoice",
  "Chargeback",
  "Insurance / EOB question",
  "Balance dispute",
  "Other",
] as const;

export const OUTCOMES = [
  "Resolved – patient confirmed",
  "Resolved – warm transfer to collector",
  "Redirected",
  "Closed",
  "Pending",
] as const;

// Only these two outcomes can score.
export const SCORING_OUTCOMES: readonly string[] = [OUTCOMES[0], OUTCOMES[1]];

// Import: status values that look like these are pre-ticked as "resolved".
export const RESOLVED_STATUS_PATTERN = /resolv|complet|confirm|warm transfer/i;

export const POINTS_PER_COMPLETED_REQUEST = 6;

export const TIERS = [
  { name: "Tier 3", ptsPerDay: 270, prize: 100 },
  { name: "Full Moon", ptsPerDay: 140, prize: 75 },
  { name: "Screamer", ptsPerDay: 100, prize: 50 },
] as const;

// Minimum weekdays worked in a week to qualify for a prize.
export const MIN_DAYS_TO_QUALIFY = 4;
export const MIN_DAYS_HOLIDAY_WEEK = 3;

// Office holidays (YYYY-MM-DD). A week containing one needs fewer days.
export const HOLIDAYS = ["2026-09-07"];

// Prizes pay for weeks starting on/after this Monday. Earlier weeks are
// history: scores show, prizes are $0.
export const GAME_START = "2026-10-19";

// 6-pts-per-request scoring started this day. In its week only days from
// here on count, and both remaining days are needed to qualify.
export const NEW_SCORING_START = "2026-10-29";
export const MIN_DAYS_NEW_SCORING_WEEK = 2;

// A single day at or above this many points is held until a manager confirms it.
export const HELD_DAY_POINTS = 300;

// Work days are bucketed in this timezone.
export const TIMEZONE = process.env.APP_TIMEZONE ?? "America/New_York";
