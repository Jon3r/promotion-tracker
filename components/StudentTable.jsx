"use client";

import { formatDate, daysUntil } from "@/lib/dates";

const HIGHLIGHT_DAYS = 14;

export default function StudentTable({ students }) {
  if (!students.length) {
    return <p className="py-4 text-sm text-zinc-500">No students in this group.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
        <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Current</th>
            <th className="px-3 py-2">Next</th>
            <th className="px-3 py-2">Gi size</th>
            <th className="px-3 py-2">Promotion date</th>
            <th className="px-3 py-2">Last promoted</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Phone</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 bg-white">
          {students.map((student) => {
            const until = daysUntil(student.promotionDate);
            const highlight =
              until != null && until >= 0 && until <= HIGHLIGHT_DAYS;

            return (
              <tr
                key={`${student.fullName}-${student.email}-${student.promotionDate?.toISOString()}`}
                className={highlight ? "bg-amber-50/80" : ""}
              >
                <td className="whitespace-nowrap px-3 py-2 font-medium text-zinc-900">
                  {student.fullName}
                </td>
                <td className="px-3 py-2 text-zinc-700">{student.currentRank || "—"}</td>
                <td className="px-3 py-2 text-zinc-700">{student.nextRank || "—"}</td>
                <td className="px-3 py-2 text-zinc-600">{student.beltSize || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-700">
                  {formatDate(student.promotionDate)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                  {formatDate(student.mostRecentPromotion)}
                </td>
                <td className="max-w-[180px] truncate px-3 py-2 text-zinc-600">
                  {student.email ? (
                    <a
                      href={`mailto:${student.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {student.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-600">
                  {student.phone || "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
