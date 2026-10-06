import 'rank.dart';

/// Stripe promotions only: same belt colour, next stripe count higher.
/// Missing current stripe count is treated as 0.
/// Belt-ups and "Ready to Promote" text without a same-belt stripe increase are excluded.
bool isDueForStripe(String? currentRank, String? nextRank) {
  return isParsedDueForStripe(normaliseRank(currentRank), normaliseRank(nextRank));
}

bool isParsedDueForStripe(ParsedRank current, ParsedRank next) {
  if (current.belt == 'unknown' || next.belt == 'unknown') return false;
  if (current.belt != next.belt) return false;
  final currentStripes = current.stripes ?? 0;
  final nextStripes = next.stripes;
  if (nextStripes == null) return false;
  return nextStripes > currentStripes;
}

bool isSnoozed(DateTime? snoozeUntil, DateTime now) {
  if (snoozeUntil == null) return false;
  return snoozeUntil.isAfter(now);
}

const allowedSnoozeDays = [7, 14, 21];
