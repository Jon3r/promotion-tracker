"use client";

import { useMemo } from "react";
import { groupByBelt, beltCounts } from "@/lib/groupStudents";
import { exportNamesPdf } from "@/lib/exportPdf";
import { eventDatesForCategory } from "@/lib/eventDates";
import BeltSummary from "@/components/BeltSummary";
import BeltSection from "@/components/BeltSection";
import Button from "@/components/Button";

export default function GradingListPanel({
  students,
  category,
  eventDates,
  onRemoveStudent,
  onClearAll,
}) {
  const grouped = useMemo(
    () => groupByBelt(students, category, "name"),
    [students, category]
  );

  const summaryCounts = useMemo(
    () => beltCounts(students, category, "current"),
    [students, category]
  );

  async function handleExportPdf() {
    const dates = eventDatesForCategory(eventDates, category);
    await exportNamesPdf(students, {
      category,
      filename: `bjj-grading-list-${category}-${new Date().toISOString().slice(0, 10)}.pdf`,
      gradingDate: dates.gradingDate,
      ceremonyDate: dates.ceremonyDate,
    });
  }

  if (students.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8">
        <p className="text-center text-sm text-zinc-500">
          No students in grading list yet. Use the checkboxes above to add students.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Grading list ({students.length} student{students.length === 1 ? "" : "s"})
        </h3>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleExportPdf}>
            Export grading list PDF
          </Button>
          <Button variant="ghost" onClick={onClearAll}>
            Clear all
          </Button>
        </div>
      </div>

      <section className="mb-4">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Summary by belt
        </h4>
        <BeltSummary beltCounts={summaryCounts} />
      </section>

      <section className="space-y-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Students by belt
        </h4>
        {[...grouped.entries()].map(([belt, beltStudents]) => (
          <BeltSection
            key={belt}
            belt={belt}
            students={beltStudents}
            category={category}
            readOnly={true}
            giSizeOptions={[]}
            defaultOpen={true}
            onExcludeStudent={onRemoveStudent}
          />
        ))}
      </section>
    </div>
  );
}
