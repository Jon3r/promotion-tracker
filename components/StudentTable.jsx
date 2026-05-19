"use client";

import { formatDate, daysUntil } from "@/lib/dates";
import { ADULT_BELT_ORDER, KIDS_BELT_ORDER } from "@/lib/rank";
import ExcludeStudentButton from "./ExcludeStudentButton";
import GiSizeSelect from "./GiSizeSelect";
import GradingBeltSelect from "./GradingBeltSelect";

const HIGHLIGHT_DAYS = 14;

function beltOptionsForCategory(category) {
  return category === "kids" ? KIDS_BELT_ORDER : ADULT_BELT_ORDER;
}

function isUpcoming(student) {
  const until = daysUntil(student.promotionDate);
  return until != null && until >= 0 && until <= HIGHLIGHT_DAYS;
}

function StudentCard({
  student,
  category,
  readOnly,
  giSizeOptions,
  onExclude,
  onGiSizeSave,
  onGradingBeltChange,
  savingGiSizeId,
  savingGradingKey,
}) {
  const highlight = isUpcoming(student);

  return (
    <li
      className={`rounded-lg border border-zinc-200 bg-white p-3 ${
        highlight ? "bg-amber-50/80 ring-1 ring-amber-200" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-medium text-zinc-900">
          {student.fullName}
        </p>
        {onExclude && (
          <ExcludeStudentButton
            onClick={() => onExclude(student)}
            label={`Remove ${student.fullName} from list`}
          />
        )}
      </div>
      <dl className="mt-2 grid grid-cols-[minmax(0,auto)_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-zinc-500">Current</dt>
        <dd className="min-w-0 text-zinc-800">{student.currentRank || "—"}</dd>
        <dt className="text-zinc-500">Next</dt>
        <dd className="min-w-0 text-zinc-800">{student.nextRank || "—"}</dd>
        <dt className="text-zinc-500">Gi size</dt>
        <dd className="text-zinc-700">
          {readOnly || !onGiSizeSave || !student.memberStyleId ? (
            student.beltSize || "—"
          ) : (
            <GiSizeSelect
              options={giSizeOptions}
              value={student.beltSize}
              saving={savingGiSizeId === student.memberStyleId}
              onSave={(size) => onGiSizeSave(student, size)}
            />
          )}
        </dd>
        {!readOnly && onGradingBeltChange && student.contactKey && (
          <>
            <dt className="text-zinc-500">Grading belt</dt>
            <dd>
              <GradingBeltSelect
                student={student}
                beltOptions={beltOptionsForCategory(category)}
                saving={savingGradingKey === student.contactKey}
                onChange={(belt) => onGradingBeltChange(student, belt)}
              />
            </dd>
          </>
        )}
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

export default function StudentTable({
  students,
  category = "adults",
  readOnly = false,
  giSizeOptions = [],
  onExcludeStudent,
  onGiSizeSave,
  onGradingBeltChange,
  savingGiSizeId = null,
  savingGradingKey = null,
}) {
  if (!students.length) {
    return <p className="py-4 text-sm text-zinc-500">No students in this group.</p>;
  }

  const beltOptions = beltOptionsForCategory(category);

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {students.map((student) => (
          <StudentCard
            key={`${student.contactKey || student.fullName}-${student.email}`}
            student={student}
            category={category}
            readOnly={readOnly}
            giSizeOptions={giSizeOptions}
            onExclude={onExcludeStudent}
            onGiSizeSave={onGiSizeSave}
            onGradingBeltChange={onGradingBeltChange}
            savingGiSizeId={savingGiSizeId}
            savingGradingKey={savingGradingKey}
          />
        ))}
      </ul>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1280px] table-fixed divide-y divide-zinc-200 text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <tr>
              {onExcludeStudent && (
                <th className="w-10 px-2 py-2" aria-label="Remove" />
              )}
              <th className="w-[14%] px-3 py-2">Name</th>
              <th className="w-[12%] px-3 py-2">Current</th>
              <th className="w-[12%] px-3 py-2">Next</th>
              <th className="w-[8%] px-3 py-2">Gi size</th>
              <th className="w-[14%] px-3 py-2">Promotion date</th>
              <th className="w-[12%] px-3 py-2">Last promoted</th>
              <th className="w-[14%] px-3 py-2">Email</th>
              <th className="w-[10%] px-3 py-2">Phone</th>
              {!readOnly && onGradingBeltChange && (
                <th className="w-[14%] px-3 py-2">Grading belt</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {students.map((student) => {
              const highlight = isUpcoming(student);

              return (
                <tr
                  key={`${student.contactKey || student.fullName}-${student.email}`}
                  className={highlight ? "bg-amber-50/80" : ""}
                >
                  {onExcludeStudent && (
                    <td className="px-2 py-2 align-middle">
                      <ExcludeStudentButton
                        onClick={() => onExcludeStudent(student)}
                        label={`Remove ${student.fullName} from list`}
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 font-medium text-zinc-900">
                    <span className="line-clamp-2">{student.fullName}</span>
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    <span className="line-clamp-2">{student.currentRank || "—"}</span>
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    <span className="line-clamp-2">{student.nextRank || "—"}</span>
                  </td>
                  <td className="px-3 py-2 align-middle">
                    {readOnly || !onGiSizeSave || !student.memberStyleId ? (
                      <span className="text-zinc-600">{student.beltSize || "—"}</span>
                    ) : (
                      <GiSizeSelect
                        options={giSizeOptions}
                        value={student.beltSize}
                        saving={savingGiSizeId === student.memberStyleId}
                        onSave={(size) => onGiSizeSave(student, size)}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-700">
                    {formatDate(student.promotionDate)}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {formatDate(student.mostRecentPromotion)}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {student.email ? (
                      <a
                        href={`mailto:${student.email}`}
                        className="break-all text-blue-600 hover:underline"
                      >
                        {student.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {student.phone || "—"}
                  </td>
                  {!readOnly && onGradingBeltChange && (
                    <td className="px-3 py-2 align-middle">
                      {student.contactKey ? (
                        <GradingBeltSelect
                          student={student}
                          beltOptions={beltOptions}
                          saving={savingGradingKey === student.contactKey}
                          onChange={(belt) => onGradingBeltChange(student, belt)}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
