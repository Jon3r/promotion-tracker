import { jsPDF } from "jspdf";
import { beltDisplayName } from "./rank";
import {
  effectiveGradingBelt,
  displayNextRank,
  supportsGradingBeltView,
} from "./gradingBelt";
import { giSizeSortIndex } from "./giSizes";

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {'adults'|'kids'} category
 */
function sortForBeltOrder(students, category) {
  return [...students].sort((a, b) => {
    const sa = giSizeSortIndex(a.beltSize, category);
    const sb = giSizeSortIndex(b.beltSize, category);
    if (sa !== sb) return sa - sb;
    return a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" });
  });
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {'adults'|'kids'} category
 */
function groupByGiSize(students, category) {
  const sorted = sortForBeltOrder(students, category);
  const groups = new Map();
  for (const s of sorted) {
    const size = String(s.beltSize || "").trim() || "Unknown size";
    if (!groups.has(size)) groups.set(size, []);
    groups.get(size).push(s);
  }
  return groups;
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {{ category: 'adults'|'kids', filename?: string }} options
 */
export async function exportBeltOrderPdf(students, options) {
  const { category, filename } = options;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = margin;

  const title =
    category === "kids" ? "Belt order list — Kids" : "Belt order list — Adults";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(24, 24, 27);
  doc.text(title, margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(82, 82, 91);
  doc.text(new Date().toLocaleDateString("en-AU"), margin, y);
  y += 10;

  const grouped = groupByGiSize(students, category);
  if (!grouped.size) {
    doc.text("No students to export.", margin, y);
  }

  for (const [size, list] of grouped) {
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(24, 24, 27);
    doc.text(`${size} (${list.length})`, margin, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(39, 39, 42);
    for (const s of list) {
      if (y > 285) {
        doc.addPage();
        y = margin;
      }
      const belt = supportsGradingBeltView(category)
        ? effectiveGradingBelt(s, category)
        : s.currentParsed?.belt ?? "unknown";
      const beltLabel =
        belt === "unknown" ? "Needs review" : `${beltDisplayName(belt)} belt`;
      const line = supportsGradingBeltView(category)
        ? `• ${s.fullName} — grading to ${beltLabel}`
        : `• ${s.fullName} — ${s.currentRank || beltLabel}`;
      doc.text(line, margin + 2, y);
      y += 5.5;
    }
    y += 4;
  }

  y += 6;
  if (y > 270) {
    doc.addPage();
    y = margin;
  }
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text(
    "Gi sizes from ClubWorx; grading belt includes manual moves.",
    margin,
    y
  );

  doc.save(
    filename ||
      `belt-order-${category}-${new Date().toISOString().slice(0, 10)}.pdf`
  );
}

function csvEscape(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {{ category: 'adults'|'kids', filename?: string }} options
 */
export function exportBeltOrderCsv(students, options) {
  const { category, filename } = options;
  const sorted = sortForBeltOrder(students, category);
  const header = [
    "Name",
    "Gi size",
    "Current rank",
    "Next rank",
    "Grading belt",
    "Email",
    "Phone",
  ];
  const rows = sorted.map((s) => {
    const grading = supportsGradingBeltView(category)
      ? effectiveGradingBelt(s, category)
      : s.currentParsed?.belt ?? "unknown";
    return [
      s.fullName,
      s.beltSize || "",
      s.currentRank || "",
      displayNextRank(s, category),
      supportsGradingBeltView(category)
        ? grading === "unknown"
          ? "Needs review"
          : beltDisplayName(grading)
        : "—",
      s.email || "",
      s.phone || "",
    ];
  });

  const lines = [
    header.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ||
    `belt-order-${category}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
