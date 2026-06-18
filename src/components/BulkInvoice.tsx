/**
 * BulkInvoice.tsx
 *
 * Self-contained bulk invoice feature.
 * To remove: delete this file and comment out <BulkInvoice /> in Index.tsx.
 * No other files were modified for this feature.
 *
 * Dependencies (add to package.json if not present):
 *   jspdf, html2canvas, jszip
 *   papaparse is already in the project (used by shadcn stack)
 */

import { useState, useRef, useCallback } from "react";
import { InvoiceState, LineItem } from "@/lib/invoiceTypes";
import { emptyState } from "@/lib/invoiceDefaults";
import { loadSellerProfile } from "@/lib/storage";
import { InvoicePreview } from "@/components/InvoicePreview";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, Info } from "lucide-react";
import Papa from "papaparse";

// ─── CSV column definitions ────────────────────────────────────────────────
// Each column maps to a field in InvoiceState.
// Rows sharing the same invoice_number are grouped into one invoice.

const CSV_COLUMNS = [
  // Invoice meta
  "invoice_number",
  "invoice_date",
  "place_of_supply",
  "notes",
  "terms",
  "signatory",
  // Buyer
  "buyer_name",
  "buyer_gstin",
  "buyer_msme",
  "buyer_address",
  "buyer_state",
  "buyer_mobile",
  "buyer_email",
  // Ship To (optional — leave blank to skip)
  "ship_to_name",
  "ship_to_address",
  "ship_to_state",
  "ship_to_gstin",
  // Line item (one row per item; repeat invoice_number for multi-item)
  "item_description",
  "item_hsn",
  "item_qty",
  "item_rate",
  "item_discount",
  "item_gst_rate",
  // Payment (optional)
  "amount_received",
  "receipt_mode",
];

const SAMPLE_ROWS = [
  {
    invoice_number: "INV-001",
    invoice_date: new Date().toISOString().slice(0, 10),
    place_of_supply: "Maharashtra",
    notes: "",
    terms: "Payment due within 15 days.",
    signatory: "Authorised Signatory",
    buyer_name: "Acme Corp",
    buyer_gstin: "27AABCU9603R1ZX",
    buyer_msme: "",
    buyer_address: "123 MG Road, Mumbai",
    buyer_state: "Maharashtra",
    buyer_mobile: "",
    buyer_email: "",
    ship_to_name: "",
    ship_to_address: "",
    ship_to_state: "",
    ship_to_gstin: "",
    item_description: "Web Design Services",
    item_hsn: "998314",
    item_qty: "1",
    item_rate: "50000",
    item_discount: "0",
    item_gst_rate: "18",
    amount_received: "0",
    receipt_mode: "",
  },
  {
    // Second item on same invoice — same invoice_number
    invoice_number: "INV-001",
    invoice_date: new Date().toISOString().slice(0, 10),
    place_of_supply: "Maharashtra",
    notes: "",
    terms: "Payment due within 15 days.",
    signatory: "Authorised Signatory",
    buyer_name: "Acme Corp",
    buyer_gstin: "27AABCU9603R1ZX",
    buyer_msme: "",
    buyer_address: "123 MG Road, Mumbai",
    buyer_state: "Maharashtra",
    buyer_mobile: "",
    buyer_email: "",
    ship_to_name: "",
    ship_to_address: "",
    ship_to_state: "",
    ship_to_gstin: "",
    item_description: "SEO Consultation",
    item_hsn: "998313",
    item_qty: "2",
    item_rate: "5000",
    item_discount: "0",
    item_gst_rate: "18",
    amount_received: "0",
    receipt_mode: "",
  },
  {
    // Second invoice
    invoice_number: "INV-002",
    invoice_date: new Date().toISOString().slice(0, 10),
    place_of_supply: "Delhi",
    notes: "",
    terms: "Payment due within 15 days.",
    signatory: "Authorised Signatory",
    buyer_name: "Beta Ltd",
    buyer_gstin: "",
    buyer_msme: "",
    buyer_address: "45 Connaught Place, New Delhi",
    buyer_state: "Delhi",
    buyer_mobile: "+91 98765 43210",
    buyer_email: "accounts@beta.in",
    ship_to_name: "",
    ship_to_address: "",
    ship_to_state: "",
    ship_to_gstin: "",
    item_description: "Logo Design",
    item_hsn: "998389",
    item_qty: "1",
    item_rate: "15000",
    item_discount: "10",
    item_gst_rate: "18",
    amount_received: "5000",
    receipt_mode: "UPI",
  },
];

// ─── CSV → InvoiceState grouping ──────────────────────────────────────────

type CsvRow = Record<string, string>;

function rowsToInvoiceStates(rows: CsvRow[], sellerBase: InvoiceState): InvoiceState[] {
  // Group rows by invoice_number (preserving order of first appearance)
  const groups = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const key = row.invoice_number?.trim() || `row_${Math.random()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const states: InvoiceState[] = [];

  for (const [, groupRows] of groups) {
    const first = groupRows[0];

    const shipToFilled = !!(
      first.ship_to_name?.trim() ||
      first.ship_to_address?.trim() ||
      first.ship_to_gstin?.trim()
    );

    const items: LineItem[] = groupRows.map((r) => ({
      id: crypto.randomUUID(),
      description: r.item_description?.trim() || "",
      hsn: r.item_hsn?.trim() || "",
      qty: parseFloat(r.item_qty) || 1,
      rate: parseFloat(r.item_rate) || 0,
      discount: parseFloat(r.item_discount) || 0,
      gstRate: parseFloat(r.item_gst_rate) || 18,
    }));

    const state: InvoiceState = {
      ...sellerBase,
      invoiceNumber: first.invoice_number?.trim() || "",
      invoiceDate: first.invoice_date?.trim() || new Date().toISOString().slice(0, 10),
      placeOfSupply: first.place_of_supply?.trim() || "",
      notes: first.notes?.trim() || "",
      terms: first.terms?.trim() || sellerBase.terms,
      signatory: first.signatory?.trim() || sellerBase.signatory,
      buyer: {
        name: first.buyer_name?.trim() || "",
        gstin: first.buyer_gstin?.trim() || "",
        msme: first.buyer_msme?.trim() || "",
        address: first.buyer_address?.trim() || "",
        state: first.buyer_state?.trim() || "",
        mobile: first.buyer_mobile?.trim() || "",
        email: first.buyer_email?.trim() || "",
      },
      shipToEnabled: shipToFilled,
      shipTo: {
        name: first.ship_to_name?.trim() || "",
        address: first.ship_to_address?.trim() || "",
        state: first.ship_to_state?.trim() || "",
        gstin: first.ship_to_gstin?.trim() || "",
      },
      items,
      amountReceived: parseFloat(first.amount_received) || 0,
      receiptMode: (first.receipt_mode?.trim() as InvoiceState["receiptMode"]) || "",
    };

    states.push(state);
  }

  return states;
}

// ─── Component ────────────────────────────────────────────────────────────

type GenerationStatus = "idle" | "parsing" | "generating" | "done" | "error";

interface InvoiceJob {
  state: InvoiceState;
  invoiceNumber: string;
  status: "pending" | "done" | "error";
}

export const BulkInvoice = () => {
  const [jobs, setJobs] = useState<InvoiceJob[]>([]);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [currentPreview, setCurrentPreview] = useState<InvoiceState | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export blank template CSV ──────────────────────────────────────────
  const handleExportTemplate = () => {
    const csv = Papa.unparse({
      fields: CSV_COLUMNS,
      data: SAMPLE_ROWS,
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "simpliinvoice-bulk-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import filled CSV ──────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("parsing");
    setErrorMsg("");
    setJobs([]);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          setErrorMsg(`CSV parse error: ${result.errors[0].message}`);
          setStatus("error");
          return;
        }
        if (result.data.length === 0) {
          setErrorMsg("CSV is empty — fill in at least one row.");
          setStatus("error");
          return;
        }
        // Validate required columns
        const missing = ["invoice_number", "buyer_name", "item_description"].filter(
          (col) => !(col in result.data[0])
        );
        if (missing.length > 0) {
          setErrorMsg(`Missing required columns: ${missing.join(", ")}. Use the exported template.`);
          setStatus("error");
          return;
        }

        const seller = loadSellerProfile();
        const sellerBase: InvoiceState = {
          ...emptyState,
          seller: seller || emptyState.seller,
        };

        const states = rowsToInvoiceStates(result.data, sellerBase);
        const newJobs: InvoiceJob[] = states.map((s) => ({
          state: s,
          invoiceNumber: s.invoiceNumber,
          status: "pending",
        }));
        setJobs(newJobs);
        setStatus("idle");
      },
      error: (err) => {
        setErrorMsg(err.message);
        setStatus("error");
      },
    });

    // Reset input so same file can be re-imported
    e.target.value = "";
  };

  // ── Generate all PDFs and ZIP ──────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (jobs.length === 0) return;
    setStatus("generating");
    setProgress({ done: 0, total: jobs.length });

    try {
      // Dynamically import heavy libs so they don't affect initial page load
      const [{ default: jsPDF }, { default: html2canvas }, { default: JSZip }] =
        await Promise.all([
          import("jspdf"),
          import("html2canvas"),
          import("jszip"),
        ]);

      const zip = new JSZip();

      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];

        // Render invoice into hidden preview div
        setCurrentPreview(job.state);
        // Wait for React to paint
        await new Promise((r) => setTimeout(r, 300));

        if (!previewRef.current) continue;

        const canvas = await html2canvas(previewRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = (canvas.height * pageW) / canvas.width;

        let yPos = 0;
        let remaining = imgH;

        // Multi-page support: slice image across pages
        while (remaining > 0) {
          pdf.addImage(imgData, "JPEG", 0, -yPos, imgW, imgH);
          remaining -= pageH;
          yPos += pageH;
          if (remaining > 0) pdf.addPage();
        }

        const filename = `${job.invoiceNumber || `invoice-${i + 1}`}.pdf`;
        zip.file(filename, pdf.output("blob"));

        setJobs((prev) =>
          prev.map((j, idx) => (idx === i ? { ...j, status: "done" } : j))
        );
        setProgress({ done: i + 1, total: jobs.length });
      }

      // Download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simpliinvoice-bulk-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      setCurrentPreview(null);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("PDF generation failed. Make sure jspdf, html2canvas and jszip are installed.");
      setStatus("error");
      setCurrentPreview(null);
    }
  }, [jobs]);

  // ── UI ─────────────────────────────────────────────────────────────────
  const isGenerating = status === "generating";

  return (
    <section className="container-app py-16 sm:py-20">
      {/* Header */}
      <div className="mb-10">
        <span className="accent-pill">
          <FileSpreadsheet className="h-3.5 w-3.5 text-accent" /> Bulk Invoices
        </span>
        <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
          Bulk Invoice Generator
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Export the CSV template, fill one row per line item, then import to
          generate all invoices as a ZIP of PDFs. Your seller profile is applied
          automatically to every invoice.
        </p>
      </div>

      {/* Notice */}
      <div className="mb-8 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Bulk invoices are <strong>not synced</strong> to Google Drive or saved
          locally. Keep your filled CSV as your record. To sync individual
          invoices, use the main Invoice Generator above.
        </p>
      </div>

      {/* Step cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Step 1 */}
        <div className="surface-card p-6">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            1
          </div>
          <h3 className="mb-1 font-semibold">Export Template</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Download the CSV template with sample rows showing the format.
            Rows sharing the same <code className="rounded bg-muted px-1 text-xs">invoice_number</code> become one invoice with multiple items.
          </p>
          <Button variant="outline" className="w-full" onClick={handleExportTemplate}>
            <Download className="mr-2 h-4 w-4" /> Download Template
          </Button>
        </div>

        {/* Step 2 */}
        <div className="surface-card p-6">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            2
          </div>
          <h3 className="mb-1 font-semibold">Fill & Import CSV</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Fill the template in Excel or Google Sheets. Save as CSV, then import it here.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating}
          >
            <Upload className="mr-2 h-4 w-4" /> Import CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Step 3 */}
        <div className="surface-card p-6">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            3
          </div>
          <h3 className="mb-1 font-semibold">Generate ZIP</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            One PDF per invoice, packed into a single ZIP file ready to download.
            {isGenerating && (
              <span className="mt-1 block font-medium text-primary">
                {progress.done} / {progress.total} invoices done…
              </span>
            )}
          </p>
          <Button
            className="w-full bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
            onClick={handleGenerate}
            disabled={jobs.length === 0 || isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…</>
            ) : (
              <><Download className="mr-2 h-4 w-4" /> Generate & Download ZIP</>
            )}
          </Button>
        </div>
      </div>

      {/* Error */}
      {status === "error" && (
        <div className="mt-6 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Success */}
      {status === "done" && (
        <div className="mt-6 flex gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          <p>All {jobs.length} invoices generated and downloaded as a ZIP.</p>
        </div>
      )}

      {/* Invoice list preview */}
      {jobs.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 font-semibold">
            {jobs.length} invoice{jobs.length !== 1 ? "s" : ""} ready to generate
          </h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Invoice No.</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Buyer</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Items</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs">{job.invoiceNumber || "—"}</td>
                    <td className="px-4 py-2">{job.state.buyer.name || "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{job.state.invoiceDate}</td>
                    <td className="px-4 py-2 text-muted-foreground">{job.state.items.length}</td>
                    <td className="px-4 py-2">
                      {job.status === "done" ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done
                        </span>
                      ) : job.status === "error" ? (
                        <span className="text-destructive">Error</span>
                      ) : (
                        <span className="text-muted-foreground">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hidden render target for html2canvas */}
      <div
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "794px", // A4 at 96dpi
          zIndex: -1,
          pointerEvents: "none",
        }}
      >
        <div ref={previewRef}>
          {currentPreview && <InvoicePreview state={currentPreview} />}
        </div>
      </div>
    </section>
  );
};
