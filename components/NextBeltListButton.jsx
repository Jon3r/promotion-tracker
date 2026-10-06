"use client";

import { beltDisplayName } from "@/lib/rank";
import { kidsNextBeltListMove, kidsNextBeltPromotion } from "@/lib/gradingBelt";

/**
 * Kids only: add a stripe-due student to the next belt colour's PDF group.
 * @param {{
 *   student: import('@/lib/parseExcel').Student,
 *   saving?: boolean,
 *   onChange: (gradingBelt: string) => void,
 * }} props
 */
export default function NextBeltListButton({ student, saving, onChange }) {
  const move = kidsNextBeltListMove(student);
  const promotion = kidsNextBeltPromotion(student);

  if (move) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-brand-gold/20 px-2 py-0.5 text-xs font-semibold text-brand-blue">
          On {beltDisplayName(move)} list
        </span>
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={saving}
          className="text-xs font-medium text-zinc-600 hover:underline disabled:opacity-50"
          aria-label={`Remove ${student.fullName} from the ${beltDisplayName(move)} list`}
        >
          {saving ? "Saving…" : "Remove"}
        </button>
      </div>
    );
  }

  if (!promotion) return <span className="text-zinc-400">—</span>;

  return (
    <button
      type="button"
      onClick={() => onChange(promotion)}
      disabled={saving || !student.contactKey}
      className="rounded-md border border-brand-blue px-2 py-1 text-xs font-semibold text-brand-blue hover:bg-brand-blue hover:text-white disabled:opacity-50"
    >
      {saving ? "Saving…" : `Add to ${beltDisplayName(promotion)} list`}
    </button>
  );
}
