"use client";

import { useMemo, useState } from "react";
import {
  CUSTOM_VALUE,
  giSizeOptionsForCategory,
  loadCustomGiSizes,
  saveCustomGiSizes,
} from "@/lib/giSizes";

/**
 * @param {{
 *   category: 'adults'|'kids',
 *   value: string,
 *   disabled?: boolean,
 *   saving?: boolean,
 *   onSave: (beltSize: string) => void,
 * }} props
 */
export default function GiSizeSelect({
  category,
  value,
  disabled,
  saving,
  onSave,
}) {
  const [customSizes, setCustomSizes] = useState(() => loadCustomGiSizes());
  const [mode, setMode] = useState(() => {
    const opts = giSizeOptionsForCategory(category, loadCustomGiSizes());
    const v = (value || "").trim();
    if (!v) return "";
    return opts.some((o) => o.toLowerCase() === v.toLowerCase()) ? v : CUSTOM_VALUE;
  });
  const [customText, setCustomText] = useState(() => {
    const opts = giSizeOptionsForCategory(category, loadCustomGiSizes());
    const v = (value || "").trim();
    return opts.some((o) => o.toLowerCase() === v.toLowerCase()) ? "" : v;
  });
  const [newPreset, setNewPreset] = useState("");

  const options = useMemo(
    () => giSizeOptionsForCategory(category, customSizes),
    [category, customSizes]
  );

  const resolvedSize =
    mode === CUSTOM_VALUE ? customText.trim() : String(mode || "").trim();

  const changed = resolvedSize !== (value || "").trim();

  function handleAddPreset() {
    const next = newPreset.trim();
    if (!next) return;
    const merged = [...new Set([...customSizes, next])];
    setCustomSizes(merged);
    saveCustomGiSizes(merged);
    setNewPreset("");
    setMode(next);
    setCustomText("");
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          disabled={disabled || saving}
          className="min-w-0 rounded border border-zinc-300 bg-white px-2 py-1 text-xs"
          aria-label="Gi size"
        >
          <option value="">—</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
          <option value={CUSTOM_VALUE}>Custom…</option>
        </select>
        {mode === CUSTOM_VALUE && (
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Size"
            disabled={disabled || saving}
            className="w-16 rounded border border-zinc-300 px-2 py-1 text-xs"
          />
        )}
        <button
          type="button"
          disabled={disabled || saving || !changed}
          onClick={() => onSave(resolvedSize)}
          className="shrink-0 rounded bg-zinc-800 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-600 disabled:opacity-40"
        >
          {saving ? "…" : "Save"}
        </button>
      </div>
      <details className="text-xs text-zinc-500">
        <summary className="cursor-pointer">Add size option</summary>
        <div className="mt-1 flex gap-1">
          <input
            type="text"
            value={newPreset}
            onChange={(e) => setNewPreset(e.target.value)}
            placeholder="e.g. A2L"
            className="rounded border border-zinc-300 px-2 py-1"
          />
          <button
            type="button"
            onClick={handleAddPreset}
            className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
          >
            Add
          </button>
        </div>
      </details>
    </div>
  );
}
