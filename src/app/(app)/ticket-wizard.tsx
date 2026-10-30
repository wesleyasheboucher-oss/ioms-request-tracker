"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { useRouter } from "next/navigation";
import {
  OUTCOMES,
  POINTS_PER_COMPLETED_REQUEST,
  REQUEST_TYPES,
  REQUESTED_BY,
  SCORING_OUTCOMES,
  SOURCES,
} from "@/lib/config";
import { contactCounts, pointsFor, scoreReason, type ContactFlags } from "@/lib/scoring";
import { Ghost, Pumpkin, Skeleton } from "@/components/spooky";
import { logTicket, lookupOrder, type PriorLog, type TicketInput } from "../actions";

type Draft = {
  orderId: string;
  requestedBy: string | null;
  source: string | null;
  requestType: string | null;
  patientContacted: boolean;
  voicemail: boolean;
  text: boolean;
  contactNotRequired: boolean;
  outcome: string | null;
  notes: string;
};

const EMPTY: Draft = {
  orderId: "",
  requestedBy: null,
  source: null,
  requestType: null,
  patientContacted: false,
  voicemail: false,
  text: false,
  contactNotRequired: false,
  outcome: null,
  notes: "",
};

type ChoiceKey = "requestedBy" | "source" | "requestType" | "outcome";

const STEPS = [
  { key: "orderId", title: "Order ID", prompt: "Which iOMS order is this ticket attached to?" },
  { key: "requestedBy", title: "Requested by", prompt: "Who sent the request?", options: REQUESTED_BY },
  { key: "source", title: "Source", prompt: "Where did the request come in?", options: SOURCES },
  { key: "requestType", title: "Request", prompt: "What was the request?", options: REQUEST_TYPES },
  { key: "contact", title: "Contact", prompt: "How did you reach the patient?" },
  { key: "outcome", title: "Outcome", prompt: "How did it end?", options: OUTCOMES },
  { key: "review", title: "Notes & log", prompt: "Add a note if needed, then log it." },
] as const;

const LAST = STEPS.length - 1;

const CONTACT_OPTIONS = [
  { key: "patientContacted", label: "Spoke with patient", hint: "Reached them live" },
  { key: "voicemail", label: "Left voicemail", hint: "" },
  { key: "text", label: "Sent text", hint: "" },
  { key: "contactNotRequired", label: "Not required", hint: "No patient contact needed" },
] as const;

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
}

// `step` is the question being answered; `reached` is the furthest question
// unlocked so far. Answered questions above stay visible and can be reopened.
type Position = { step: number; reached: number };

export function TicketWizard() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [pos, setPos] = useState<Position>({ step: 0, reached: 0 });
  const [priors, setPriors] = useState<PriorLog[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ points: number; orderId: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const orderRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const activeRef = useRef<HTMLLIElement>(null);

  const { step, reached } = pos;
  const current = STEPS[step];
  const contact = {
    patientContacted: draft.patientContacted,
    voicemail: draft.voicemail,
    text: draft.text,
    notRequired: draft.contactNotRequired,
  };
  const points = draft.outcome ? pointsFor(contact, draft.outcome) : 0;

  const reset = useCallback(() => {
    setDraft(EMPTY);
    setPos({ step: 0, reached: 0 });
    setPriors(null);
    setError(null);
    setDone(null);
  }, []);

  // After answering question i, go to the next unanswered question (or back
  // to where the rep was, if they reopened an earlier answer to change it).
  const advanceFrom = useCallback((i: number) => {
    setError(null);
    setPos((p) => {
      const next = Math.max(p.reached, i + 1);
      return { step: next, reached: next };
    });
  }, []);

  const edit = useCallback((i: number) => {
    setError(null);
    setPos((p) => ({ ...p, step: i }));
  }, []);

  const back = useCallback(() => {
    setError(null);
    setPos((p) => ({ ...p, step: Math.max(0, p.step - 1) }));
  }, []);

  function submitOrderId() {
    const id = draft.orderId.trim();
    if (!id) {
      setError("Paste or type the order ID from iOMS.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const found = await lookupOrder(id);
      setPriors(found);
      advanceFrom(0);
    });
  }

  const choose = useCallback(
    (i: number, key: ChoiceKey, value: string) => {
      setDraft((d) => ({ ...d, [key]: value }));
      advanceFrom(i);
    },
    [advanceFrom],
  );

  const toggleContact = useCallback((key: (typeof CONTACT_OPTIONS)[number]["key"]) => {
    // "Not required" can't be combined with an actual contact.
    setDraft((d) =>
      key === "contactNotRequired"
        ? { ...d, patientContacted: false, voicemail: false, text: false, contactNotRequired: !d.contactNotRequired }
        : { ...d, [key]: !d[key], contactNotRequired: false },
    );
  }, []);

  const submit = useCallback(() => {
    if (!draft.requestedBy || !draft.source || !draft.requestType || !draft.outcome) return;
    const input: TicketInput = {
      ...draft,
      requestedBy: draft.requestedBy,
      source: draft.source,
      requestType: draft.requestType,
      outcome: draft.outcome,
    };
    startTransition(async () => {
      const result = await logTicket(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone({ points: result.points, orderId: draft.orderId.trim() });
      router.refresh();
    });
  }, [draft, router]);

  // Keyboard: number keys pick options, Enter continues, Esc goes back.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) {
        if (e.key === "Enter") {
          e.preventDefault();
          reset();
        }
        return;
      }
      if (e.key === "Escape" && step > 0) {
        e.preventDefault();
        back();
        return;
      }
      if (current.key === "review" && e.key === "Enter" && (e.metaKey || e.ctrlKey || !isTyping(e))) {
        e.preventDefault();
        submit();
        return;
      }
      if (isTyping(e)) return;
      const n = Number(e.key);
      // preventDefault so the key isn't also typed into the next step's
      // auto-focused field.
      if ("options" in current && n >= 1 && n <= current.options.length) {
        e.preventDefault();
        choose(step, current.key, current.options[n - 1]);
      } else if (current.key === "contact") {
        if (n >= 1 && n <= CONTACT_OPTIONS.length) {
          e.preventDefault();
          toggleContact(CONTACT_OPTIONS[n - 1].key);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          advanceFrom(step);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, step, done, back, choose, toggleContact, advanceFrom, submit, reset]);

  useEffect(() => {
    if (done) return;
    if (current.key === "orderId") orderRef.current?.focus();
    if (current.key === "review") notesRef.current?.focus({ preventScroll: true });
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current.key, done]);

  if (done) {
    return (
      <div className="card relative flex flex-col items-center overflow-hidden px-6 py-12 text-center">
        {done.points > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40" aria-hidden>
            {[12, 30, 50, 68, 86].map((left, i) => (
              <Pumpkin
                key={left}
                className="anim-rise absolute bottom-0 w-8"
                style={{ left: `${left}%`, animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
        {done.points > 0 ? (
          <div className="anim-boo mb-3">
            <Ghost className="anim-bob w-24 drop-shadow-[0_0_24px_#9b6bff99]" />
          </div>
        ) : (
          <div className="anim-boo mb-3">
            <Skeleton className="anim-swing h-28" />
          </div>
        )}
        <p
          className={`font-spooky text-5xl tracking-wide ${done.points > 0 ? "text-good" : "text-muted"}`}
        >
          {done.points > 0 ? `Boo! +${done.points}` : "+0"}
        </p>
        <h2 className="mt-2 text-xl font-semibold">
          {done.points > 0 ? "Completed request logged" : "Request logged"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Order <span className="font-mono text-ink">{done.orderId}</span> is saved to your log.
          {done.points === 0 && " It didn't score, but it still counts toward your day."}
        </p>
        <button className="btn-primary mt-6" onClick={reset} autoFocus>
          Log next ticket <span className="kbd border-transparent bg-black/15 text-current">↵</span>
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <ol>
        {STEPS.slice(0, reached + 1).map((s, i) => {
          const active = i === step || (s.key === "review" && reached === LAST);
          const isLastShown = i === reached;
          return (
            <li key={s.key} ref={i === step ? activeRef : undefined} className="relative flex gap-4 scroll-mt-24">
              {/* Timeline marker and connecting line */}
              <div className="flex flex-col items-center">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    active ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"
                  }`}
                >
                  {active ? i + 1 : "✓"}
                </span>
                {!isLastShown && <span className="my-1 w-0.5 flex-1 rounded bg-line" />}
              </div>

              <div className={`min-w-0 flex-1 ${isLastShown ? "" : "pb-4"}`}>
                {active ? (
                  <StepBody
                    s={s}
                    i={i}
                    draft={draft}
                    setDraft={setDraft}
                    contact={contact}
                    points={points}
                    pending={pending}
                    orderRef={orderRef}
                    notesRef={notesRef}
                    onOrderSubmit={submitOrderId}
                    onChoose={choose}
                    onToggleContact={toggleContact}
                    onContinue={() => advanceFrom(i)}
                    onSubmit={submit}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => edit(i)}
                    className="group flex w-full items-center gap-3 rounded-lg py-1 text-left"
                  >
                    <span className="w-28 shrink-0 text-sm text-muted">{s.title}</span>
                    <span className={`min-w-0 flex-1 truncate font-medium ${s.key === "orderId" ? "font-mono" : ""}`}>
                      {summaryFor(s.key, draft)}
                    </span>
                    <span className="text-xs text-muted group-hover:text-accent">Change</span>
                  </button>
                )}
                {!active && s.key === "orderId" && priors && priors.length > 0 && (
                  <PriorWarning priors={priors} orderId={draft.orderId} />
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {error && <p className="mt-4 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

      {reached > 0 && (
        <div className="mt-5 flex items-center gap-4 border-t border-line pt-4 text-sm">
          <button className="text-muted hover:text-ink" onClick={reset}>
            Start over
          </button>
          <span className="ml-auto hidden text-xs text-muted sm:inline">
            <span className="kbd">1</span>–<span className="kbd">9</span> pick · <span className="kbd">↵</span>{" "}
            continue · <span className="kbd">Esc</span> back
          </span>
        </div>
      )}
    </div>
  );
}

function StepBody({
  s,
  i,
  draft,
  setDraft,
  contact,
  points,
  pending,
  orderRef,
  notesRef,
  onOrderSubmit,
  onChoose,
  onToggleContact,
  onContinue,
  onSubmit,
}: {
  s: (typeof STEPS)[number];
  i: number;
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  contact: ContactFlags;
  points: number;
  pending: boolean;
  orderRef: RefObject<HTMLInputElement | null>;
  notesRef: RefObject<HTMLTextAreaElement | null>;
  onOrderSubmit: () => void;
  onChoose: (i: number, key: ChoiceKey, value: string) => void;
  onToggleContact: (key: (typeof CONTACT_OPTIONS)[number]["key"]) => void;
  onContinue: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="anim-slide-in pb-2">
      <p className="text-xs font-semibold tracking-wide text-accent uppercase">{s.title}</p>
      <h2 className="mt-0.5 mb-4 text-lg font-semibold">{s.prompt}</h2>

      {s.key === "orderId" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onOrderSubmit();
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <input
            ref={orderRef}
            value={draft.orderId}
            onChange={(e) => setDraft((d) => ({ ...d, orderId: e.target.value }))}
            placeholder="e.g. 234775"
            className="input font-mono text-lg sm:max-w-xs"
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn-primary" disabled={pending}>
            {pending ? "Checking…" : "Continue"}{" "}
            <span className="kbd border-transparent bg-black/15 text-current">↵</span>
          </button>
        </form>
      )}

      {"options" in s && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {s.options.map((opt, n) => (
            <OptionButton
              key={opt}
              index={n + 1}
              label={opt}
              selected={draft[s.key] === opt}
              onClick={() => onChoose(i, s.key, opt)}
              tone={
                s.key === "outcome" && SCORING_OUTCOMES.includes(opt) && contactCounts(contact)
                  ? "good"
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {s.key === "outcome" && (
        <p className={`mt-3 text-sm ${contactCounts(contact) ? "text-muted" : "text-warn"}`}>
          {contactCounts(contact)
            ? "The two Resolved outcomes earn points."
            : "Heads up: without patient contact (or voicemail + text, or not required) this won't score."}
        </p>
      )}

      {s.key === "contact" && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CONTACT_OPTIONS.map((c, n) => (
              <OptionButton
                key={c.key}
                index={n + 1}
                label={c.label}
                hint={c.hint}
                selected={draft[c.key]}
                checkbox
                onClick={() => onToggleContact(c.key)}
              />
            ))}
          </div>
          <p className={`mt-3 text-sm ${contactCounts(contact) ? "text-good" : "text-muted"}`}>
            {contactCounts(contact)
              ? "✓ Contact counts toward points."
              : "Pick all that apply. To count, speak with the patient, leave both a voicemail and a text, or mark it not required."}
          </p>
          <button className="btn-primary mt-4" onClick={onContinue}>
            Continue <span className="kbd border-transparent bg-black/15 text-current">↵</span>
          </button>
        </>
      )}

      {s.key === "review" && (
        <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div>
            <label className="label" htmlFor="notes">
              Notes <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="notes"
              ref={notesRef}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={3}
              maxLength={500}
              className="input resize-none"
              placeholder="e.g. Explained post-delivery billing, emailed itemized statement"
            />
            <p className="mt-1.5 text-xs text-muted">
              Keep patient names, DOBs and card numbers out of notes. The order ID is enough to find it in iOMS.
            </p>
          </div>
          <div className={`flex flex-col rounded-xl p-4 ${points > 0 ? "bg-good-soft" : "bg-surface-2"}`}>
            <p className={`text-3xl font-bold ${points > 0 ? "text-good" : "text-muted"}`}>
              {points > 0 ? `+${points}` : "0"} <span className="text-base font-medium">pts</span>
            </p>
            <p className="mt-1 mb-4 text-sm text-muted">{scoreReason(contact, draft.outcome)}</p>
            <button className="btn-primary mt-auto" onClick={onSubmit} disabled={pending}>
              {pending ? "Saving…" : "Log ticket"}{" "}
              <span className="kbd border-transparent bg-black/15 text-current">↵</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function summaryFor(key: (typeof STEPS)[number]["key"], d: Draft) {
  switch (key) {
    case "orderId":
      return d.orderId.trim();
    case "contact": {
      if (d.contactNotRequired) return "Not required";
      const parts = [d.patientContacted && "Spoke", d.voicemail && "VM", d.text && "Text"].filter(Boolean);
      return parts.length ? parts.join(" + ") : "No contact";
    }
    case "review":
      return null;
    default:
      return d[key];
  }
}

function OptionButton({
  index,
  label,
  hint,
  selected,
  checkbox,
  tone,
  onClick,
}: {
  index: number;
  label: string;
  hint?: string;
  selected: boolean;
  checkbox?: boolean;
  tone?: "good";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 ${
        selected
          ? "border-accent bg-accent-soft shadow-[0_0_14px_-4px_var(--accent)]"
          : "border-line bg-surface-2 hover:border-accent/60 hover:shadow-[0_0_14px_-6px_var(--accent)]"
      }`}
    >
      <span className="kbd shrink-0">{index}</span>
      <span className="flex-1">
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {checkbox && (
        <span
          className={`grid size-5 shrink-0 place-items-center rounded-md border text-xs ${
            selected ? "border-accent bg-accent text-accent-ink" : "border-line"
          }`}
        >
          {selected && "✓"}
        </span>
      )}
      {tone === "good" && !checkbox && (
        <span className="shrink-0 rounded-full bg-good-soft px-2 py-0.5 text-xs font-semibold text-good">
          +{POINTS_PER_COMPLETED_REQUEST}
        </span>
      )}
    </button>
  );
}

function PriorWarning({ priors, orderId }: { priors: PriorLog[]; orderId: string }) {
  return (
    <div className="mt-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-sm">
      <p className="font-medium text-warn">
        Order {orderId.trim()} was already logged in the last 30 days
      </p>
      <ul className="mt-1 space-y-0.5 text-muted">
        {priors.map((p, i) => (
          <li key={i}>
            {p.work_date} · {p.display_name} · {p.request_type} · {p.outcome}
            {p.points > 0 && ` (+${p.points})`}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-muted">Re-posting or fixing work that was already done doesn&apos;t score again.</p>
    </div>
  );
}
