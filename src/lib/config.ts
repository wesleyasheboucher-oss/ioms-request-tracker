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

export const POINTS_PER_COMPLETED_REQUEST = 6;

export const TIERS = [
  { name: "Tier 3", ptsPerDay: 270, prize: 100 },
  { name: "Full Moon", ptsPerDay: 140, prize: 75 },
  { name: "Screamer", ptsPerDay: 100, prize: 50 },
] as const;

// Minimum weekdays worked in a week to qualify for a prize.
export const MIN_DAYS_TO_QUALIFY = 4;

// A single day at or above this many points is held until a manager confirms it.
export const HELD_DAY_POINTS = 300;

// Work days are bucketed in this timezone.
export const TIMEZONE = process.env.APP_TIMEZONE ?? "America/New_York";
