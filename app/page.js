"use client";

import { useEffect, useState } from "react";
import { parseExcelFile } from "@/lib/parseExcel";
import { deduplicateStudents } from "@/lib/deduplicate";
import {
  saveDataset,
  loadDataset,
  clearSavedDataset,
  clearAllSavedData,
} from "@/lib/storage";
import { formatDate, parseDate } from "@/lib/dates";
import GradingDashboard from "@/components/GradingDashboard";
import SharePanel from "@/components/SharePanel";
import PageHeader from "@/components/PageHeader";

const emptyDataset = () => ({
  students: [],
  fileName: null,
  error: null,
  savedAt: null,
  duplicatesRemoved: 0,
});

function normalizeLoaded(loaded) {
  const { students, duplicatesRemoved } = deduplicateStudents(
    loaded.students || []
  );
  return {
    students,
    fileName: loaded.fileName,
    error: null,
    savedAt: loaded.savedAt ?? null,
    duplicatesRemoved,
  };
}

export default function Home() {
  const [adults, setAdults] = useState(emptyDataset);
  const [kids, setKids] = useState(emptyDataset);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loadedAdults = loadDataset("adults");
    const loadedKids = loadDataset("kids");
    if (loadedAdults?.students?.length) {
      setAdults(normalizeLoaded(loadedAdults));
    }
    if (loadedKids?.students?.length) {
      setKids(normalizeLoaded(loadedKids));
    }
    setHydrated(true);
  }, []);

  async function handleUpload(category, file) {
    const setDataset = category === "adults" ? setAdults : setKids;
    setDataset({
      students: [],
      fileName: file.name,
      error: null,
      savedAt: null,
      duplicatesRemoved: 0,
    });

    const { students, error, duplicatesRemoved = 0 } = await parseExcelFile(file);
    if (error) {
      setDataset({
        students: [],
        fileName: null,
        error,
        savedAt: null,
        duplicatesRemoved: 0,
      });
      clearSavedDataset(category);
      return;
    }
    const dataset = {
      students,
      fileName: file.name,
      error: null,
      savedAt: new Date().toISOString(),
      duplicatesRemoved,
    };
    setDataset(dataset);
    saveDataset(category, dataset);
  }

  function clearDataset(category) {
    const setDataset = category === "adults" ? setAdults : setKids;
    setDataset(emptyDataset());
    clearSavedDataset(category);
  }

  function clearAllData() {
    setAdults(emptyDataset());
    setKids(emptyDataset());
    clearAllSavedData();
  }

  const hasAnyData = adults.students.length > 0 || kids.students.length > 0;

  const lastSavedLabel = (() => {
    const times = [adults.savedAt, kids.savedAt]
      .map((t) => (t ? parseDate(t) : null))
      .filter(Boolean);
    if (!times.length) return null;
    const latest = new Date(Math.max(...times.map((d) => d.getTime())));
    return formatDate(latest);
  })();

  if (!hydrated) {
    return (
      <main className="mx-auto max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <p className="text-center text-zinc-500">Loading saved data…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <PageHeader title="BJJ grading report">
        <p className="mt-2 max-w-2xl text-zinc-600">
          Upload spreadsheets, filter the roster, export results, and publish a
          view-only link for other coaches. Data in this browser is also saved
          locally until you clear it.
        </p>
        {lastSavedLabel && (
          <p className="mt-2 text-sm text-zinc-500">
            Last saved in this browser: {lastSavedLabel}
          </p>
        )}
      </PageHeader>

      {hasAnyData && (
        <SharePanel
          adults={adults}
          kids={kids}
          disabled={!hasAnyData}
        />
      )}

      <GradingDashboard
        adults={adults}
        kids={kids}
        adultsUploadInfo={
          adults.duplicatesRemoved > 0
            ? `${adults.duplicatesRemoved} duplicate row(s) removed`
            : null
        }
        kidsUploadInfo={
          kids.duplicatesRemoved > 0
            ? `${kids.duplicatesRemoved} duplicate row(s) removed`
            : null
        }
        onAdultsUpload={(file) => handleUpload("adults", file)}
        onKidsUpload={(file) => handleUpload("kids", file)}
        onClearAdults={() => clearDataset("adults")}
        onClearKids={() => clearDataset("kids")}
        onClearAll={clearAllData}
      />
    </main>
  );
}
