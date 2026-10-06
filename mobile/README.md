# Stripe tracker (Flutter, Android-first)

Admin app for coaches on the mat. It uses the ClubWorx timetable, notifies when a class is running or about to finish, lets the coach **delay a stripe 7 / 14 / 21 days**, then asks **whether that person was promoted** after class.

Only students **due the next stripe on the same belt** are included. Belt-ups are never shown.

The existing Next.js grading dashboard is unchanged. This app talks to **Firebase Cloud Functions**, which hold the ClubWorx `account_key` and send Android FCM. A **Grading** tab can also read the shared Vercel roster (see Phases 2–3 in [PRODUCTION.md](PRODUCTION.md)).

**Go live:** follow [PRODUCTION.md](PRODUCTION.md) (Firebase, ClubWorx secret, allowlist, deploy).


## Demo mode (no Firebase required)

```bash
cd mobile
flutter pub get
flutter test
flutter run
```

Default is `--dart-define=USE_MOCK=true`. Sign in as:

| Field | Value |
| --- | --- |
| Email | `andy@onlyjonesy.com.au` |
| Password | any non-empty string (e.g. `demo`) |

You get a demo timetable, delay chips, a confirm-queue item, and a sample Grading roster.

Use an **Android emulator with the Google Play image**, or a physical phone. iOS / APNs is out of scope for v1.

Web is included only so the demo UI can run in Chrome (`flutter run -d chrome`). Android remains the product target.

## Firebase + `google-services.json` (best path)

Do this on the Mac that has Android Studio. Do not hand-copy files unless the CLI fails.

1. Create a Firebase project (for example `clubworx-stripe-tracker`). **Blaze** is required for scheduled Cloud Functions and Secret Manager.
2. Enable **Authentication → Email/Password**, **Cloud Firestore**, and **Cloud Messaging**.
3. From `mobile/`:

```bash
dart pub global activate flutterfire_cli
firebase login
flutterfire configure --project=clubworx-stripe-tracker --platforms=android
```

That writes `android/app/google-services.json` and replaces `lib/firebase_options.dart`. Those files are safe to commit (they are not the ClubWorx key).

4. Create the Auth user `andy@onlyjonesy.com.au` in Firebase console → Authentication → Users.
5. The first Functions poll also seeds Firestore `allowed_coaches/andy@onlyjonesy.com.au`. You can create that document yourself if you want sign-in to work before the first poll.

Then run the app against live Functions:

```bash
flutter run --dart-define=USE_MOCK=false --dart-define=FIREBASE_CONFIGURED=true
```

After `flutterfire configure`, `DefaultFirebaseOptions.currentPlatform` exists. Keep `FIREBASE_CONFIGURED=true` (or edit `lib/firebase_options.dart` so `configured` is `true`).

## ClubWorx `account_key`

Never put it in Flutter, `google-services.json`, or git.

| Environment | Where to store it |
| --- | --- |
| Deployed Functions | `cd mobile && firebase functions:secrets:set CLUBWORX_ACCOUNT_KEY` — Google Cloud Secret Manager. Functions read `CLUBWORX_ACCOUNT_KEY`. |
| Local emulator | gitignored `mobile/functions/.secret.local` containing `CLUBWORX_ACCOUNT_KEY=...` |
| Next.js dashboard | Keep using Vercel `CLUBWORX_ACCOUNT_KEY`. Same value, separate store. |

Without a key, Functions use the same **mock ClubWorx** dataset as the Flutter demo (useful for emulator testing).

```bash
cd mobile/functions
npm install
npm test
cd ..
firebase emulators:start --only auth,functions,firestore
```

## Deploy Functions

```bash
cd mobile/functions && npm install && npm test && cd ..
firebase deploy --only functions,firestore
```

The scheduler runs **every 2 minutes** (`Australia/Sydney`):

- **Wave 1** — class running or last 10 minutes: one push listing stripe-due students.
- **Wave 2** — 2 minutes after class end: one push per person asking if the stripe happened.

To stay under the ClubWorx rate limit (shared with the web dashboard), Functions send one ClubWorx request at a time, cache `member_styles` for 15 minutes and `styles` for 6 hours per instance, and the scheduler only loads `member_styles` when a class is running or ended in the last 30 minutes. Tune with `CLUBWORX_REQUEST_GAP_MS`, `CLUBWORX_MEMBER_STYLES_TTL_MS`, `CLUBWORX_STYLES_TTL_MS`, `CLUBWORX_BOOKINGS_TTL_MS`.

Class length defaults to **60 minutes** if ClubWorx has no `ends_at` / duration. Confirming **Yes** tries `PUT/PATCH /api/v2/member_styles/:id` using rank ids from `GET /api/v2/styles`. If ClubWorx returns 404/405, the Yes is still stored and the coach is told to update ClubWorx manually.

## Allowlist

Only emails in Firestore `allowed_coaches/{email}` can call Functions. Seed:

```
allowed_coaches/andy@onlyjonesy.com.au  { "email": "andy@onlyjonesy.com.au" }
```

## iOS later

Skip APNs for now. When you want iOS: `flutterfire configure --platforms=ios` and add an APNs key under Firebase → Project settings → Cloud Messaging.
