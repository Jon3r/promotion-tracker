import { HttpsError } from "firebase-functions/v2/https";
import type { Firestore } from "firebase-admin/firestore";
import { ensureDefaultCoach, isAllowedCoach } from "./store";

export async function requireCoach(
  db: Firestore,
  auth: { uid: string; token: { email?: string } } | undefined
): Promise<{ uid: string; email: string }> {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in required.");
  }
  await ensureDefaultCoach(db);
  const email = auth.token.email;
  if (!(await isAllowedCoach(db, email))) {
    throw new HttpsError(
      "permission-denied",
      "This account is not on the coach allowlist."
    );
  }
  return { uid: auth.uid, email: email!.trim().toLowerCase() };
}
