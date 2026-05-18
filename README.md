# BJJ Grading Report

A Next.js app for coaches to visualise student promotion data from Excel exports. Upload separate **Adults** and **Kids** spreadsheets; students are grouped by belt colour with upcoming promotion dates highlighted.

Excel is parsed in the browser. **Share links** store a copy on the server (Redis) so other coaches can view without uploading.

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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm test` | Run unit tests (rank/date parsing) |

## Workflow

1. Export promotion reports from your gym software as Excel.
2. Upload **Adults spreadsheet** and **Kids spreadsheet** on the home page.
3. Switch between **Adults** and **Kids** tabs.
4. Use **Summary by belt** for counts; expand **Students by belt** for full details.
5. Search by name, email, or rank; sort by promotion date or name.
6. Rows with a promotion in the next 14 days are highlighted in amber.
7. **Export PDF** — names only, grouped by belt colour with belt-themed colours (respects active filters).
8. **Deduplication** — duplicate rows (same email, or same name + phone) are merged on upload, keeping the most recent promotion date.
9. **Create share link** — publish so others can open a read-only report at `/view/…`.

Re-upload files whenever your spreadsheets change.

## Share a report with other coaches

1. Upload Adults and/or Kids data on the home page.
2. Click **Create share link** (optionally enter a publish password if configured).
3. Copy the link (e.g. `https://your-app.vercel.app/view/abc123…`) and send it to coaches.
4. They open the link — **view only** (filters + export work; no upload).

### Vercel setup (required for share links in production)

1. Deploy to [Vercel](https://vercel.com).
2. In the Vercel project, add **Upstash Redis** from the [Marketplace](https://vercel.com/marketplace?category=storage&search=redis) (sets `KV_REST_API_URL` and `KV_REST_API_TOKEN`).
3. Optional: set `SHARE_UPLOAD_SECRET` in Environment Variables so only people with the password can publish links.

**Local development:** share links save to `.data/shares/` without Redis.

Share links expire after **90 days**.

## Export PDF reports

- **Export PDF (adults|kids)** — current tab; **names only**, sorted alphabetically within each belt section.
- **Export PDF (both)** — Adults then Kids (separate sections) when both are loaded.

Each belt uses a coloured header and tinted background (blue, purple, white, kids belts, etc.). Filters (search, belt, stripes) apply to the export.

## Deduplication

On upload, duplicates are removed when they share the same **email**, or the same **name + phone** if email is empty. The row with the latest **promotion date** is kept. A message shows how many duplicates were removed.

## Saving uploads

After you upload a spreadsheet, the **parsed student data is saved automatically** in your browser’s **local storage** (not on a server). When you return to the app on the same device and browser, your Adults and Kids data reload without uploading again.

- **Update data:** upload a new Excel file for that category — it replaces the saved copy.
- **Remove one file:** use **Remove** on the upload card.
- **Remove everything:** use **Clear all saved data** in the header.

Saved data is per browser (Chrome vs Safari, or another computer won’t see it). Clearing site data in your browser will delete it too.

## Local data folder

You can keep `.xlsx` files in a `data/` folder for your own reference. This folder is gitignored — do not commit student PII.

## Deploy

```bash
npm run build
```

Deploy the project to [Vercel](https://vercel.com) or any host that supports Next.js.
