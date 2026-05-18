"use client";

import { beltAccentClass, beltDisplayName } from "@/lib/rank";
import { daysUntil } from "@/lib/dates";

const UPCOMING_BELT_DAYS = 30;

export default function BeltSummary({ beltCounts }) {
  if (!beltCounts.length) {
    return (
      <p className="text-sm text-zinc-500">No students loaded for this category.</p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {beltCounts.map(({ belt, count, students }) => {
        const hasUpcoming = students.some((s) => {
          const d = daysUntil(s.promotionDate);
          return d != null && d >= 0 && d <= UPCOMING_BELT_DAYS;
        });

        return (
          <div
            key={belt}
            className={`rounded-lg border-l-4 px-3 py-2 text-sm ${beltAccentClass(belt)} ${
              hasUpcoming ? "ring-2 ring-amber-400/60" : ""
            }`}
          >
            <span className="font-semibold text-zinc-900">
              {beltDisplayName(belt)}
            </span>
            <span className="text-zinc-600"> · {count}</span>
          </div>
        );
      })}
    </div>
  );
}
