import type { Messaging } from "firebase-admin/messaging";
import { classEndingBody, confirmBody, type NotificationDecision } from "./scheduler";

export async function sendDecisions(
  messaging: Messaging,
  tokens: string[],
  decisions: NotificationDecision[]
): Promise<number> {
  if (!tokens.length || !decisions.length) return 0;
  let sent = 0;
  for (const decision of decisions) {
    const { title, body, data } = fcmPayload(decision);
    try {
      await messaging.sendEachForMulticast({
        tokens,
        notification: { title, body },
        data,
        android: { priority: "high" },
      });
      sent += 1;
    } catch (error) {
      console.warn("FCM send failed", error);
    }
  }
  return sent;
}

export function fcmPayload(decision: NotificationDecision): {
  title: string;
  body: string;
  data: Record<string, string>;
} {
  if (decision.type === "class_ending") {
    return {
      title: `Promotions due · ${decision.title}`,
      body: classEndingBody(decision.candidates),
      data: {
        type: "class_ending",
        eventId: decision.classId,
        dayKey: decision.dayKey,
      },
    };
  }
  return {
    title: "Did the stripe promotion happen?",
    body: confirmBody(decision.candidate, decision.title),
    data: {
      type: "confirm",
      eventId: decision.classId,
      dayKey: decision.dayKey,
      contactKey: decision.candidate.contactKey,
    },
  };
}
