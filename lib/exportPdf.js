import { jsPDF } from "jspdf";
import { groupByBelt } from "./groupStudents";
import { beltDisplayName } from "./rank";
import { getBeltPdfColors } from "./beltPdfColors";
import { formatEventDateForPdf } from "./eventDates";
import { pdfGroupOptions } from "./gradingBelt";

const PAGE_FORMAT = "a5";
const MARGIN = 10;
const HEADER_BAR_H = 7;
const LINE_H = 4.8;
const COL_GAP = 6;
const LOGO_SIZE_MM = 22;
const LOGO_PATH = "/pja-logo.png?v=2";
/** ~350 dpi at LOGO_SIZE_MM — sharp in print without bloating the file. */
const LOGO_MAX_PX = 300;

const FONT_TITLE = 14;
const FONT_SUBTITLE = 10;
const FONT_BELT_HEADER = 9;
const FONT_NAME = 8.5;
const FONT_FOOTER_TITLE = 11;
const FONT_FOOTER_DATE = 10;
const FOOTER_RESERVE_MM = 18;

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
    const original = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    logoDataUrlCache = (await downscaleImage(original, LOGO_MAX_PX)) || original;
    return logoDataUrlCache;
  } catch {
    return null;
  }
}

/**
 * @param {string} dataUrl
 * @param {number} maxPx
 * @returns {Promise<string|null>}
 */
async function downscaleImage(dataUrl, maxPx) {
  if (typeof document === "undefined" || typeof Image === "undefined") return null;
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
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
/**
 * @param {import('jspdf').jsPDF} doc
 * @param {'adults'|'kids'|string} category
 * @param {string|null} logoDataUrl
 * @param {{ gradingDate?: string }} [eventDates]
 */
function drawPdfHeader(doc, category, logoDataUrl, eventDates = {}) {
  const pageW = doc.internal.pageSize.getWidth();
  let y = MARGIN;

  if (logoDataUrl) {
    const x = (pageW - LOGO_SIZE_MM) / 2;
    doc.addImage(logoDataUrl, "PNG", x, y, LOGO_SIZE_MM, LOGO_SIZE_MM, "logo", "FAST");
    y += LOGO_SIZE_MM + 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_TITLE);
  doc.setTextColor(24, 24, 27);
  doc.text(categoryHeading(category), pageW / 2, y, { align: "center" });
  y += 7;

  const gradingLabel = formatEventDateForPdf(eventDates.gradingDate);
  if (gradingLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SUBTITLE);
    doc.setTextColor(63, 63, 70);
    doc.text(`Grading date: ${gradingLabel}`, pageW / 2, y, { align: "center" });
    y += 6;
  }

  y += 4;
  return y;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {string} [ceremonyDate] ISO date
 */
function drawCeremonyFooter(doc, ceremonyDate) {
  const ceremonyLabel = formatEventDateForPdf(ceremonyDate);
  if (!ceremonyLabel) return;

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const titleY = pageH - MARGIN - 11;
  const dateY = pageH - MARGIN - 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_FOOTER_TITLE);
  doc.setTextColor(24, 24, 27);
  doc.text("Belt ceremony date", pageW / 2, titleY, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_FOOTER_DATE);
  doc.setTextColor(63, 63, 70);
  doc.text(ceremonyLabel, pageW / 2, dateY, { align: "center" });
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
  doc.setFontSize(FONT_BELT_HEADER);
  doc.setTextColor(...colors.headerText);
  doc.text(`${label} (${students.length})`, MARGIN + 3, y + 4.9);
  y += HEADER_BAR_H + 1.5;

  const names = students
    .map((s) => s.fullName)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const colW = (contentW - COL_GAP) / 2;
  const rows = Math.ceil(names.length / 2);
  const blockH = Math.max(rows * LINE_H + 3, LINE_H + 3);

  y = ensureSpace(doc, y, blockH);

  doc.setFillColor(...colors.body);
  doc.rect(MARGIN, y, contentW, blockH, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_NAME);
  doc.setTextColor(...colors.bodyText);

  names.forEach((name, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + 3 + col * (colW + COL_GAP);
    const ny = y + 4 + row * LINE_H;
    doc.text(name, x, ny, { maxWidth: colW - 2 });
  });

  return y + blockH + 4;
}

/**
 * @param {import('jspdf').jsPDF} doc
 * @param {import('./parseExcel').Student[]} students
 * @param {{ category: string }} options
 * @param {string|null} logoDataUrl
 */
function renderCategoryPdf(doc, students, options, logoDataUrl) {
  const { category, gradingDate, ceremonyDate } = options;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const footerReserve = ceremonyDate ? FOOTER_RESERVE_MM : 0;
  let y = drawPdfHeader(doc, category, logoDataUrl, { gradingDate });

  const grouped = groupByBelt(students, category, "name", pdfGroupOptions(category));

  if (grouped.size === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_SUBTITLE);
    doc.setTextColor(82, 82, 91);
    doc.text("No students match the current filters.", pageW / 2, y, {
      align: "center",
    });
    drawCeremonyFooter(doc, ceremonyDate);
    return;
  }

  for (const [belt, beltStudents] of grouped) {
    y = drawBeltSection(doc, belt, beltStudents, y, pageW);
    if (ceremonyDate && y > pageH - MARGIN - footerReserve) {
      doc.addPage();
      y = MARGIN;
    }
  }

  drawCeremonyFooter(doc, ceremonyDate);
}

/**
 * @param {import('./parseExcel').Student[]} students
 * @param {{ category: string, filename?: string, gradingDate?: string, ceremonyDate?: string }} options
 */
export async function exportNamesPdf(students, options) {
  const { category, filename, gradingDate, ceremonyDate } = options;
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ unit: "mm", format: PAGE_FORMAT });
  renderCategoryPdf(
    doc,
    students,
    { category, gradingDate, ceremonyDate },
    logoDataUrl
  );
  doc.save(
    filename ||
      `bjj-grading-${category}-${new Date().toISOString().slice(0, 10)}.pdf`
  );
}

/**
 * @param {{
 *   adults: import('./parseExcel').Student[],
 *   kids: import('./parseExcel').Student[],
 *   eventDates?: import('./eventDates').EventDates,
 * }} options
 */
export async function exportBothCategoriesPdf(options) {
  const { adults, kids, eventDates } = options;
  const logoDataUrl = await loadLogoDataUrl();
  const doc = new jsPDF({ unit: "mm", format: PAGE_FORMAT });

  if (adults.length) {
    renderCategoryPdf(
      doc,
      adults,
      {
        category: "adults",
        gradingDate: eventDates?.adults?.gradingDate,
        ceremonyDate: eventDates?.adults?.ceremonyDate,
      },
      logoDataUrl
    );
  }

  if (kids.length) {
    if (adults.length) doc.addPage();
    renderCategoryPdf(
      doc,
      kids,
      {
        category: "kids",
        gradingDate: eventDates?.kids?.gradingDate,
        ceremonyDate: eventDates?.kids?.ceremonyDate,
      },
      logoDataUrl
    );
  }

  if (!adults.length && !kids.length) return;

  doc.save(`bjj-grading-${new Date().toISOString().slice(0, 10)}.pdf`);
}
