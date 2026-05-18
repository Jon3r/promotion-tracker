import { beltDisplayName } from "./rank";

/**
 * @param {{ search?: string, beltFilter?: string, stripeFilters?: string|string[] }} filters
 */
export function describeFilters(filters) {
  const parts = [];
  if (filters.search?.trim()) parts.push(`search="${filters.search.trim()}"`);
  if (filters.beltFilter && filters.beltFilter !== "all") {
    parts.push(
      `belt=${
        filters.beltFilter === "unknown"
          ? "needs-review"
          : beltDisplayName(filters.beltFilter)
      }`
    );
  }
  const stripes = Array.isArray(filters.stripeFilters)
    ? filters.stripeFilters
    : filters.stripeFilters
      ? [filters.stripeFilters]
      : [];
  if (stripes.length > 0) {
    const labels = stripes.map((s) => (s === "none" ? "no stripes" : `${s} stripe${s === "1" ? "" : "s"}`));
    parts.push(`stripes=${labels.join(" or ")}`);
  }
  return parts.length ? parts.join(", ") : "no filters";
}
