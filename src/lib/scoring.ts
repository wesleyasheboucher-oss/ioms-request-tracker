import {
  POINTS_PER_COMPLETED_REQUEST,
  SCORING_OUTCOMES,
  TIERS,
} from "./config";

export type ContactFlags = {
  patientContacted: boolean;
  voicemail: boolean;
  text: boolean;
  notRequired: boolean;
};

// A request scores when the patient was reached (or both a voicemail AND a
// text were left, or no contact was required) and the outcome is one of the
// two "Resolved" outcomes.
export function contactCounts(c: ContactFlags) {
  return c.notRequired || c.patientContacted || (c.voicemail && c.text);
}

export function pointsFor(c: ContactFlags, outcome: string) {
  return contactCounts(c) && SCORING_OUTCOMES.includes(outcome)
    ? POINTS_PER_COMPLETED_REQUEST
    : 0;
}

// Plain-language reason a request did or didn't score, shown in the wizard.
export function scoreReason(c: ContactFlags, outcome: string | null) {
  if (!contactCounts(c)) {
    return "No points yet: reach the patient, leave both a voicemail and a text, or mark contact not required.";
  }
  if (!outcome) return "Pick an outcome.";
  if (!SCORING_OUTCOMES.includes(outcome)) {
    return `"${outcome}" doesn't score. Only Resolved outcomes earn points.`;
  }
  return `Completed all the way through: +${POINTS_PER_COMPLETED_REQUEST} pts.`;
}

export function tierFor(ptsPerDay: number) {
  return TIERS.find((t) => ptsPerDay >= t.ptsPerDay) ?? null;
}

export function nextTierFor(ptsPerDay: number) {
  return [...TIERS].reverse().find((t) => ptsPerDay < t.ptsPerDay) ?? null;
}
