import { jsPDF } from "jspdf";
import { groupByBelt } from "./groupStudents";
import { beltDisplayName } from "./rank";
import { getBeltPdfColors } from "./beltPdfColors";

const MARGIN = 14;
const HEADER_BAR_H = 9;
const LINE_H = 6;
const COL_GAP = 8;
const LOGO_SIZE_MM = 32;
const LOGO_PATH = "/pja-logo.png?v=2";

/** @type {string|null} */
let logoDataUrlCache = null;

/**
 * @returns {Promise<string|null>}
 */
async function loadLogoDataUrl() {
  if (logoDataUrlCache) return logoDataUrlCache;
  if (typeof window === "undefined") return null;

  try {
    const res = await fetch(LOGO_PATH);
    if (!res.ok) return null;
    const blob = await res.blob();
    logoDataUrlCache = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    return logoDataUrlCache;
  } catch {
    return null;
  }
}

/**
 * @param {'adults'|'kids'|string} category
 */
function categoryHeading(category) {
  return category === "kids" ? "Kids grading list" : "Adult Grading list";
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {'adults'|'kids'|string} category
 * @param {string|null} logoDataUrl
 * @returns {number} y position after header
 */
function drawPdfHeader(doc, category, logoDataUrl) {
  const pageW = doc.internal.pageSize.getWidth();
  let y = MARGIN;

  if (logoDataUrl) {
    const x = (pageW - LOGO_SIZE_MM) / 2;
    doc.addImage(logoDataUrl, "PNG", x, y, LOGO_SIZE_MM, LOGO_SIZE_MM);
    y += LOGO_SIZE_MM + 8;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  doc.text(categoryHeading(category), pageW / 2, y, { align: "center" });
  y += 14;

  return y;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {number} y
 * @param {number} needed
 */
function ensureSpace(doc, y, needed) {
  const pageH = doc.internal.pageSize.getHeight();
  if (y + needed > pageH - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {string} belt
 * @param {import('./parseExcel').Student[]} students
 * @param {number} startY
 * @param {number} pageW
 */
function drawBeltSection(doc, belt, students, startY, pageW) {
  const colors = getBeltPdfColors(belt);
  const label =
    belt === "unknown" ? "Needs review" : `${beltDisplayName(belt)} belt`;
  const contentW = pageW - MARGIN * 2;

  let y = ensureSpace(doc, startY, HEADER_BAR_H + LINE_H * 2);

  doc.setFillColor(...colors.header);
  doc.rect(MARGIN, y, contentW, HEADER_BAR_H, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...colors.headerText);
  doc.text(`${label} (${students.length})`, MARGIN + 3, y + 6.2);
  y += HEADER_BAR_H + 2;

  const names = students
    .map((s) => s.fullName)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const colW = (contentW - COL_GAP) / 2;
  const rows = Math.ceil(names.length / 2);
  const blockH = Math.max(rows * LINE_H + 4, LINE_H + 4);

  y = ensureSpace(doc, y, blockH);

  doc.setFillColor(...colors.body);
  doc.rect(MARGIN, y, contentW, blockH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...colors.bodyText);

  names.forEach((name, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + 4 + col * (colW + COL_GAP);
    const ny = y + 5 + row * LINE_H;
    doc.text(name, x, ny, { maxWidth: colW - 2 });
  });

  return y + blockH + 5;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {import('./parseExcel').Student[]} students
 * @param {{ category: string }} options
 * @param {string|null} logoDataUrl
 */
function renderCategoryPdf(doc, students, options, logoDataUrl) {
  const { category } = options;
  const pageW = doc.internal.pageSize.getWidth();
  let y = drawPdfHeader(doc, category, logoDataUrl);

  const grouped = groupByBelt(students, category, "name");

  if (grouped.size === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(82, 82, 91);
    doc.text("No students match the current filters.", pageW / 2, y, {
      align: "center",
    });
    return;
  }

  for (const [belt, beltStudents] of grouped) {
    y = drawBeltSection(doc, belt, beltStudents, y, pageW);
  }
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {{ category: string, filename?: string }} options
 */
export async function exportNamesPdf(students, options) {
  const { category, filename } = options;
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  renderCategoryPdf(doc, students, { category }, logoDataUrl);
  doc.save(
    filename ||
      `bjj-grading-${category}-${new Date().toISOString().slice(0, 10)}.pdf`
  );
}

/**
 * @param {{ adults: import('./parseExcel').Student[], kids: import('./parseExcel').Student[] }} options
 */
export async function exportBothCategoriesPdf(options) {
  const { adults, kids } = options;
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  if (adults.length) {
    renderCategoryPdf(doc, adults, { category: "adults" }, logoDataUrl);
  }

  if (kids.length) {
    if (adults.length) doc.addPage();
    renderCategoryPdf(doc, kids, { category: "kids" }, logoDataUrl);
  }

  if (!adults.length && !kids.length) return;

  doc.save(`bjj-grading-${new Date().toISOString().slice(0, 10)}.pdf`);
}
