"use client";

import { useState } from "react";
import { serializeDataset } from "@/lib/datasetSerialize";

export default function SharePanel({ adults, kids, disabled }) {
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function publish() {
    setError("");
    setLoading(true);
    setCopied(false);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password || undefined,
          adults: serializeDataset(adults),
          kids: serializeDataset(kids),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create share link");
        return;
      }

      const url = `${window.location.origin}/view/${data.shareId}`;
      setShareUrl(url);
    } catch {
      setError("Network error — could not publish");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mb-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-zinc-900">
        Share with coaches (view only)
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        Publish the current Adults and Kids data to a link others can open
        without uploading. They see the report only — not your upload controls.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm">
          <span className="text-zinc-600">Publish password (if your admin set one)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Optional"
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          onClick={publish}
          disabled={disabled || loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {loading ? "Publishing…" : "Create share link"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {shareUrl && (
        <div className="mt-4 rounded-lg bg-zinc-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Share this link
          </p>
          <p className="mt-1 break-all text-sm text-zinc-800">{shareUrl}</p>
          <button
            type="button"
            onClick={copyLink}
            className="mt-2 text-sm font-medium text-blue-600 hover:underline"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}
    </section>
  );
}
