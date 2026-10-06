"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryFromStyleName = categoryFromStyleName;
function categoryFromStyleName(styleName) {
    const name = String(styleName || "").toLowerCase();
    if (name.includes("kids"))
        return "kids";
    if (name.includes("adults"))
        return "adults";
    return null;
}
//# sourceMappingURL=mapMember.js.map