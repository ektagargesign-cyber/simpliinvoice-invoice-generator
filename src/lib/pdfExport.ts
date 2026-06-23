/**
 * pdfExport.ts
 *
 * Strategy: capture the entire invoice element as ONE canvas at a fixed
 * 850 px render width (matching the preview's max-w-[850px]), then slice
 * that single canvas into A4 pages.  This guarantees the PDF is pixel-for-
 * pixel identical to the live preview because nothing is captured in
 * isolation — every section inherits the same layout context.
 *
 * Page numbers are added as real text on top of each page after slicing.
 */

import type { jsPDF } from "jspdf";

// ─── Constants ────────────────────────────────────────────────────────────────

/** A4 dimensions in mm */
const A4_W_MM = 210;
const A4_H_MM = 297;

/**
 * Render width in CSS pixels.  Must match the preview's max-w-[850px].
 * html2canvas will use this as the viewport/container width so Tailwind
 * responsive classes resolve identically to what the user sees.
 */
const RENDER_WIDTH_PX = 850;

/**
 * Scale factor for html2canvas.  3 → ~2550 px wide canvas → crisp on
 * retina screens and sharp enough for print.  Increase to 4 for even
 * higher quality (larger file).
 */
const CAPTURE_SCALE = 3;

// No margins — the invoice card has its own internal padding.
const MARGIN_MM = 0;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PdfExportOptions = {
  /** html2canvas scale. Default: 3 */
  scale?: number;
  /** "PNG" preserves transparency; "JPEG" is smaller. Default: "PNG" */
  imageFormat?: "JPEG" | "PNG";
  /** JPEG quality 0–1. Default: 0.95 */
  quality?: number;
};

// ─── Core capture ─────────────────────────────────────────────────────────────

/**
 * Renders `element` to a canvas at a fixed viewport width so that
 * Tailwind breakpoints and max-width constraints resolve the same way
 * as in the live preview.
 */
async function captureElementCanvas(
  element: HTMLElement,
  scale: number,
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");

  // Temporarily pin the element to RENDER_WIDTH_PX so html2canvas sees
  // the same layout as the preview pane regardless of the actual page width.
  const prevWidth = element.style.width;
  const prevMaxWidth = element.style.maxWidth;
  const prevPosition = element.style.position;

  element.style.width = `${RENDER_WIDTH_PX}px`;
  element.style.maxWidth = `${RENDER_WIDTH_PX}px`;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
    // Tell html2canvas the viewport is exactly RENDER_WIDTH_PX wide.
    // This is the key fix: responsive classes resolve identically to preview.
    width: RENDER_WIDTH_PX,
    windowWidth: RENDER_WIDTH_PX,
    // Capture the full scrollable height.
    height: element.scrollHeight,
    scrollY: 0,
    scrollX: 0,
  });

  // Restore original styles
  element.style.width = prevWidth;
  element.style.maxWidth = prevMaxWidth;
  element.style.position = prevPosition;

  return canvas;
}

// ─── PDF assembly ─────────────────────────────────────────────────────────────

/**
 * Slices a full-invoice canvas into A4 pages and assembles a jsPDF document.
 *
 * Each page is a horizontal strip of the canvas mapped to a full A4 page.
 * Because we captured everything at once, no section loses its layout context.
 */
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

  const pageW = A4_W_MM - MARGIN_MM * 2;   // usable width in mm
  const pageH = A4_H_MM - MARGIN_MM * 2;   // usable height in mm

  // How many canvas pixels map to one mm?
  const pxPerMm = canvas.width / pageW;

  // Height of one A4 page in canvas pixels
  const pageHeightPx = Math.round(pageH * pxPerMm);
  const totalHeightPx = canvas.height;
  const pageCount = Math.ceil(totalHeightPx / pageHeightPx);

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    if (pageIndex > 0) pdf.addPage();

    const srcY = pageIndex * pageHeightPx;
    const srcH = Math.min(pageHeightPx, totalHeightPx - srcY);

    // Create a temporary canvas for this page slice
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightPx; // full page height — blank at bottom if last page

    const ctx = pageCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(
      canvas,
      0, srcY,           // source x, y
      canvas.width, srcH, // source w, h
      0, 0,              // dest x, y
      canvas.width, srcH, // dest w, h
    );

    const mimeType = imageFormat === "JPEG" ? "image/jpeg" : "image/png";
    const dataUrl =
      imageFormat === "JPEG"
        ? pageCanvas.toDataURL(mimeType, quality)
        : pageCanvas.toDataURL(mimeType);

    pdf.addImage(
      dataUrl,
      imageFormat,
      MARGIN_MM,
      MARGIN_MM,
      pageW,
      pageH,
      undefined,
      "FAST",
    );
  }

  return pdf;
}

// ─── Page numbers ─────────────────────────────────────────────────────────────

function addPageNumbers(pdf: jsPDF): void {
  const total = pdf.getNumberOfPages();
  if (total <= 1) return; // no page numbers for single-page invoices

  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(160, 160, 160);
    pdf.text(
      `Page ${i} of ${total}`,
      A4_W_MM / 2,
      A4_H_MM - 4,
      { align: "center" },
    );
  }
}

// ─── Main render pipeline ─────────────────────────────────────────────────────

async function renderElementToPdf(
  element: HTMLElement,
  options?: PdfExportOptions,
): Promise<jsPDF> {
  const scale = options?.scale ?? CAPTURE_SCALE;
  const imageFormat = options?.imageFormat ?? "PNG";
  const quality = options?.quality ?? 0.95;

  const canvas = await captureElementCanvas(element, scale);
  const pdf = await buildPdfFromCanvas(canvas, imageFormat, quality);
  return pdf;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Exports the element to a PDF file and triggers a download.
 * Used by InvoiceGenerator's "Save PDF" button.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: PdfExportOptions,
): Promise<void> {
  const pdf = await renderElementToPdf(element, options);
  addPageNumbers(pdf);
  pdf.save(filename);
}

/**
 * Exports the element to a PDF Blob (no download).
 * Used by BulkInvoice to pack PDFs into a ZIP.
 */
export async function exportElementToPdfBlob(
  element: HTMLElement,
  options?: PdfExportOptions,
): Promise<Blob> {
  const pdf = await renderElementToPdf(element, options);
  // No page numbers for bulk — keeps file size down and bulk invoices
  // are typically single-page. Add addPageNumbers(pdf) here if needed.
  return pdf.output("blob");
}
