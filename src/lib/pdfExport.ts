/**
 * pdfExport.ts
 *
 * Hybrid PDF export:
 *
 *   Desktop  →  window.print()
 *               Real text PDF, selectable/searchable, pixel-perfect.
 *               Works because @page { margin: 0 } in index.css kills the
 *               browser-injected URL / date decorations.
 *
 *   Mobile   →  html2canvas → jsPDF image PDF
 *               Mobile browsers (Chrome Android, Safari iOS) ignore or
 *               partially honour @page margin: 0, and still inject their
 *               own chrome even when margin is zero on some versions.
 *               Capturing to canvas bypasses the browser print pipeline
 *               entirely so there is nothing to inject.
 *
 * The public API (exportElementToPdf / exportElementToPdfBlob) is
 * unchanged so no other file needs to be modified.
 */

import type { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────

const A4_W_MM = 210;
const A4_H_MM = 297;

/**
 * Must match the preview's max-w-[850px].
 * Passing this as windowWidth to html2canvas makes Tailwind responsive
 * classes resolve identically to the live preview.
 */
const RENDER_WIDTH_PX = 850;

/** Capture scale. 3 = ~2550 px wide → crisp on print. */
const CAPTURE_SCALE = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PdfExportOptions = {
  scale?: number;
  imageFormat?: "JPEG" | "PNG";
  quality?: number;
};

// ─── Mobile detection ─────────────────────────────────────────────────────────

/**
 * Returns true when we should use the image-PDF path.
 *
 * We detect mobile / tablet by:
 *   1. Touch capability — desktops rarely have touch.
 *   2. Narrow viewport — phones are <1024 px wide.
 *   3. User-agent strings for iOS / Android (belt-and-suspenders).
 *
 * We deliberately keep desktop (mouse, wide screen) on the print path
 * because window.print() produces a real text PDF there.
 */
function shouldUseImagePdf(): boolean {
  // Explicit override via URL param ?pdf=image or ?pdf=print for testing
  const param = new URLSearchParams(window.location.search).get("pdf");
  if (param === "image") return true;
  if (param === "print") return false;

  const ua = navigator.userAgent;
  const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isTouchOnly = navigator.maxTouchPoints > 1 && window.innerWidth < 1024;

  return isMobileUA || isTouchOnly;
}

// ─── Desktop path: window.print() ────────────────────────────────────────────

/**
 * Triggers the browser print dialog.
 *
 * Returns a Promise that resolves after the dialog closes (or immediately
 * on browsers that don't support onafterprint).
 *
 * Filename hint: Chrome/Edge honour the <title> tag as the suggested
 * filename.  We temporarily set it to `filename` then restore it.
 */
function printViaBrowser(filename: string): Promise<void> {
  return new Promise((resolve) => {
    const prev = document.title;
    // Strip .pdf extension — browsers add it automatically
    document.title = filename.replace(/\.pdf$/i, "");

    const cleanup = () => {
      document.title = prev;
      resolve();
    };

    if ("onafterprint" in window) {
      window.onafterprint = () => {
        window.onafterprint = null;
        cleanup();
      };
    }

    window.print();

    // Fallback: resolve after a short delay for browsers without onafterprint
    if (!("onafterprint" in window)) {
      setTimeout(cleanup, 500);
    }
  });
}

// ─── Mobile path: html2canvas → jsPDF ────────────────────────────────────────

async function captureElementCanvas(
  element: HTMLElement,
  scale: number,
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");

  // Pin width so Tailwind breakpoints resolve at 850 px (same as preview)
  const prev = { width: element.style.width, maxWidth: element.style.maxWidth };
  element.style.width = `${RENDER_WIDTH_PX}px`;
  element.style.maxWidth = `${RENDER_WIDTH_PX}px`;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: RENDER_WIDTH_PX,
    windowWidth: RENDER_WIDTH_PX,
    height: element.scrollHeight,
    scrollY: 0,
    scrollX: 0,
  });

  element.style.width = prev.width;
  element.style.maxWidth = prev.maxWidth;

  return canvas;
}

async function buildPdfFromCanvas(
  canvas: HTMLCanvasElement,
  imageFormat: "JPEG" | "PNG",
  quality: number,
): Promise<jsPDF> {
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Full A4 — no margins (invoice card has its own internal padding)
  const pageW = A4_W_MM;
  const pageH = A4_H_MM;

  const pxPerMm = canvas.width / pageW;
  const pageHeightPx = Math.round(pageH * pxPerMm);
  const totalHeightPx = canvas.height;
  const pageCount = Math.ceil(totalHeightPx / pageHeightPx);

  for (let i = 0; i < pageCount; i++) {
    if (i > 0) pdf.addPage();

    const srcY = i * pageHeightPx;
    const srcH = Math.min(pageHeightPx, totalHeightPx - srcY);

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightPx;

    const ctx = pageCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);

    const mime = imageFormat === "JPEG" ? "image/jpeg" : "image/png";
    const dataUrl =
      imageFormat === "JPEG"
        ? pageCanvas.toDataURL(mime, quality)
        : pageCanvas.toDataURL(mime);

    pdf.addImage(dataUrl, imageFormat, 0, 0, pageW, pageH, undefined, "FAST");
  }

  return pdf;
}

function addPageNumbers(pdf: jsPDF): void {
  const total = pdf.getNumberOfPages();
  if (total <= 1) return;

  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(160, 160, 160);
    pdf.text(`Page ${i} of ${total}`, A4_W_MM / 2, A4_H_MM - 4, { align: "center" });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Export the invoice element to PDF and trigger a download.
 * Called by InvoiceGenerator's "Save PDF" button.
 *
 *   Desktop → window.print() (real text PDF)
 *   Mobile  → html2canvas image PDF
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: PdfExportOptions,
): Promise<void> {
  if (!shouldUseImagePdf()) {
    // Desktop: use the browser print pipeline for a real text PDF.
    await printViaBrowser(filename);
    return;
  }

  // Mobile: image PDF via html2canvas
  const scale = options?.scale ?? CAPTURE_SCALE;
  const imageFormat = options?.imageFormat ?? "PNG";
  const quality = options?.quality ?? 0.95;

  const canvas = await captureElementCanvas(element, scale);
  const pdf = await buildPdfFromCanvas(canvas, imageFormat, quality);
  addPageNumbers(pdf);
  pdf.save(filename);
}

/**
 * Export to a PDF Blob without downloading.
 * Called by BulkInvoice to pack PDFs into a ZIP.
 * Always uses the image path (bulk runs headlessly, no print dialog possible).
 */
export async function exportElementToPdfBlob(
  element: HTMLElement,
  options?: PdfExportOptions,
): Promise<Blob> {
  const scale = options?.scale ?? CAPTURE_SCALE;
  const imageFormat = options?.imageFormat ?? "PNG";
  const quality = options?.quality ?? 0.95;

  const canvas = await captureElementCanvas(element, scale);
  const pdf = await buildPdfFromCanvas(canvas, imageFormat, quality);
  return pdf.output("blob");
}
