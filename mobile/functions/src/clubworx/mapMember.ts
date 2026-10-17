import type { Audience } from "../eligibility/stripeDue";

export function categoryFromStyleName(styleName: unknown): Audience | null {
  const name = String(styleName || "").toLowerCase();
  if (name.includes("kids")) return "kids";
  if (name.includes("adults")) return "adults";
  return null;
}
