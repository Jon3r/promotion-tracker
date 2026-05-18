"use client";

import { useState } from "react";
import { beltAccentClass, beltDisplayName } from "@/lib/rank";
import { formatDate } from "@/lib/dates";
import { nearestPromotionDate } from "@/lib/groupStudents";
import StudentTable from "./StudentTable";

export default function BeltSection({ belt, students, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const nearest = nearestPromotionDate(students);
  const isUnknown = belt === "unknown";

  return (
    <section
      className={`overflow-hidden rounded-xl border bg-white shadow-sm ${beltAccentClass(belt).split(" ")[0]} border-l-4`}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-zinc-50/80"
      >
        <div>
          <h3 className="text-base font-semibold text-zinc-900">
            {isUnknown ? "Needs review" : beltDisplayName(belt)}
            <span className="ml-2 font-normal text-zinc-500">
              ({students.length})
            </span>
          </h3>
          {nearest && (
            <p className="mt-0.5 text-sm text-zinc-500">
              Next grading: {formatDate(nearest)}
            </p>
          )}
        </div>
        <span className="text-zinc-400" aria-hidden>
          {open ? "▼" : "▶"}
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-100 px-2 pb-2">
          <StudentTable students={students} />
        </div>
      )}
    </section>
  );
}
