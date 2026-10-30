# Scream Team · iOMS Points Tracker

Reps keep iOMS open, work a ticket, then log it here with a short guided flow:
**Order ID → Requested by → Source → Request type → Patient contact → Outcome → Notes**.
Each logged ticket is attached to the signed-in rep and scored. Scores roll up to a weekly leaderboard.

## Database: Supabase

Data is stored in a Supabase Postgres database. The app creates its tables automatically on first use,
in their own `ioms` schema (row level security on, so Supabase's public API can't read them).

1. In Supabase, click **Connect** at the top of your project and copy the **Transaction pooler** connection
   string (port `6543`). Replace `[YOUR-PASSWORD]` with your database password
   (reset it under Project Settings → Database if you don't have it).
2. Use that string as `DATABASE_URL` (below).

Use the transaction pooler, not the "Direct connection" string: the direct one is IPv6-only and won't
connect from Netlify.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Supabase transaction pooler connection string |
| `SESSION_SECRET` | yes (production) | Long random string that signs login cookies. Generate with `openssl rand -hex 32` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | recommended | First manager login, created only when there are no users yet. Defaults to `admin` / `changeme` |
| `APP_TIMEZONE` | no | Decides which work day a ticket counts toward. Defaults to `America/New_York` |

## Deploy on Netlify

1. Site configuration → **Environment variables**: add the variables above.
2. **Deploys → Trigger deploy → Clear cache and deploy site**.
3. Open the site, sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD`, change the password (click your name,
   top right), then add each rep on **Admin**.

## Run locally

```bash
cp .env.example .env.local   # then fill in DATABASE_URL (SESSION_SECRET is optional locally)
npm install
npm run dev                  # http://localhost:3000
```

Local and Netlify share the same Supabase data when they use the same `DATABASE_URL`.

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
