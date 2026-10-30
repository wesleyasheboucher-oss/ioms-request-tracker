# Scream Team · iOMS Points Tracker

Reps keep iOMS open, work a ticket, then log it here with a short guided flow:
**Order ID → Requested by → Source → Request type → Patient contact → Outcome → Notes**.
Each logged ticket is attached to the signed-in rep and scored. Scores roll up to a weekly leaderboard.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

Production: `npm run build && npm start`.

The first time it starts, it creates a manager login **admin / changeme**. Sign in, change that password
(click your name, top right), then add each rep on **Admin**.

Requires Node 22.13+ (uses the built-in `node:sqlite`). Data lives in `./data/tracker.db`. Back up that folder.

### Environment variables (all optional)

| Variable | Default | Purpose |
| --- | --- | --- |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `admin` / `changeme` | First manager account (used only when there are no users yet) |
| `SESSION_SECRET` | auto-generated in `data/.session-secret` | Signs login cookies |
| `APP_TIMEZONE` | `America/New_York` | Decides which work day a ticket counts toward |
| `DATA_DIR` | `./data` | Where the database lives |

## Scoring (from Scream_Team_Tracker_v4)

- A ticket scores **6 pts** when the rep spoke with the patient (or left **both** a voicemail and a text)
  **and** the outcome is *Resolved – patient confirmed* or *Resolved – warm transfer to collector*.
  Anything else is logged for 0 pts.
- Weekly score = points ÷ weekdays worked (a day counts once the rep logs at least one ticket).
- Tiers: Screamer 100 pts/day ($50), Full Moon 140 ($75), Tier 3 270 ($100). Minimum 4 days to qualify.
- A day with 300+ pts is held until a manager confirms it on **Admin**.
- The wizard warns when an order ID was already logged in the last 30 days.

All options and thresholds are in [`src/lib/config.ts`](src/lib/config.ts).

## Not included yet

QA bonus, PTO/training days, Most Improved, and the backlog counter from the spreadsheet.

## Privacy

The app deliberately doesn't collect patient name or DOB. The order ID is enough to find the record in iOMS,
and the notes field reminds reps to keep PHI out.
