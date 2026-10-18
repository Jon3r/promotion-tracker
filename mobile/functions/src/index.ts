import { initializeApp } from "firebase-admin/app";

initializeApp();

export {
  getTodayTimetable,
  getClassCandidates,
  snoozePromotion,
  confirmPromotion,
  getConfirmQueue,
  registerFcmToken,
} from "./callables";

export { pollClassPromotions } from "./poller";
