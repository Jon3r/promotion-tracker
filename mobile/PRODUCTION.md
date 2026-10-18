# Production checklist — Stripe tracker (Flutter)

Complete these before coaches use a live build (`USE_MOCK=false`).

## 1. Firebase project

- [ ] Create Firebase project (Blaze plan for scheduled Functions + Secret Manager)
- [ ] Enable **Authentication → Email/Password**
- [ ] Enable **Cloud Firestore**
- [ ] Enable **Cloud Messaging**
- [ ] Create Auth user for each coach (e.g. `andy@onlyjonesy.com.au`)

```bash
cd mobile
dart pub global activate flutterfire_cli
firebase login
flutterfire configure --project=YOUR_PROJECT_ID --platforms=android
```

This writes `android/app/google-services.json` and replaces `lib/firebase_options.dart`.

Copy project id into `.firebaserc` (see `.firebaserc.example`).

## 2. ClubWorx secret

Never put the key in Flutter or git.

```bash
cd mobile
firebase functions:secrets:set CLUBWORX_ACCOUNT_KEY
```

Local emulator: create gitignored `functions/.secret.local`:

```
CLUBWORX_ACCOUNT_KEY=your_key_here
```

## 3. Allowlist

Seed Firestore (or wait for first poll, which seeds the default coach):

| Collection         | Document ID                 | Fields                              |
| ------------------ | --------------------------- | ----------------------------------- |
| `allowed_coaches`  | `andy@onlyjonesy.com.au`    | `{ "email": "andy@onlyjonesy.com.au" }` |

```bash
# Optional helper (needs gcloud / firebase tools logged in)
./scripts/seed-allowlist.sh andy@onlyjonesy.com.au
```

## 4. Deploy Functions + rules

```bash
cd mobile/functions && npm install && npm test && cd ..
firebase deploy --only functions,firestore
```

Confirm scheduler `pollClassPromotions` is listed in Firebase console (every 2 minutes, `Australia/Sydney`).

## 5. Run production Flutter build

```bash
cd mobile
flutter run --dart-define=USE_MOCK=false --dart-define=FIREBASE_CONFIGURED=true
```

Optional grading dashboard API (Phases 2–3):

```bash
flutter run \
  --dart-define=USE_MOCK=false \
  --dart-define=FIREBASE_CONFIGURED=true \
  --dart-define=GRADING_API_BASE=https://YOUR_VERCEL_APP \
  --dart-define=GRADING_API_SECRET=your_roster_upload_secret
```

`GRADING_API_SECRET` must match Vercel `ROSTER_UPLOAD_SECRET` (or leave empty if the web app has no upload secret).

## 6. Smoke test

- [ ] Sign in as allowlisted coach
- [ ] Timetable loads (live ClubWorx or mock if key missing)
- [ ] Open a class → stripe-due students only
- [ ] Snooze 7 days → candidate marked snoozed
- [ ] Confirm queue after a class end wave
- [ ] Grading tab loads Adults/Kids roster from Next.js (when API configured)

## Notes

- iOS / APNs is out of scope until Android is stable.
- Next.js grading PDFs stay on the website; the phone app is mat-side + roster browse.
