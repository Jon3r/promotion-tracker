"use client";

/**
 * Multi-select stripe filter chips.
 * @param {{ stripes: number[], hasUnspecified: boolean, value: string[], onChange: (v: string[]) => void }} props
 */
export default function StripeFilter({
  stripes,
  hasUnspecified,
  value,
  onChange,
}) {
  const selected = value;

  function toggle(key) {
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  const chipClass = (active) =>
    `rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
      active
        ? "border-zinc-900 bg-zinc-900 text-white"
        : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
    }`;

  if (!stripes.length && !hasUnspecified) {
    return null;
  }

  return (
    <fieldset className="min-w-[140px] rounded-lg border border-zinc-300 bg-white px-2 py-2">
      <legend className="px-1 text-xs font-medium text-zinc-500">
        Stripes
        {selected.length > 0 && (
          <span className="ml-1 text-zinc-400">({selected.length})</span>
        )}
      </legend>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange([])}
          className={chipClass(selected.length === 0)}
          aria-pressed={selected.length === 0}
        >
          All
        </button>
        {hasUnspecified && (
          <button
            type="button"
            onClick={() => toggle("none")}
            className={chipClass(selected.includes("none"))}
            aria-pressed={selected.includes("none")}
          >
            No stripes
          </button>
        )}
        {stripes.map((n) => {
          const key = String(n);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={chipClass(selected.includes(key))}
              aria-pressed={selected.includes(key)}
            >
              {n} stripe{n === 1 ? "" : "s"}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
