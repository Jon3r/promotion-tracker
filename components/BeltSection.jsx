"use client";

import { useState } from "react";
import { beltAccentClass, beltDisplayName } from "@/lib/rank";
import StudentTable from "./StudentTable";

export default function BeltSection({
  belt,
  students,
  defaultOpen = true,
  onExcludeStudent,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const isUnknown = belt === "unknown";

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-xl border bg-white shadow-sm ${beltAccentClass(belt).split(" ")[0]} border-l-4`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full min-w-0 items-center justify-between gap-2 px-3 py-3 text-left hover:bg-zinc-50/80 sm:gap-4 sm:px-4"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-900">
            {isUnknown ? "Needs review" : beltDisplayName(belt)}
            <span className="ml-2 font-normal text-zinc-500">
              ({students.length})
            </span>
          </h3>
        </div>
        <span className="shrink-0 text-zinc-400" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
      </button>
      {open && (
        <div className="min-w-0 border-t border-zinc-100 px-1 pb-2 sm:px-2">
          <StudentTable
            students={students}
            onExcludeStudent={onExcludeStudent}
          />
        </div>
      )}
    </section>
  );
}
