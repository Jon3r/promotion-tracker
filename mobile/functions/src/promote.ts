import { updateMemberStyleForm } from "./clubworx/client";
import { extractClubWorxCollection } from "./clubworx/collection";
import { normaliseRank } from "./eligibility/rank";

export type StyleRank = { id: string; name: string; styleId?: string };

export function flattenStyleRanks(stylesPayload: unknown): StyleRank[] {
  const rows = Array.isArray(stylesPayload)
    ? stylesPayload
    : extractClubWorxCollection(stylesPayload, "styles") || [];

  const ranks: StyleRank[] = [];
  for (const row of rows) {
    const nested = row.ranks ?? row.style_ranks ?? row.belt_ranks;
    if (Array.isArray(nested)) {
      for (const rank of nested) {
        if (!rank || typeof rank !== "object") continue;
        const rec = rank as Record<string, unknown>;
        const id = String(rec.id ?? rec.rank_id ?? "").trim();
        const name = String(rec.name ?? rec.rank_name ?? rec.title ?? "").trim();
        if (id || name) {
          ranks.push({
            id,
            name,
            styleId: String(row.id ?? row.style_id ?? ""),
          });
        }
      }
    }

    const id = String(row.id ?? row.rank_id ?? "").trim();
    const name = String(row.name ?? row.rank_name ?? row.title ?? "").trim();
    if (name && /belt|stripe|white|blue|purple|brown|black|grey|gray|yellow|orange|green/i.test(name)) {
      ranks.push({ id, name });
    }
  }
  return ranks;
}

export function findMatchingRank(ranks: StyleRank[], nextRankName: string): StyleRank | null {
  const target = normaliseRank(nextRankName);
  const exact = ranks.find(
    (r) => r.name.trim().toLowerCase() === nextRankName.trim().toLowerCase()
  );
  if (exact) return exact;

  const parsed = ranks.find((r) => {
    const n = normaliseRank(r.name);
    return (
      n.belt === target.belt &&
      n.belt !== "unknown" &&
      (n.stripes ?? 0) === (target.stripes ?? 0)
    );
  });
  return parsed ?? null;
}

export type PromoteResult =
  | { ok: true; clubworxSynced: true }
  | { ok: true; clubworxSynced: false; warning: string }
  | { ok: false; warning: string };

export async function promoteMemberStyleRank(args: {
  memberStyleId: number | null;
  nextRankName: string;
  styles: unknown;
  update?: typeof updateMemberStyleForm;
}): Promise<PromoteResult> {
  if (args.memberStyleId == null) {
    return {
      ok: true,
      clubworxSynced: false,
      warning: "No ClubWorx member style id; recorded in the app only. Update the rank in ClubWorx manually.",
    };
  }

  const ranks = flattenStyleRanks(args.styles);
  const match = findMatchingRank(ranks, args.nextRankName);
  const lastPromotedOn = new Date().toISOString().slice(0, 10);
  const update = args.update ?? updateMemberStyleForm;

  const fieldSets: Record<string, string>[] = [];
  if (match?.id) {
    fieldSets.push({
      current_rank_id: match.id,
      last_promoted_on: lastPromotedOn,
    });
    fieldSets.push({
      rank_id: match.id,
      last_promoted_on: lastPromotedOn,
    });
  }
  fieldSets.push({
    current_rank_name: args.nextRankName,
    last_promoted_on: lastPromotedOn,
  });

  let lastMessage = "ClubWorx rank update is not available.";
  for (const fields of fieldSets) {
    const result = await update(args.memberStyleId, fields);
    if (result.ok) {
      return { ok: true, clubworxSynced: true };
    }
    lastMessage = result.message;
    if (result.status !== 404 && result.status !== 405 && result.status !== 422) {
      return { ok: true, clubworxSynced: false, warning: lastMessage };
    }
  }

  return {
    ok: true,
    clubworxSynced: false,
    warning: `${lastMessage} Confirmation was saved here — update the rank in ClubWorx manually.`,
  };
}
