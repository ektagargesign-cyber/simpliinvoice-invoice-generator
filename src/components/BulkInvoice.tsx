/**
 * BulkInvoice.tsx
 *
 * Self-contained bulk invoice feature.
 * To remove: delete this file and comment out <BulkInvoice /> in Index.tsx.
 *
 * Dependencies:
 *   @react-pdf/renderer  — text-based PDF generation (replaces html2canvas + jspdf)
 *   jszip                — ZIP bundling
 *
 * Install: npm install @react-pdf/renderer jszip
 * Remove:  npm uninstall jspdf html2canvas   (no longer needed)
 */

import { useState, useCallback } from "react";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import { InvoiceState, LineItem } from "@/lib/invoiceTypes";
import { emptyState } from "@/lib/invoiceDefaults";
import { loadSellerProfile } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import {
  Download, Upload, FileSpreadsheet, AlertCircle,
  CheckCircle2, Loader2, Info, RefreshCw,
} from "lucide-react";

// ─── CSV column definitions ────────────────────────────────────────────────

const CSV_COLUMNS = [
  "invoice_number", "invoice_date", "place_of_supply", "notes", "terms", "signatory",
  "buyer_name", "buyer_gstin", "buyer_msme", "buyer_address", "buyer_state", "buyer_mobile", "buyer_email",
  "ship_to_name", "ship_to_address", "ship_to_state", "ship_to_gstin",
  "item_description", "item_hsn", "item_qty", "item_rate", "item_discount", "item_gst_rate",
  "amount_received", "receipt_mode",
];

const SAMPLE_ROWS = [
  {
    invoice_number: "INV-001", invoice_date: "2025-06-01", place_of_supply: "Maharashtra",
    notes: "", terms: "Payment due within 15 days.", signatory: "Authorised Signatory",
    buyer_name: "Acme Corp", buyer_gstin: "27AABCU9603R1ZX", buyer_msme: "",
    buyer_address: "123 MG Road, Mumbai", buyer_state: "Maharashtra", buyer_mobile: "", buyer_email: "",
    ship_to_name: "", ship_to_address: "", ship_to_state: "", ship_to_gstin: "",
    item_description: "Web Design Services", item_hsn: "998314", item_qty: "1",
    item_rate: "50000", item_discount: "0", item_gst_rate: "18", amount_received: "0", receipt_mode: "",
  },
  {
    invoice_number: "INV-001", invoice_date: "2025-06-01", place_of_supply: "Maharashtra",
    notes: "", terms: "Payment due within 15 days.", signatory: "Authorised Signatory",
    buyer_name: "Acme Corp", buyer_gstin: "27AABCU9603R1ZX", buyer_msme: "",
    buyer_address: "123 MG Road, Mumbai", buyer_state: "Maharashtra", buyer_mobile: "", buyer_email: "",
    ship_to_name: "", ship_to_address: "", ship_to_state: "", ship_to_gstin: "",
    item_description: "SEO Consultation", item_hsn: "998313", item_qty: "2",
    item_rate: "5000", item_discount: "0", item_gst_rate: "18", amount_received: "0", receipt_mode: "",
  },
  {
    invoice_number: "INV-002", invoice_date: "2025-06-05", place_of_supply: "Delhi",
    notes: "", terms: "Payment due within 15 days.", signatory: "Authorised Signatory",
    buyer_name: "Beta Ltd", buyer_gstin: "", buyer_msme: "",
    buyer_address: "45 Connaught Place, New Delhi", buyer_state: "Delhi",
    buyer_mobile: "+91 98765 43210", buyer_email: "accounts@beta.in",
    ship_to_name: "", ship_to_address: "", ship_to_state: "", ship_to_gstin: "",
    item_description: "Logo Design", item_hsn: "998389", item_qty: "1",
    item_rate: "15000", item_discount: "10", item_gst_rate: "18",
    amount_received: "5000", receipt_mode: "UPI",
  },
];

// ─── Date parser — handles YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, MM/DD/YYYY ──

function parseDate(raw: string): string {
  if (!raw?.trim()) return new Date().toISOString().slice(0, 10);
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  return new Date().toISOString().slice(0, 10);
}

function formatDateDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
}

// ─── GST calculation ───────────────────────────────────────────────────────

function calcTotals(state: InvoiceState) {
  const isGst = state.sellerType === "regular";
  const isIntrastate = state.seller.state === state.placeOfSupply;
  let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;

  const lines = state.items.map((it) => {
    const taxable = Math.max(0, it.qty * it.rate - (it.discount || 0));
    const cgst = isGst && isIntrastate ? (taxable * it.gstRate) / 200 : 0;
    const sgst = cgst;
    const igst = isGst && !isIntrastate ? (taxable * it.gstRate) / 100 : 0;
    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalIgst += igst;
    return { ...it, taxable, cgst, sgst, igst, lineTotal: taxable + cgst + sgst + igst };
  });

  const grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
  return { lines, totalTaxable, totalCgst, totalSgst, totalIgst, grandTotal, isIntrastate, isGst };
}

// ─── PDF styles ────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, padding: 28, color: "#111", backgroundColor: "#fff" },

  // Header
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  companyName: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  companyDetail: { fontSize: 8, color: "#555", marginBottom: 1.5 },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "right", color: "#222" },
  metaLine: { fontSize: 8, color: "#555", textAlign: "right", marginTop: 2 },

  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 8 },

  // Party boxes
  partiesRow: { flexDirection: "row", marginBottom: 10 },
  partyBox: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 7, marginRight: 6 },
  partyBoxLast: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 7 },
  partyLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#888", marginBottom: 4 },
  partyName: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  partyDetail: { fontSize: 8, color: "#444", marginBottom: 1.5 },

  // Table
  tableHeader: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottomWidth: 1, borderBottomColor: "#d1d5db", paddingVertical: 5, paddingHorizontal: 3 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", paddingVertical: 4, paddingHorizontal: 3 },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f0f0", paddingVertical: 4, paddingHorizontal: 3, backgroundColor: "#f9fafb" },
  th: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#555" },
  td: { fontSize: 8 },

  // Column widths (must add to 100%)
  cNo:      { width: "4%" },
  cDesc:    { width: "26%" },
  cHsn:     { width: "9%" },
  cQty:     { width: "6%", textAlign: "right" },
  cRate:    { width: "9%", textAlign: "right" },
  cDisc:    { width: "6%", textAlign: "right" },
  cTaxable: { width: "12%", textAlign: "right" },
  cGst1:    { width: "10%", textAlign: "right" },
  cGst2:    { width: "10%", textAlign: "right" },
  cIgst:    { width: "20%", textAlign: "right" },
  cTotal:   { width: "8%", textAlign: "right" },

  // Totals block
  totalsSection: { alignItems: "flex-end", marginTop: 4, marginBottom: 10 },
  totalRow: { flexDirection: "row", paddingVertical: 2 },
  totalLabel: { fontSize: 8, color: "#555", width: 110, textAlign: "right", marginRight: 10 },
  totalValue: { fontSize: 8, width: 70, textAlign: "right" },
  grandRow: { flexDirection: "row", backgroundColor: "#111", borderRadius: 3, paddingVertical: 5, paddingHorizontal: 8, marginTop: 4 },
  grandLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fff", width: 110, textAlign: "right", marginRight: 10 },
  grandValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#fff", width: 70, textAlign: "right" },

  // Transporter
  transportBox: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 7, marginBottom: 10 },
  transportRow: { flexDirection: "row", flexWrap: "wrap" },
  transportItem: { fontSize: 8, color: "#444", marginRight: 16, marginBottom: 2 },

  // Footer
  footerRow: { flexDirection: "row", marginTop: 10 },
  notesBox: { flex: 1, marginRight: 12 },
  signBox: { width: 150, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 4, padding: 8, alignItems: "flex-end" },
  footerLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#888", marginBottom: 3 },
  footerText: { fontSize: 8, color: "#444" },
  signSpacer: { height: 28 },
  signName: { fontSize: 8, fontFamily: "Helvetica-Bold", marginTop: 2 },
  signRole: { fontSize: 7, color: "#888", marginTop: 1 },

  compositionNote: { fontSize: 7, color: "#888", textAlign: "center", marginTop: 10 },
  poweredBy: { fontSize: 7, color: "#ccc", textAlign: "center", marginTop: 14 },
});

// ─── InvoicePDF component ─────────────────────────────────────────────────

const InvoicePDF = ({ state }: { state: InvoiceState }) => {
  const { lines, totalTaxable, totalCgst, totalSgst, totalIgst, grandTotal, isIntrastate, isGst } = calcTotals(state);
  const fmt = (n: number) => "₹ " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const docType =
    state.sellerType === "regular" ? "TAX INVOICE"
    : state.sellerType === "composition" ? "BILL OF SUPPLY"
    : "INVOICE";

  const hasTransporter = !!(state.transporter?.name || state.transporter?.vehicle || state.transporter?.lr);
  const hasNotes = !!(state.notes?.trim());
  const hasTerms = !!(state.terms?.trim());

  return (
    <Document>
      <Page size="A4" style={S.page}>

        {/* ── Header ── */}
        <View style={S.header}>
          <View>
            <Text style={S.companyName}>{state.seller.name || "—"}</Text>
            {state.seller.gstin   && <Text style={S.companyDetail}>GSTIN: {state.seller.gstin}</Text>}
            {state.seller.msme    && <Text style={S.companyDetail}>MSME/Udyam: {state.seller.msme}</Text>}
            {state.seller.address && <Text style={S.companyDetail}>{state.seller.address}</Text>}
            {state.seller.state   && <Text style={S.companyDetail}>{state.seller.state}</Text>}
            {state.seller.mobile  && <Text style={S.companyDetail}>Mob: {state.seller.mobile}</Text>}
            {state.seller.email   && <Text style={S.companyDetail}>{state.seller.email}</Text>}
          </View>
          <View>
            <Text style={S.docTitle}>{docType}</Text>
            <Text style={S.metaLine}>Invoice No: {state.invoiceNumber || "—"}</Text>
            <Text style={S.metaLine}>Date: {formatDateDisplay(state.invoiceDate)}</Text>
            {state.placeOfSupply && <Text style={S.metaLine}>Place of Supply: {state.placeOfSupply}</Text>}
          </View>
        </View>

        <View style={S.divider} />

        {/* ── Bill To / Ship To ── */}
        <View style={S.partiesRow}>
          <View style={state.shipToEnabled ? S.partyBox : S.partyBoxLast}>
            <Text style={S.partyLabel}>BILL TO</Text>
            <Text style={S.partyName}>{state.buyer.name || "—"}</Text>
            {state.buyer.gstin   && <Text style={S.partyDetail}>GSTIN: {state.buyer.gstin}</Text>}
            {state.buyer.msme    && <Text style={S.partyDetail}>MSME: {state.buyer.msme}</Text>}
            {state.buyer.address && <Text style={S.partyDetail}>{state.buyer.address}</Text>}
            {state.buyer.state   && <Text style={S.partyDetail}>{state.buyer.state}</Text>}
            {state.buyer.mobile  && <Text style={S.partyDetail}>Mob: {state.buyer.mobile}</Text>}
            {state.buyer.email   && <Text style={S.partyDetail}>{state.buyer.email}</Text>}
          </View>
          {state.shipToEnabled && (
            <View style={S.partyBoxLast}>
              <Text style={S.partyLabel}>SHIP TO</Text>
              {state.shipTo.name    && <Text style={S.partyName}>{state.shipTo.name}</Text>}
              {state.shipTo.gstin   && <Text style={S.partyDetail}>GSTIN: {state.shipTo.gstin}</Text>}
              {state.shipTo.address && <Text style={S.partyDetail}>{state.shipTo.address}</Text>}
              {state.shipTo.state   && <Text style={S.partyDetail}>{state.shipTo.state}</Text>}
            </View>
          )}
        </View>

        {/* ── Line Items ── */}
        {/* Header row */}
        <View style={S.tableHeader}>
          <Text style={[S.th, S.cNo]}>#</Text>
          <Text style={[S.th, S.cDesc]}>Description</Text>
          <Text style={[S.th, S.cHsn]}>HSN/SAC</Text>
          <Text style={[S.th, S.cQty]}>Qty</Text>
          <Text style={[S.th, S.cRate]}>Rate</Text>
          <Text style={[S.th, S.cDisc]}>Disc</Text>
          <Text style={[S.th, S.cTaxable]}>Taxable</Text>
          {isGst && isIntrastate  && <Text style={[S.th, S.cGst1]}>CGST</Text>}
          {isGst && isIntrastate  && <Text style={[S.th, S.cGst2]}>SGST</Text>}
          {isGst && !isIntrastate && <Text style={[S.th, S.cIgst]}>IGST</Text>}
          <Text style={[S.th, S.cTotal]}>Total</Text>
        </View>

        {/* Data rows */}
        {lines.map((it, i) => (
          <View key={it.id} style={i % 2 === 0 ? S.tableRow : S.tableRowAlt}>
            <Text style={[S.td, S.cNo]}>{i + 1}</Text>
            <Text style={[S.td, S.cDesc]}>{it.description}</Text>
            <Text style={[S.td, S.cHsn]}>{it.hsn}</Text>
            <Text style={[S.td, S.cQty]}>{it.qty}</Text>
            <Text style={[S.td, S.cRate]}>{it.rate.toLocaleString("en-IN")}</Text>
            <Text style={[S.td, S.cDisc]}>{it.discount || 0}</Text>
            <Text style={[S.td, S.cTaxable]}>{it.taxable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            {isGst && isIntrastate  && <Text style={[S.td, S.cGst1]}>{it.cgst.toFixed(2)} ({it.gstRate / 2}%)</Text>}
            {isGst && isIntrastate  && <Text style={[S.td, S.cGst2]}>{it.sgst.toFixed(2)} ({it.gstRate / 2}%)</Text>}
            {isGst && !isIntrastate && <Text style={[S.td, S.cIgst]}>{it.igst.toFixed(2)} ({it.gstRate}%)</Text>}
            <Text style={[S.td, S.cTotal]}>{it.lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={S.totalsSection}>
          <View style={S.totalRow}>
            <Text style={S.totalLabel}>Subtotal (Taxable)</Text>
            <Text style={S.totalValue}>{fmt(totalTaxable)}</Text>
          </View>
          {isGst && isIntrastate && (
            <>
              <View style={S.totalRow}>
                <Text style={S.totalLabel}>CGST</Text>
                <Text style={S.totalValue}>{fmt(totalCgst)}</Text>
              </View>
              <View style={S.totalRow}>
                <Text style={S.totalLabel}>SGST</Text>
                <Text style={S.totalValue}>{fmt(totalSgst)}</Text>
              </View>
            </>
          )}
          {isGst && !isIntrastate && (
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>IGST</Text>
              <Text style={S.totalValue}>{fmt(totalIgst)}</Text>
            </View>
          )}
          <View style={S.grandRow}>
            <Text style={S.grandLabel}>Grand Total</Text>
            <Text style={S.grandValue}>{fmt(grandTotal)}</Text>
          </View>
        </View>

        {/* ── Transporter ── */}
        {hasTransporter && (
          <View style={S.transportBox}>
            <Text style={[S.partyLabel, { marginBottom: 4 }]}>TRANSPORTER DETAILS</Text>
            <View style={S.transportRow}>
              {state.transporter.name    && <Text style={S.transportItem}>Name: {state.transporter.name}</Text>}
              {state.transporter.gstin   && <Text style={S.transportItem}>GSTIN: {state.transporter.gstin}</Text>}
              {state.transporter.vehicle && <Text style={S.transportItem}>Vehicle: {state.transporter.vehicle}</Text>}
              {state.transporter.lr      && <Text style={S.transportItem}>LR/GR: {state.transporter.lr}</Text>}
              {state.transporter.date    && <Text style={S.transportItem}>Date: {formatDateDisplay(state.transporter.date)}</Text>}
              {state.transporter.mode    && <Text style={S.transportItem}>Mode: {state.transporter.mode}</Text>}
              {state.transporter.ewb     && <Text style={S.transportItem}>E-way Bill: {state.transporter.ewb}</Text>}
            </View>
          </View>
        )}

        {/* ── Notes, Terms, Signatory ── */}
        <View style={S.footerRow}>
          <View style={S.notesBox}>
            {hasNotes && (
              <>
                <Text style={S.footerLabel}>NOTES</Text>
                <Text style={[S.footerText, { marginBottom: 8 }]}>{state.notes}</Text>
              </>
            )}
            {hasTerms && (
              <>
                <Text style={S.footerLabel}>TERMS & CONDITIONS</Text>
                <Text style={S.footerText}>{state.terms}</Text>
              </>
            )}
          </View>
          <View style={S.signBox}>
            <Text style={S.footerLabel}>FOR {(state.seller.name || "").toUpperCase()}</Text>
            <View style={S.signSpacer} />
            <Text style={S.signRole}>Authorised Signatory</Text>
            {state.signatory && state.signatory !== "Authorised Signatory" && (
              <Text style={S.signName}>{state.signatory}</Text>
            )}
          </View>
        </View>

        {state.sellerType === "composition" && (
          <Text style={S.compositionNote}>
            Composition Dealer — Not eligible to collect tax on supplies
          </Text>
        )}

        <Text style={S.poweredBy}>Generated by SimpliInvoice · SimplifiedTaxIndia.com</Text>
      </Page>
    </Document>
  );
};

// ─── CSV → InvoiceState ───────────────────────────────────────────────────

type CsvRow = Record<string, string>;

function rowsToInvoiceStates(rows: CsvRow[], sellerBase: InvoiceState): InvoiceState[] {
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
      invoiceDate: parseDate(first.invoice_date),      // ← fixed: handles all date formats
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

  // ── Seller profile state (visible, refreshable) ──────────────────────────
  const [bulkSeller, setBulkSeller] = useState(() => loadSellerProfile());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Export template CSV ───────────────────────────────────────────────────
  const handleExportTemplate = () => {
    const escape = (v: unknown) => {
      const s = String(v ?? "");
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [
      CSV_COLUMNS.join(","),
      ...SAMPLE_ROWS.map((row) =>
        CSV_COLUMNS.map((col) => escape((row as Record<string, unknown>)[col])).join(",")
      ),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "simpliinvoice-bulk-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Import filled CSV ─────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("parsing");
    setErrorMsg("");
    setJobs([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
        if (lines.length < 2) {
          setErrorMsg("CSV is empty — fill in at least one row.");
          setStatus("error");
          return;
        }
        const parseRow = (line: string): string[] => {
          const result: string[] = [];
          let cur = "", inQuote = false;
          for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
              if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
              else inQuote = !inQuote;
            } else if (ch === "," && !inQuote) {
              result.push(cur); cur = "";
            } else cur += ch;
          }
          result.push(cur);
          return result;
        };
        const headers = parseRow(lines[0]);
        const data: CsvRow[] = lines.slice(1).map((line) => {
          const vals = parseRow(line);
          const row: CsvRow = {};
          headers.forEach((h, i) => { row[h.trim()] = (vals[i] ?? "").trim(); });
          return row;
        });
        if (data.length === 0) {
          setErrorMsg("CSV is empty — fill in at least one row.");
          setStatus("error");
          return;
        }
        const missing = ["invoice_number", "buyer_name", "item_description"].filter(
          (col) => !(col in data[0])
        );
        if (missing.length > 0) {
          setErrorMsg(`Missing required columns: ${missing.join(", ")}. Use the exported template.`);
          setStatus("error");
          return;
        }
        // Use the seller profile visible in the UI (not silently re-read from storage)
        const sellerBase: InvoiceState = {
          ...emptyState,
          seller: bulkSeller || emptyState.seller,
        };
        const states = rowsToInvoiceStates(data, sellerBase);
        setJobs(states.map((s) => ({ state: s, invoiceNumber: s.invoiceNumber, status: "pending" })));
        setStatus("idle");
      } catch (err) {
        setErrorMsg("Failed to parse CSV: " + String(err));
        setStatus("error");
      }
    };
    reader.onerror = () => { setErrorMsg("Failed to read file."); setStatus("error"); };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Generate PDFs (text-based via @react-pdf/renderer) ───────────────────
  const handleGenerate = useCallback(async () => {
    if (jobs.length === 0) return;
    setStatus("generating");
    setProgress({ done: 0, total: jobs.length });

    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();

      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const blob = await pdf(<InvoicePDF state={job.state} />).toBlob();

        const seller = (job.state.seller.name || "Seller").trim();
        const invNo = (job.invoiceNumber || `invoice-${i + 1}`).replace(/\//g, "-");
        const filename = `${seller}_${invNo}_SimpliInvoice.pdf`;
        zip.file(filename, blob);

        setJobs((prev) => prev.map((j, idx) => idx === i ? { ...j, status: "done" } : j));
        setProgress({ done: i + 1, total: jobs.length });
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `simpliinvoice-bulk-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg("PDF generation failed. Make sure @react-pdf/renderer and jszip are installed.");
      setStatus("error");
    }
  }, [jobs]);

  // ── UI ────────────────────────────────────────────────────────────────────
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
          generate all invoices as a ZIP of text-based PDFs.
        </p>
      </div>

      {/* Notice */}
      <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Bulk invoices are <strong>not synced</strong> to Google Drive or saved
          locally. Keep your filled CSV as your record.
        </p>
      </div>

      {/* ── Seller profile block ── */}
      <div className="mb-8 rounded-xl border border-border bg-secondary/40 p-5">
        <p className="mb-2 text-sm font-semibold">Seller Profile Applied to All Bulk Invoices</p>
        {bulkSeller ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{bulkSeller.name}</p>
              {bulkSeller.gstin && (
                <p className="text-xs text-muted-foreground">GSTIN: {bulkSeller.gstin}</p>
              )}
              {bulkSeller.address && (
                <p className="text-xs text-muted-foreground">{bulkSeller.address}</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkSeller(loadSellerProfile())}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-destructive font-medium">No seller profile saved yet.</p>
            <p className="text-xs text-muted-foreground">
              Go to the <strong>Invoice Generator above</strong> → fill your business details
              under "Your Business (Seller)" → click <strong>"Save as my default seller profile"</strong>
              → come back here and click Refresh.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  document.getElementById("invoice")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Go to Invoice Generator ↑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBulkSeller(loadSellerProfile())}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Step cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {/* Step 1 */}
        <div className="surface-card p-6">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">1</div>
          <h3 className="mb-1 font-semibold">Export Template</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Download the CSV template with sample rows. Rows sharing the same{" "}
            <code className="rounded bg-muted px-1 text-xs">invoice_number</code> become one invoice with multiple items.
          </p>
          <Button variant="outline" className="w-full" onClick={handleExportTemplate}>
            <Download className="mr-2 h-4 w-4" /> Download Template
          </Button>
        </div>

        {/* Step 2 */}
        <div className="surface-card p-6">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">2</div>
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
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">3</div>
          <h3 className="mb-1 font-semibold">Generate ZIP</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            One text-based PDF per invoice, packed into a single ZIP file.
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
        <div className="mt-6 flex gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          <p>All {jobs.length} invoices generated and downloaded as a ZIP.</p>
        </div>
      )}

      {/* Invoice list */}
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
                    <td className="px-4 py-2 text-muted-foreground">{formatDateDisplay(job.state.invoiceDate)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{job.state.items.length}</td>
                    <td className="px-4 py-2">
                      {job.status === "done" ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
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
    </section>
  );
};
