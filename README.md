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
