"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pollClassPromotions = exports.registerFcmToken = exports.getConfirmQueue = exports.confirmPromotion = exports.snoozePromotion = exports.getClassCandidates = exports.getTodayTimetable = void 0;
const app_1 = require("firebase-admin/app");
(0, app_1.initializeApp)();
var callables_1 = require("./callables");
Object.defineProperty(exports, "getTodayTimetable", { enumerable: true, get: function () { return callables_1.getTodayTimetable; } });
Object.defineProperty(exports, "getClassCandidates", { enumerable: true, get: function () { return callables_1.getClassCandidates; } });
Object.defineProperty(exports, "snoozePromotion", { enumerable: true, get: function () { return callables_1.snoozePromotion; } });
Object.defineProperty(exports, "confirmPromotion", { enumerable: true, get: function () { return callables_1.confirmPromotion; } });
Object.defineProperty(exports, "getConfirmQueue", { enumerable: true, get: function () { return callables_1.getConfirmQueue; } });
Object.defineProperty(exports, "registerFcmToken", { enumerable: true, get: function () { return callables_1.registerFcmToken; } });
var poller_1 = require("./poller");
Object.defineProperty(exports, "pollClassPromotions", { enumerable: true, get: function () { return poller_1.pollClassPromotions; } });
//# sourceMappingURL=index.js.map