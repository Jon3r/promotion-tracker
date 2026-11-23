# BJJ Grading Report

A Next.js app for coaches to visualise student promotion data from Excel exports. Upload separate **Adults** and **Kids** spreadsheets; students are grouped by belt colour with upcoming promotion dates highlighted.

Excel is parsed in the browser. The **live roster** is stored in **Vercel Postgres** so every coach sees the same data on any device.

## Requirements

- Node.js 18+
- Two Excel files (`.xlsx` or `.xls`) with these columns:

  `First Name`, `Last Name`, `Current Rank`, `Next Rank`, `Belt Size`, `Promotion Date`, `Email`, `Phone Number`, `Most Recent Promotion`

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), then upload your Adults and/or Kids spreadsheets.

For cloud sync locally, copy `POSTGRES_URL` into `.env.local` (see Vercel Postgres setup below) or use `vercel env pull .env.local`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm test` | Run unit tests (rank/date parsing) |

## Workflow

1. Export promotion reports from your gym software as Excel.
2. Upload **Adults** and/or **Kids** on the home page — data **auto-saves to the cloud** when Postgres is connected.
3. Other coaches open the **same site URL** on any device to see the latest roster.
4. Switch between **Adults** and **Kids** tabs; filter, search, export PDF.
5. Optional: **Create share link** for a frozen read-only snapshot at `/view/…`.

## Vercel Postgres setup (required for cross-device sync)

1. Deploy to [Vercel](https://vercel.com).
2. Project → **Storage** → **Create database** → **Postgres**.
3. Connect it to this project (`POSTGRES_URL` is added automatically).
4. Open the database **Query** tab and run [`scripts/init-db.sql`](scripts/init-db.sql).
5. Optional: **Settings → Environment Variables** → `ROSTER_UPLOAD_SECRET` (password required to upload/save).
6. **Redeploy** the project.

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URL` | Pooled connection (app runtime) |
| `POSTGRES_URL_NON_POOLING` | Migrations / Query tab |
| `ROSTER_UPLOAD_SECRET` | Optional password for saves and share publish |

## ClubWorx Integration

The app can sync roster data directly from ClubWorx API instead of uploading Excel files.

### Setup

1. Get your ClubWorx API key from ClubWorx settings
2. Add to Vercel Environment Variables:
   - `CLUBWORX_ACCOUNT_KEY` - Your ClubWorx API key (required)
   - `CLUBWORX_INCREMENTAL_SYNC` - Enable incremental sync (default: enabled, set to `"0"` to disable)
   - `CLUBWORX_PAGE_DELAY_MS` - Delay between API requests in ms (default: `500`, increase to `1000` or higher if hitting rate limits)
   - `CLUBWORX_PAGE_SIZE` - Records per page (default: `50`)
   - `CLUBWORX_MAX_RETRIES` - Max retry attempts (default: `4`)
   - `CLUBWORX_EXCLUDE_MEMBER_STATUSES` - Comma-separated statuses to exclude (default: `"Cancelled"`)
3. Trigger sync at `/api/roster/sync` (requires `ROSTER_UPLOAD_SECRET`)

### Rate Limiting

ClubWorx API has rate limits. If you see **429 "Too Many Requests"** errors:

1. **Ensure incremental sync is enabled** (default) - syncs only changed records
2. **Increase page delay**: Set `CLUBWORX_PAGE_DELAY_MS=1000` or higher
3. **Wait a few minutes** before retrying - the system uses exponential backoff
4. The sync will NOT fall back to a full sync on rate limit errors to avoid making more requests

See [clubworkxapi.md](clubworkxapi.md) for complete ClubWorx API documentation.

**Local development without Postgres:** uploads stay in browser localStorage only; share links save to `.data/shares/`.

## Share links (optional snapshots)

1. Upload data (saved to cloud roster).
2. Click **Create share link** for a point-in-time URL (`/view/abc123…`).
3. Share links expire after **90 days**.

Coaches do **not** need a share link to see the live roster — only the main site URL.

## Export PDF reports

- **Export PDF (adults|kids)** — names only, grouped by belt colour with belt-themed colours.
- **Export PDF (both)** — Adults and Kids in one file.

Filters (search, belt, stripes) apply to the export.

## Deduplication

On upload, duplicates are removed when they share the same **email**, or the same **name + phone** if email is empty. The row with the latest **promotion date** is kept.

## Deploy

```bash
npm run build
```

Deploy to [Vercel](https://vercel.com). Ensure Postgres is connected and `scripts/init-db.sql` has been run.

## Raspberry Pi Gym Display & Round Timer

The app includes a TV-scale BJJ round timer, live ClubWorx class check-in board, and mobile coach remote:

- `/gym` — Unified **Split** TV display (Round Timer + Live Check-In side by side), with top-right mode pill (`Split` | `Timer` | `Check-In`), keyboard shortcuts (`Space` start/pause, `R` reset, `F` fullscreen, `1`/`2`/`3` modes), audio cues, and QR code settings drawer.
- `/timer` — Full-screen **Round Timer** (still plays corner toast + check-in chime when students arrive).
- `/check-in` — Full-screen **Check-In** display with mode switcher.
- `/remote` — Mobile-friendly **Coach Mat Remote** synced via `/api/timer` (persisted in Postgres `gym_timer_state` when `POSTGRES_URL` is configured, with in-memory fallback locally). The remote reconnects on phone wake / network restore, polls faster while a round is running, and shows a Connected / Reconnecting status pill.

### Timer audio overrides

Cues default to synthesized Web Audio tones. Drop MP3s into `public/sounds/` (see that folder’s README). Round voices must be named `round1.mp3` … `round9.mp3`; `round.mp3` is used as the start bell when `start.mp3` is missing. Also supported: `ready.mp3`, `start.mp3`, `soon.mp3`, `finish.mp3`, `checkin.mp3`, and optional `announce-*.mp3`. Missing files fall back to the synth.

### Raspberry Pi Kiosk Setup

1. **Hosted Vercel mode (recommended — no Node server or API keys on the Pi):**

```bash
./pi/setup-pi.sh https://promotion-tracker-rose.vercel.app/gym
```

2. **Local Pi mode (runs Next.js on `http://localhost:3000/gym` via `systemd`):**

```bash
./pi/setup-pi.sh --local
```

You can also launch kiosk mode manually anytime with `./pi/kiosk.sh [URL]`.

