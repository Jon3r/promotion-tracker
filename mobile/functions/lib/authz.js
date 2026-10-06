"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCoach = requireCoach;
const https_1 = require("firebase-functions/v2/https");
const store_1 = require("./store");
async function requireCoach(db, auth) {
    if (!auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in required.");
    }
    await (0, store_1.ensureDefaultCoach)(db);
    const email = auth.token.email;
    if (!(await (0, store_1.isAllowedCoach)(db, email))) {
        throw new https_1.HttpsError("permission-denied", "This account is not on the coach allowlist.");
    }
    return { uid: auth.uid, email: email.trim().toLowerCase() };
}
//# sourceMappingURL=authz.js.map