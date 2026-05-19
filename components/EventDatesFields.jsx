"use client";

/**
 * @param {{
 *   dates: import('@/lib/eventDates').EventDates,
 *   onChange: (dates: import('@/lib/eventDates').EventDates) => void,
 *   readOnly?: boolean,
 * }} props
 */
export default function EventDatesFields({ dates, onChange, readOnly = false }) {
  function update(category, field, value) {
    onChange({
      ...dates,
      [category]: { ...dates[category], [field]: value },
    });
  }

  const fields = [
    {
      category: "adults",
      field: "gradingDate",
      label: "Adults grading date",
      hint: "Printed on PDF below the title",
    },
    {
      category: "kids",
      field: "gradingDate",
      label: "Kids grading date",
      hint: "Printed on PDF below the title",
    },
    {
      category: "adults",
      field: "ceremonyDate",
      label: "Adults belt ceremony date",
      hint: "Printed at the bottom of the PDF",
    },
    {
      category: "kids",
      field: "ceremonyDate",
      label: "Kids belt ceremony date",
      hint: "Printed at the bottom of the PDF",
    },
  ];

  return (
    <div className="col-span-full rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Dates for PDF export
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(({ category, field, label, hint }) => (
          <label key={`${category}-${field}`} className="block text-sm">
            <span className="font-medium text-zinc-800">{label}</span>
            <input
              type="date"
              value={dates[category][field]}
              onChange={(e) => update(category, field, e.target.value)}
              disabled={readOnly}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:bg-zinc-100"
            />
            <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
