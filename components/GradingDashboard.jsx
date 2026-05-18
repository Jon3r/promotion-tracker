"use client";

import { useMemo, useState } from "react";
import {
  groupByBelt,
  beltCounts,
  applyFilters,
  stripeFilterOptions,
  beltFilterOptions,
} from "@/lib/groupStudents";
import { beltDisplayName } from "@/lib/rank";
import { formatDate, parseDate } from "@/lib/dates";
import { exportNamesPdf, exportBothCategoriesPdf } from "@/lib/exportPdf";
import FileUpload from "@/components/FileUpload";
import CategoryTabs from "@/components/CategoryTabs";
import BeltSummary from "@/components/BeltSummary";
import BeltSection from "@/components/BeltSection";
import StripeFilter from "@/components/StripeFilter";

/**
 * @param {object} props
 * @param {boolean} [props.readOnly]
 * @param {{ students: object[], fileName: string|null, error?: string|null, savedAt: string|null }} props.adults
 * @param {{ students: object[], fileName: string|null, error?: string|null, savedAt: string|null }} props.kids
 * @param {(file: File) => void} [props.onAdultsUpload]
 * @param {(file: File) => void} [props.onKidsUpload]
 * @param {() => void} [props.onClearAdults]
 * @param {() => void} [props.onClearKids]
 * @param {() => void} [props.onClearAll]
 * @param {string} [props.viewLabel]
 * @param {string|null} [props.adultsUploadInfo]
 * @param {string|null} [props.kidsUploadInfo]
 */
export default function GradingDashboard({
  readOnly = false,
  adults,
  kids,
  adultsUploadInfo,
  kidsUploadInfo,
  onAdultsUpload,
  onKidsUpload,
  onClearAdults,
  onClearKids,
  onClearAll,
  viewLabel,
}) {
  const [activeTab, setActiveTab] = useState("adults");
  const [search, setSearch] = useState("");
  const [beltFilter, setBeltFilter] = useState("all");
  const [stripeFilters, setStripeFilters] = useState([]);
  const [sortBy, setSortBy] = useState("date");

  const category = activeTab;
  const dataset = category === "adults" ? adults : kids;

  const beltOptions = useMemo(
    () => beltFilterOptions(dataset.students, category),
    [dataset.students, category]
  );

  const stripeOptions = useMemo(
    () => stripeFilterOptions(dataset.students),
    [dataset.students]
  );

  const effectiveBeltFilter =
    beltFilter === "all" || beltOptions.includes(beltFilter)
      ? beltFilter
      : "all";

  const filterState = {
    search,
    beltFilter: effectiveBeltFilter,
    stripeFilters,
  };

  function filteredFor(cat, students) {
    const belts = beltFilterOptions(students, cat);
    const belt =
      beltFilter === "all" || belts.includes(beltFilter) ? beltFilter : "all";
    return applyFilters(students, {
      search,
      beltFilter: belt,
      stripeFilters,
    });
  }

  const filteredStudents = useMemo(
    () => filteredFor(category, dataset.students),
    [dataset.students, category, search, beltFilter, stripeFilters]
  );

  const adultsFiltered = useMemo(
    () => filteredFor("adults", adults.students),
    [adults.students, search, beltFilter, stripeFilters]
  );

  const kidsFiltered = useMemo(
    () => filteredFor("kids", kids.students),
    [kids.students, search, beltFilter, stripeFilters]
  );

  const grouped = useMemo(
    () => groupByBelt(filteredStudents, category, sortBy),
    [filteredStudents, category, sortBy]
  );

  const summaryCounts = useMemo(
    () => beltCounts(filteredStudents, category),
    [filteredStudents, category]
  );

  const hasAnyData = adults.students.length > 0 || kids.students.length > 0;

  const lastSavedLabel = useMemo(() => {
    const times = [adults.savedAt, kids.savedAt]
      .map((t) => (t ? parseDate(t) : null))
      .filter(Boolean);
    if (!times.length) return null;
    const latest = new Date(Math.max(...times.map((d) => d.getTime())));
    return formatDate(latest);
  }, [adults.savedAt, kids.savedAt]);

  async function handleExportCurrentTab() {
    await exportNamesPdf(filteredStudents, {
      category,
      filename: `bjj-grading-${category}-filtered.pdf`,
    });
  }

  async function handleExportBothTabs() {
    await exportBothCategoriesPdf({
      adults: adultsFiltered,
      kids: kidsFiltered,
    });
  }

  return (
    <>
      {viewLabel && (
        <p className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-900">
          {viewLabel}
        </p>
      )}

      {!readOnly && (
        <section className="mb-8 grid gap-4 sm:grid-cols-2">
          <FileUpload
            label="Adults spreadsheet"
            description="Excel export with student promotion data"
            fileName={adults.fileName}
            error={adults.error}
            info={adultsUploadInfo}
            onFile={onAdultsUpload}
            onClear={onClearAdults}
          />
          <FileUpload
            label="Kids spreadsheet"
            description="Same column layout as Adults"
            fileName={kids.fileName}
            error={kids.error}
            info={kidsUploadInfo}
            onFile={onKidsUpload}
            onClear={onClearKids}
          />
        </section>
      )}

      {readOnly && hasAnyData && (
        <p className="mb-6 text-sm text-zinc-600">
          {adults.fileName && <span>Adults: {adults.fileName}. </span>}
          {kids.fileName && <span>Kids: {kids.fileName}. </span>}
          {lastSavedLabel && <span>Published {lastSavedLabel}.</span>}
        </p>
      )}

      {!hasAnyData ? (
        <p className="rounded-lg bg-zinc-50 px-4 py-8 text-center text-zinc-500">
          {readOnly
            ? "This shared report has no data."
            : "Upload at least one spreadsheet to view the grading report."}
        </p>
      ) : (
        <>
          <div className="mb-6 flex min-w-0 flex-col gap-4">
            <CategoryTabs
              active={activeTab}
              onChange={setActiveTab}
              adultsCount={adults.students.length}
              kidsCount={kids.students.length}
            />

            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="search"
                placeholder="Search by name, email, rank…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:col-span-2"
              />
              <select
                value={effectiveBeltFilter}
                onChange={(e) => setBeltFilter(e.target.value)}
                className="min-w-0 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                aria-label="Filter by belt colour"
              >
                <option value="all">All belt colours</option>
                {beltOptions.map((belt) => (
                  <option key={belt} value={belt}>
                    {belt === "unknown"
                      ? "Needs review"
                      : beltDisplayName(belt)}
                  </option>
                ))}
              </select>
              <StripeFilter
                stripes={stripeOptions.stripes}
                hasUnspecified={stripeOptions.hasUnspecified}
                value={stripeFilters}
                onChange={setStripeFilters}
              />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-w-0 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                aria-label="Sort students"
              >
                <option value="date">Sort by promotion date</option>
                <option value="name">Sort by name</option>
              </select>
              <button
                type="button"
                onClick={handleExportCurrentTab}
                disabled={filteredStudents.length === 0}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 sm:col-span-2"
              >
                Export PDF ({category})
              </button>
              {adults.students.length > 0 && kids.students.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportBothTabs}
                  disabled={
                    adultsFiltered.length === 0 && kidsFiltered.length === 0
                  }
                  className="w-full rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 sm:col-span-2"
                >
                  Export PDF (both)
                </button>
              )}
            </div>
          </div>

          {!readOnly && onClearAll && (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={onClearAll}
                className="text-sm text-zinc-600 hover:underline"
              >
                Clear all saved data (this browser)
              </button>
            </div>
          )}

          {dataset.students.length === 0 ? (
            <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-12 text-center text-zinc-500">
              No {category} data in this report.
            </p>
          ) : (
            <>
              <section className="mb-6">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Summary by belt
                  <span className="ml-2 font-normal normal-case text-zinc-400">
                    ({filteredStudents.length} shown)
                  </span>
                </h2>
                <BeltSummary beltCounts={summaryCounts} />
              </section>

              <section className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Students by belt
                </h2>
                {[...grouped.entries()].map(([belt, students]) => (
                  <BeltSection
                    key={belt}
                    belt={belt}
                    students={students}
                    defaultOpen={belt !== "unknown"}
                  />
                ))}
                {grouped.size === 0 && (
                  <p className="text-sm text-zinc-500">
                    No students match your filters.
                  </p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </>
  );
}
