"use client";

/**
 * @param {{
 *   options: string[],
 *   value: string,
 *   disabled?: boolean,
 *   saving?: boolean,
 *   onSave: (beltSize: string) => void,
 * }} props
 */
export default function GiSizeSelect({
  options,
  value,
  disabled,
  saving,
  onSave,
}) {
  const current = (value || "").trim();
  const optionList = [...options];
  if (current && !optionList.some((o) => o.toLowerCase() === current.toLowerCase())) {
    optionList.unshift(current);
  }

  return (
    <select
      value={current}
      onChange={(e) => {
        const next = e.target.value;
        if (next !== current) onSave(next);
      }}
      disabled={disabled || saving}
      className="w-full min-w-[5.5rem] max-w-[7rem] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50"
      aria-label="Gi size"
    >
      <option value="">—</option>
      {optionList.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}
