"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  groupByBelt,
  beltCounts,
  applyFilters,
  stripeFilterOptions,
  beltFilterOptions,
  gradingBeltFilterOptions,
} from "@/lib/groupStudents";
import { beltDisplayName } from "@/lib/rank";
import { formatDate, parseDate } from "@/lib/dates";
import { exportNamesPdf, exportBothCategoriesPdf } from "@/lib/exportPdf";
import { exportBeltOrderPdf, exportBeltOrderCsv } from "@/lib/exportBeltOrder";
import {
  mergeGradingOverrides,
  nextBeltInSequence,
  effectiveGradingBelt,
} from "@/lib/gradingBelt";
import {
  clearGradingOverrides,
  saveGradingBulkMove,
  saveStudentGradingOverride,
  fetchGiSizes,
} from "@/lib/rosterClient";
import { buildGiSizeOptions } from "@/lib/giSizes";
import {
  clearExcludedKeys,
  exclusionKey,
  loadExcludedKeys,
  saveExcludedKeys,
  withoutExcluded,
} from "@/lib/excludedStudents";
import FileUpload from "@/components/FileUpload";
import CategoryTabs from "@/components/CategoryTabs";
import BeltSummary from "@/components/BeltSummary";
import BeltSection from "@/components/BeltSection";
import StripeFilter from "@/components/StripeFilter";
import EventDatesFields from "@/components/EventDatesFields";
import {
  loadEventDates,
  saveEventDates,
  eventDatesForCategory,
} from "@/lib/eventDates";

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
 * @param {'clubworx'|'upload'} [props.dataSource]
 * @param {string} [props.emptyMessage]
 * @param {string} [props.viewLabel]
 * @param {string|null} [props.adultsUploadInfo]
 * @param {string|null} [props.kidsUploadInfo]
 * @param {string} [props.syncPassword]
 * @param {{ adults: Record<string, string>, kids: Record<string, string> }} [props.gradingOverrides]
 * @param {(o: { adults: Record<string, string>, kids: Record<string, string> }) => void} [props.onGradingOverridesChange]
 * @param {(category: 'adults'|'kids', contactKey: string, beltSize: string) => Promise<{ ok: boolean, error?: string }>} [props.onGiSizeSave]
 */
export default function GradingDashboard({
  readOnly = false,
  adults,
  kids,
  dataSource = "upload",
  emptyMessage,
  adultsUploadInfo,
  kidsUploadInfo,
  onAdultsUpload,
  onKidsUpload,
  onClearAdults,
  onClearKids,
  onClearAll,
  viewLabel,
  syncPassword,
  gradingOverrides = { adults: {}, kids: {} },
  onGradingOverridesChange,
  onGiSizeSave,
}) {
  const [activeTab, setActiveTab] = useState("adults");
  const [search, setSearch] = useState("");
  const [beltFilter, setBeltFilter] = useState("all");
  const [stripeFilters, setStripeFilters] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [viewMode, setViewMode] = useState("grading");
  const [excluded, setExcluded] = useState({ adults: [], kids: [] });
  const [savingGiSizeId, setSavingGiSizeId] = useState(null);
  const [savingGradingKey, setSavingGradingKey] = useState(null);
  const [fetchedGiSizes, setFetchedGiSizes] = useState({ adults: [], kids: [] });
  const [moveMessage, setMoveMessage] = useState("");
  const [moveError, setMoveError] = useState("");
  const [eventDates, setEventDates] = useState(loadEventDates);

  useEffect(() => {
    setEventDates(loadEventDates());
  }, []);

  useEffect(() => {
    saveEventDates(eventDates);
  }, [eventDates]);

  useEffect(() => {
    if (readOnly) return;
    let cancelled = false;
    (async () => {
      const result = await fetchGiSizes();
      if (cancelled) return;
      if (result.ok) {
        setFetchedGiSizes({
          adults: result.adults || [],
          kids: result.kids || [],
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOnly, dataSource, adults.savedAt, kids.savedAt]);

  useEffect(() => {
    setExcluded(loadExcludedKeys());
  }, []);

  const excludeStudent = useCallback((cat, student) => {
    const key = exclusionKey(cat, student);
    setExcluded((prev) => {
      const list = prev[cat];
      if (list.includes(key)) return prev;
      const next = { ...prev, [cat]: [...list, key] };
      saveExcludedKeys(next);
      return next;
    });
  }, []);

  const restoreExcludedForCategory = useCallback((cat) => {
    setExcluded((prev) => {
      if (!prev[cat].length) return prev;
      const next = { ...prev, [cat]: [] };
      saveExcludedKeys(next);
      return next;
    });
  }, []);

  const category = activeTab;
  const dataset = category === "adults" ? adults : kids;

  const studentsWithOverrides = useMemo(
    () => mergeGradingOverrides(dataset.students, gradingOverrides[category] || {}),
    [dataset.students, gradingOverrides, category]
  );

  const beltOptions = useMemo(() => {
    if (viewMode === "grading") {
      return gradingBeltFilterOptions(studentsWithOverrides, category);
    }
    return beltFilterOptions(studentsWithOverrides, category);
  }, [studentsWithOverrides, category, viewMode]);

  const stripeOptions = useMemo(
    () => stripeFilterOptions(studentsWithOverrides),
    [studentsWithOverrides]
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

  function filteredFor(cat, students, overrides) {
    const merged = mergeGradingOverrides(students, overrides[cat] || {});
    const belts =
      viewMode === "grading"
        ? gradingBeltFilterOptions(merged, cat)
        : beltFilterOptions(merged, cat);
    const belt =
      beltFilter === "all" || belts.includes(beltFilter) ? beltFilter : "all";
    return applyFilters(merged, {
      search,
      beltFilter: belt,
      stripeFilters,
      viewMode,
      category: cat,
    });
  }

  const filteredStudents = useMemo(() => {
    const filtered = filteredFor(category, dataset.students, gradingOverrides);
    return withoutExcluded(filtered, category, excluded[category]);
  }, [
    dataset.students,
    gradingOverrides,
    category,
    search,
    beltFilter,
    stripeFilters,
    viewMode,
    excluded,
  ]);

  const adultsFiltered = useMemo(() => {
    const filtered = filteredFor("adults", adults.students, gradingOverrides);
    return withoutExcluded(filtered, "adults", excluded.adults);
  }, [
    adults.students,
    gradingOverrides,
    search,
    beltFilter,
    stripeFilters,
    viewMode,
    excluded.adults,
  ]);

  const kidsFiltered = useMemo(() => {
    const filtered = filteredFor("kids", kids.students, gradingOverrides);
    return withoutExcluded(filtered, "kids", excluded.kids);
  }, [
    kids.students,
    gradingOverrides,
    search,
    beltFilter,
    stripeFilters,
    viewMode,
    excluded.kids,
  ]);

  const hiddenCountForTab = excluded[category].length;

  const groupOptions = viewMode === "grading" ? { groupByGrading: true } : {};

  const grouped = useMemo(
    () => groupByBelt(filteredStudents, category, sortBy, groupOptions),
    [filteredStudents, category, sortBy, viewMode]
  );

  const summaryCounts = useMemo(
    () => beltCounts(filteredStudents, category, viewMode),
    [filteredStudents, category, viewMode]
  );

  const hasAnyData = adults.students.length > 0 || kids.students.length > 0;

  const giSizeOptions = useMemo(
    () =>
      buildGiSizeOptions(
        category,
        fetchedGiSizes[category]?.length
          ? fetchedGiSizes[category]
          : [],
        dataset.students
      ),
    [category, fetchedGiSizes, dataset.students]
  );

  const lastSavedLabel = useMemo(() => {
    const times = [adults.savedAt, kids.savedAt]
      .map((t) => (t ? parseDate(t) : null))
      .filter(Boolean);
    if (!times.length) return null;
    const latest = new Date(Math.max(...times.map((d) => d.getTime())));
    return formatDate(latest);
  }, [adults.savedAt, kids.savedAt]);

  async function handleExportCurrentTab() {
    const dates = eventDatesForCategory(eventDates, category);
    await exportNamesPdf(filteredStudents, {
      category,
      filename: `bjj-grading-${category}-filtered.pdf`,
      gradingDate: dates.gradingDate,
      ceremonyDate: dates.ceremonyDate,
    });
  }

  async function handleExportBothTabs() {
    await exportBothCategoriesPdf({
      adults: adultsFiltered,
      kids: kidsFiltered,
      eventDates,
    });
  }

  async function handleExportBeltOrderPdf() {
    await exportBeltOrderPdf(filteredStudents, {
      category,
      filename: `belt-order-${category}-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  }

  function handleExportBeltOrderCsv() {
    exportBeltOrderCsv(filteredStudents, {
      category,
      filename: `belt-order-${category}-${new Date().toISOString().slice(0, 10)}.csv`,
    });
  }

  async function handleGiSizeSave(student, beltSize) {
    if (!onGiSizeSave) return;
    if (!student.contactKey) {
      alert("This member has no ClubWorx contact key — use Sync from ClubWorx to refresh the roster.");
      return;
    }
    const saveKey =
      student.contactKey || student.memberStyleId || student.fullName;
    setSavingGiSizeId(saveKey);
    const result = await onGiSizeSave(category, student, beltSize);
    setSavingGiSizeId(null);
    if (!result.ok) {
      alert(result.error || "Could not save Gi size");
      return;
    }
    if (result.warning) {
      setMoveMessage(result.warning);
    }
  }

  async function handleGradingBeltChange(student, gradingBelt) {
    if (!onGradingOverridesChange || !student.contactKey) return;
    setSavingGradingKey(student.contactKey);
    const result = await saveStudentGradingOverride({
      category,
      contactKey: student.contactKey,
      gradingBelt: gradingBelt || "",
      password: syncPassword || undefined,
    });
    setSavingGradingKey(null);
    if (!result.ok) {
      alert(result.error || "Could not save grading belt");
      return;
    }
    if (result.localOnly && result.warning) {
      setMoveMessage(result.warning);
    }
    const next = { ...gradingOverrides[category] };
    if (!gradingBelt) {
      delete next[student.contactKey];
    } else {
      next[student.contactKey] = gradingBelt;
    }
    onGradingOverridesChange({
      ...gradingOverrides,
      [category]: next,
    });
  }

  async function handleBulkMoveGrading() {
    setMoveError("");
    setMoveMessage("");
    const toMove = filteredStudents.filter((s) => s.contactKey);
    if (!toMove.length) return;

    const contactKeys = [];
    for (const s of toMove) {
      const current = effectiveGradingBelt(s, category);
      const next = nextBeltInSequence(current, category);
      if (!next) continue;
      contactKeys.push({ contactKey: s.contactKey, gradingBelt: next });
    }

    if (!contactKeys.length) {
      setMoveError("No students can move to a higher belt colour from this filter.");
      return;
    }

    const sampleBelt = contactKeys[0].gradingBelt;
    const label =
      sampleBelt === "unknown"
        ? "next grading"
        : beltDisplayName(sampleBelt);
    if (
      !window.confirm(
        `Move ${contactKeys.length} student(s) to ${label} grading list? This does not change ClubWorx ranks.`
      )
    ) {
      return;
    }

    const result = await saveGradingBulkMove({
      category,
      contactKeys,
      password: syncPassword || undefined,
    });

    if (!result.ok) {
      setMoveError(result.error || "Could not save grading moves");
      return;
    }

    const nextOverrides = { ...gradingOverrides[category] };
    for (const { contactKey, gradingBelt } of contactKeys) {
      nextOverrides[contactKey] = gradingBelt;
    }
    onGradingOverridesChange?.({
      ...gradingOverrides,
      [category]: nextOverrides,
    });
    setMoveMessage(`Moved ${contactKeys.length} student(s) to ${label} grading.`);
  }

  async function handleResetGradingMoves() {
    if (
      !window.confirm(
        `Reset all manual grading moves for ${category}? ClubWorx ranks are unchanged.`
      )
    ) {
      return;
    }
    const result = await clearGradingOverrides({
      category,
      password: syncPassword || undefined,
    });
    if (!result.ok) {
      setMoveError(result.error || "Could not reset grading moves");
      return;
    }
    onGradingOverridesChange?.({
      ...gradingOverrides,
      [category]: {},
    });
    setMoveMessage(`Reset grading moves for ${category}.`);
  }

  return (
    <>
      {viewLabel && (
        <p className="mb-4 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-900">
          {viewLabel}
        </p>
      )}

      {!readOnly && dataSource === "upload" && onAdultsUpload && onKidsUpload && (
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
          {emptyMessage ||
            (readOnly
              ? "This shared report has no data."
              : dataSource === "clubworx"
                ? "No ClubWorx data loaded yet. Sync from ClubWorx to view the grading report."
                : "Upload at least one spreadsheet to view the grading report.")}
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

            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <input
                type="search"
                placeholder="Search by name, email, rank…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 sm:col-span-2 lg:col-span-3"
              />

              <EventDatesFields dates={eventDates} onChange={setEventDates} />

              <select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value);
                  setBeltFilter("all");
                }}
                className="min-w-0 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none sm:col-span-2 lg:col-span-3"
                aria-label="View mode"
              >
                <option value="grading">View by grading belt (next colour)</option>
                <option value="current">View by current belt</option>
              </select>
              <select
                value={effectiveBeltFilter}
                onChange={(e) => setBeltFilter(e.target.value)}
                className="min-w-0 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
                aria-label="Filter by belt colour"
              >
                <option value="all">
                  {viewMode === "grading"
                    ? "All grading belts"
                    : "All belt colours"}
                </option>
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
              {!readOnly && dataSource === "clubworx" && onGradingOverridesChange && (
                <>
                  <button
                    type="button"
                    onClick={handleBulkMoveGrading}
                    disabled={filteredStudents.length === 0}
                    className="w-full rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100 disabled:opacity-50 lg:col-span-3"
                  >
                    Move filtered to next belt grading
                  </button>
                  <button
                    type="button"
                    onClick={handleResetGradingMoves}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 lg:col-span-3"
                  >
                    Reset grading moves ({category})
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={handleExportCurrentTab}
                disabled={filteredStudents.length === 0}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                Export names PDF ({category})
              </button>
              <button
                type="button"
                onClick={handleExportBeltOrderPdf}
                disabled={filteredStudents.length === 0}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                Belt order PDF
              </button>
              <button
                type="button"
                onClick={handleExportBeltOrderCsv}
                disabled={filteredStudents.length === 0}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
              >
                Belt order CSV
              </button>
              {adults.students.length > 0 && kids.students.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportBothTabs}
                  disabled={
                    adultsFiltered.length === 0 && kidsFiltered.length === 0
                  }
                  className="w-full rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 lg:col-span-3"
                >
                  Export PDF (both)
                </button>
              )}
            </div>
          </div>

          {moveMessage && (
            <p className="mb-2 text-sm text-green-800">{moveMessage}</p>
          )}
          {moveError && (
            <p className="mb-2 text-sm text-red-600" role="alert">
              {moveError}
            </p>
          )}

          {!readOnly && onClearAll && dataSource === "upload" && (
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  clearExcludedKeys();
                  setExcluded({ adults: [], kids: [] });
                  onClearAll();
                }}
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

              {hiddenCountForTab > 0 && (
                <p className="mb-4 text-sm text-zinc-600">
                  {hiddenCountForTab} student
                  {hiddenCountForTab === 1 ? "" : "s"} hidden from this list and
                  PDF exports.{" "}
                  <button
                    type="button"
                    onClick={() => restoreExcludedForCategory(category)}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    Show all again
                  </button>
                </p>
              )}

              <section className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  {viewMode === "grading"
                    ? "Students by grading belt"
                    : "Students by belt"}
                </h2>
                {[...grouped.entries()].map(([belt, students]) => (
                  <BeltSection
                    key={belt}
                    belt={belt}
                    students={students}
                    category={category}
                    readOnly={readOnly}
                    giSizeOptions={giSizeOptions}
                    defaultOpen={belt !== "unknown"}
                    onExcludeStudent={(student) =>
                      excludeStudent(category, student)
                    }
                    onGiSizeSave={
                      readOnly || !onGiSizeSave
                        ? undefined
                        : dataSource === "clubworx"
                          ? handleGiSizeSave
                          : undefined
                    }
                    onGradingBeltChange={
                      readOnly || !onGradingOverridesChange
                        ? undefined
                        : handleGradingBeltChange
                    }
                    savingGiSizeId={savingGiSizeId}
                    savingGradingKey={savingGradingKey}
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
