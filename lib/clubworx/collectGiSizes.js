import { categoryFromStyleName } from "./mapMemberStyles";

/**
 * Unique belt_size values from ClubWorx member_styles, split by adults/kids style.
 * @param {Record<string, unknown>[]} memberStyles
 * @returns {{ adults: string[], kids: string[] }}
 */
export function collectGiSizesFromMemberStyles(memberStyles) {
  const adults = new Set();
  const kids = new Set();

  for (const record of memberStyles) {
    const category = categoryFromStyleName(record.style_name);
    if (!category) continue;
    const size =
      record.belt_size != null ? String(record.belt_size).trim() : "";
    if (!size) continue;
    if (category === "kids") kids.add(size);
    else adults.add(size);
  }

  const sort = (a, b) => a.localeCompare(b, undefined, { numeric: true });
  return {
    adults: [...adults].sort(sort),
    kids: [...kids].sort(sort),
  };
}
