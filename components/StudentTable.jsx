"use client";

import { formatDate, daysUntil } from "@/lib/dates";

const HIGHLIGHT_DAYS = 14;

function isUpcoming(student) {
  const until = daysUntil(student.promotionDate);
  return until != null && until >= 0 && until <= HIGHLIGHT_DAYS;
}

function StudentCard({ student }) {
  const highlight = isUpcoming(student);

  return (
    <li
      className={`rounded-lg border border-zinc-200 bg-white p-3 ${
        highlight ? "bg-amber-50/80 ring-1 ring-amber-200" : ""
      }`}
    >
      <p className="font-medium text-zinc-900">{student.fullName}</p>
      <dl className="mt-2 grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-zinc-500">Current</dt>
        <dd className="min-w-0 text-zinc-800">{student.currentRank || "—"}</dd>
        <dt className="text-zinc-500">Next</dt>
        <dd className="min-w-0 text-zinc-800">{student.nextRank || "—"}</dd>
        <dt className="text-zinc-500">Gi size</dt>
        <dd className="text-zinc-700">{student.beltSize || "—"}</dd>
        <dt className="text-zinc-500">Promotion</dt>
        <dd className="text-zinc-700">{formatDate(student.promotionDate)}</dd>
        <dt className="text-zinc-500">Last promoted</dt>
        <dd className="text-zinc-700">
          {formatDate(student.mostRecentPromotion)}
        </dd>
        {student.email && (
          <>
            <dt className="text-zinc-500">Email</dt>
            <dd className="min-w-0 break-all">
              <a
                href={`mailto:${student.email}`}
                className="text-blue-600 hover:underline"
              >
                {student.email}
              </a>
            </dd>
          </>
        )}
        {student.phone && (
          <>
            <dt className="text-zinc-500">Phone</dt>
            <dd className="text-zinc-700">
              <a href={`tel:${student.phone}`} className="hover:underline">
                {student.phone}
              </a>
            </dd>
          </>
        )}
      </dl>
    </li>
  );
}

export default function StudentTable({ students }) {
  if (!students.length) {
    return <p className="py-4 text-sm text-zinc-500">No students in this group.</p>;
  }

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {students.map((student) => (
          <StudentCard
            key={`${student.fullName}-${student.email}-${student.promotionDate?.toISOString()}`}
            student={student}
          />
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
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
              const highlight = isUpcoming(student);

              return (
                <tr
                  key={`${student.fullName}-${student.email}-${student.promotionDate?.toISOString()}`}
                  className={highlight ? "bg-amber-50/80" : ""}
                >
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-zinc-900">
                    {student.fullName}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {student.currentRank || "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {student.nextRank || "—"}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {student.beltSize || "—"}
                  </td>
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
    </>
  );
}
