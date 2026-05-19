"use client";

import { use, useEffect, useState } from "react";
import { deserializeSharePayload } from "@/lib/datasetSerialize";
import GradingDashboard from "@/components/GradingDashboard";
import PageHeader from "@/components/PageHeader";

const emptyDataset = () => ({
  students: [],
  fileName: null,
  error: null,
  savedAt: null,
});

export default function SharedReportPage({ params }) {
  const { shareId } = use(params);
  const [adults, setAdults] = useState(emptyDataset);
  const [kids, setKids] = useState(emptyDataset);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/share/${shareId}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Report not found");
          return;
        }
        const { adults: a, kids: k, createdAt } = deserializeSharePayload(data);
        const savedAt = createdAt ?? null;
        setAdults({ ...a, savedAt });
        setKids({ ...k, savedAt });
      } catch {
        setError("Could not load this report");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [shareId]);

  return (
    <main className="mx-auto min-h-screen w-full min-w-0 max-w-[90rem] flex-1 overflow-x-clip px-4 py-8 sm:px-6">
      <PageHeader title="BJJ grading report">
        <p className="mt-2 text-zinc-600">Shared view — read only</p>
      </PageHeader>

      {loading && (
        <p className="text-center text-zinc-500">Loading report…</p>
      )}

      {error && !loading && (
        <p className="rounded-lg bg-red-50 px-4 py-8 text-center text-red-700">
          {error}
        </p>
      )}

      {!loading && !error && (
        <GradingDashboard
          readOnly
          adults={adults}
          kids={kids}
          viewLabel="You are viewing a published report. Use filters and export PDF below — upload controls are hidden."
        />
      )}
    </main>
  );
}
