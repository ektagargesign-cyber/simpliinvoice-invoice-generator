/** Section-aware PDF export — places whole blocks per page instead of slicing one screenshot. */

import type { jsPDF } from "jspdf";

const MARGIN_X_MM = 10;
const MARGIN_TOP_MM = 10;
const MARGIN_BOTTOM_MM = 12;
const SECTION_GAP_MM = 2;
const FIT_ONE_PAGE_THRESHOLD = 1.3;

type PdfExportOptions = { scale?: number; imageFormat?: "JPEG" | "PNG"; quality?: number };

type CanvasSlice = { imgData: string; imgW: number; imgH: number; imageFormat: "JPEG" | "PNG" };

function pageContentSize(pdf: jsPDF) {
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  return {
    pageW,
    pageH,
    contentW: pageW - MARGIN_X_MM * 2,
    contentH: pageH - MARGIN_TOP_MM - MARGIN_BOTTOM_MM,
  };
}

function canvasToSlice(
  canvas: HTMLCanvasElement,
  contentW: number,
  imageFormat: "JPEG" | "PNG",
  quality: number,
): CanvasSlice {
  const ratio = canvas.width ? canvas.height / canvas.width : 1; 	
  const imgW = contentW;
  const imgH = contentW * ratio;
  const imgData =
    imageFormat === "JPEG"
      ? canvas.toDataURL("image/jpeg", quality)
      : canvas.toDataURL("image/png");
  return { imgData, imgW, imgH, imageFormat };
}

async function captureCanvas(
  element: HTMLElement,
  scale: number,
): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: element.scrollWidth,
	height: element.scrollHeight,
    windowWidth: element.scrollWidth,
	windowHeight: element.scrollHeight,
  });
}

function measureSliceHeight(slice: CanvasSlice): number {
  return slice.imgH;
}

function buildTableChunk(
  sourceTable: HTMLTableElement,
  rows: HTMLTableRowElement[],
  widthPx: number,
): HTMLElement {
  const shell = document.createElement("div");
  shell.className = sourceTable.closest("[data-pdf-section='items']")?.className ?? "overflow-hidden";
  shell.style.width = `${widthPx}px`;
  shell.style.background = "#ffffff";

  const table = document.createElement("table");
  table.className = sourceTable.className;
  table.style.cssText = sourceTable.style.cssText;

  const thead = sourceTable.querySelector("thead");
  if (thead) table.appendChild(thead.cloneNode(true));

  const tbody = document.createElement("tbody");
  rows.forEach((row) => tbody.appendChild(row.cloneNode(true)));
  table.appendChild(tbody);
  shell.appendChild(table);
  return shell;
}

async function measureChunkHeight(
  sourceTable: HTMLTableElement,
  rows: HTMLTableRowElement[],
  widthPx: number,
  scale: number,
  contentW: number,
  imageFormat: "JPEG" | "PNG",
  quality: number,
): Promise<number> {
  const shell = buildTableChunk(sourceTable, rows, widthPx);
  shell.style.position = "fixed";
  shell.style.left = "-10000px";
  shell.style.top = "0";
  document.body.appendChild(shell);
  const canvas = await captureCanvas(shell, scale);
  document.body.removeChild(shell);
  return measureSliceHeight(canvasToSlice(canvas, contentW, imageFormat, quality));
}

async function captureItemsSection(
  section: HTMLElement,
  opts: Required<Pick<PdfExportOptions, "scale" | "imageFormat" | "quality">>,
  contentW: number,
  contentH: number,
): Promise<CanvasSlice[]> {
  const table = section.querySelector("table");
  if (!table) {
    const canvas = await captureCanvas(section, opts.scale);
    return [canvasToSlice(canvas, contentW, opts.imageFormat, opts.quality)];
  }

  const rows = Array.from(
    table.querySelectorAll<HTMLTableRowElement>("tbody tr[data-pdf-item-row]"),
  );
  if (rows.length === 0) {
    const canvas = await captureCanvas(section, opts.scale);
    return [canvasToSlice(canvas, contentW, opts.imageFormat, opts.quality)];
  }

  const widthPx = section.getBoundingClientRect().width || section.clientWidth || 850;
  const slices: CanvasSlice[] = [];
  let index = 0;

  while (index < rows.length) {
    let batch: HTMLTableRowElement[] = [rows[index]];

    while (index + batch.length < rows.length) {
      const candidate = [...batch, rows[index + batch.length]];
      const height = await measureChunkHeight(
        table,
        candidate,
        widthPx,
        opts.scale,
        contentW,
        opts.imageFormat,
        opts.quality,
      );
      if (height > contentH) break;
      batch = candidate;
    }

    const shell = buildTableChunk(table, batch, widthPx);
    shell.style.position = "fixed";
    shell.style.left = "-10000px";
    shell.style.top = "0";
    document.body.appendChild(shell);
    const canvas = await captureCanvas(shell, opts.scale);
    document.body.removeChild(shell);
    slices.push(canvasToSlice(canvas, contentW, opts.imageFormat, opts.quality));

    index += batch.length;
  }

  return slices;
}

class PdfLayout {
  private cursorY = MARGIN_TOP_MM;

  constructor(
    private pdf: jsPDF,
    private contentW: number,
    private contentH: number,
  ) {}
  
  willFit(height: number) {
   return this.spaceLeft() >= height;
  }

  spaceLeft(): number {
    return MARGIN_TOP_MM + this.contentH - this.cursorY;
  }

  newPage() {
    this.pdf.addPage();
    this.cursorY = MARGIN_TOP_MM;
  }

  ensureSpace(needed: number) {
    if (this.cursorY + needed > MARGIN_TOP_MM + this.contentH) {
      this.newPage();
    }
  }

  addSlice(slice: CanvasSlice) {
	  
	if (
	    !isFinite(slice.imgW) ||
	    !isFinite(slice.imgH) ||
	    slice.imgW <= 0 ||
	    slice.imgH <= 0
  	) {
	    return;
	  }  
    this.ensureSpace(slice.imgH);
    this.pdf.addImage(
      slice.imgData,
      slice.imageFormat,
      MARGIN_X_MM,
      this.cursorY,
      slice.imgW,
      slice.imgH,
    );
    this.cursorY += slice.imgH + SECTION_GAP_MM;
  }
}

async function renderSectionsToPdf(
  root: HTMLElement,
  options?: PdfExportOptions,
): Promise<jsPDF> {
  const { default: jsPDF } = await import("jspdf");
  const scale = options?.scale ?? 2;
  const imageFormat = options?.imageFormat ?? "JPEG";
  const quality = options?.quality ?? 0.92;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { contentW, contentH } = pageContentSize(pdf);
  const layout = new PdfLayout(pdf, contentW, contentH);

  const sections = root.querySelectorAll<HTMLElement>("[data-pdf-section]");
  if (sections.length === 0) {
    return renderMonolithicToPdf(root, options);
  }

  const sectionSlices: CanvasSlice[][] = [];

  for (const section of sections) {
    const kind = section.getAttribute("data-pdf-section");
    if (kind === "items") {
      sectionSlices.push(
        await captureItemsSection(section, { scale, imageFormat, quality }, contentW, contentH),
      );
    } else {
      const canvas = await captureCanvas(section, scale);
      sectionSlices.push([canvasToSlice(canvas, contentW, imageFormat, quality)]);
    }
  }

  const flat = sectionSlices.flat();
  

  for (const group of sectionSlices) {
    const groupH = group.reduce((sum, s) => sum + s.imgH * scaleAll + SECTION_GAP_MM, 0);

    group.forEach((slice, index) => {
      const scaled =
        scaleAll === 1
          ? slice
          : {
              ...slice,
              imgW: slice.imgW,
              imgH: slice.imgH,
            };

      
      layout.addSlice(scaled);
    });
  }

  return pdf;
}

/** Legacy single-image slice — used only when sections are not marked up. */
async function renderMonolithicToPdf(
  element: HTMLElement,
  options?: PdfExportOptions,
): Promise<jsPDF> {
  const { default: jsPDF } = await import("jspdf");
  const scale = options?.scale ?? 2;
  const imageFormat = options?.imageFormat ?? "JPEG";
  const quality = options?.quality ?? 0.92;

  const canvas = await captureCanvas(element, scale);
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { contentW, contentH } = pageContentSize(pdf);
  const slice = canvasToSlice(canvas, contentW, imageFormat, quality);

  let imgW = slice.imgW;
  let imgH = slice.imgH;
  if (imgH > contentH && imgH <= contentH * FIT_ONE_PAGE_THRESHOLD) {
    const fit = contentH / imgH;
    imgW *= fit;
    imgH = contentH;
  }

  const x = MARGIN_X_MM + (contentW - imgW) / 2;
  let yPos = 0;
  let remaining = imgH;

  while (remaining > 0) {
    pdf.addImage(slice.imgData, slice.imageFormat, x, MARGIN_TOP_MM - yPos, imgW, imgH);
    remaining -= contentH;
    yPos += contentH;
    if (remaining > 0) pdf.addPage();
  }

  return pdf;
}

async function renderElementToPdf(element: HTMLElement, options?: PdfExportOptions) {
  return renderSectionsToPdf(element, options);
}

function addPageNumbers(pdf: jsPDF) {
  const pageCount = pdf.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFontSize(9);
    pdf.setTextColor(120);

    const text = `Page ${i} of ${pageCount}`;

    pdf.text(
      text,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  }
}

export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  options?: PdfExportOptions,
): Promise<void> {
  const pdf = await renderElementToPdf(element, options);
  addPageNumbers(pdf);
  pdf.save(filename);
}

export async function exportElementToPdfBlob(
  element: HTMLElement,
  options?: PdfExportOptions,
): Promise<Blob> {
  const pdf = await renderElementToPdf(element, options);
  return pdf.output("blob");
}
