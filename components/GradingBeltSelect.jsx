"use client";

import { beltDisplayName } from "@/lib/rank";
import { defaultGradingBelt } from "@/lib/gradingBelt";

const DEFAULT_VALUE = "";

/**
 * @param {{
 *   student: import('@/lib/parseExcel').Student,
 *   beltOptions: string[],
 *   disabled?: boolean,
 *   saving?: boolean,
 *   onChange: (gradingBelt: string) => void,
 * }} props
 */
export default function GradingBeltSelect({
  student,
  beltOptions,
  disabled,
  saving,
  onChange,
}) {
  const natural = defaultGradingBelt(student);
  const hasOverride = Boolean(student.gradingBeltOverride);
  const selectValue = hasOverride ? student.gradingBeltOverride : DEFAULT_VALUE;

  return (
    <select
      value={selectValue}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || saving || !student.contactKey}
      className="w-full min-w-[9rem] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
      aria-label={`Grading belt for ${student.fullName}`}
    >
      <option value={DEFAULT_VALUE}>
        Next belt ({beltDisplayName(natural)})
      </option>
      {beltOptions.map((belt) => (
        <option key={belt} value={belt}>
          {belt === "unknown" ? "Needs review" : beltDisplayName(belt)}
        </option>
      ))}
    </select>
  );
}
