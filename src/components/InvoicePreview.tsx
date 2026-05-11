import { InvoiceState } from "@/lib/invoiceTypes";
import { computeInvoiceTotals, formatNum, getDocumentTitle } from "@/lib/invoiceCalc";
import { numberToIndianWords } from "@/lib/numberToWords";
import { FileText } from "lucide-react";

interface Props { state: InvoiceState; }

const Row = ({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) => (
  <div className={`flex justify-between gap-4 text-sm ${strong ? "font-semibold" : ""}`}>
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

export const InvoicePreview = ({ state }: Props) => {
  const t = computeInvoiceTotals(state);
  const docTitle = getDocumentTitle(state.sellerType);
  const showGst = t.collectGst;

  const transporterFilled = Object.values(state.transporter).some((v) => v && String(v).trim() !== "");

  return (
    <div className="invoice-print mx-auto w-full max-w-[850px] overflow-hidden rounded-2xl border border-border bg-white text-slate-900 shadow-lg-soft dark:bg-slate-50">
      {/* Header */}
      <div className="invoice-accent flex items-start justify-between gap-4 bg-[hsl(230_60%_22%)] px-7 py-6 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="font-display text-xl font-bold">SimpliInvoice</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/70">Simplified Tax India</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-semibold uppercase tracking-wider">{docTitle}</div>
          <div className="mt-1 text-xs text-white/80">{state.invoiceNumber || "Invoice #"}</div>
          <div className="text-xs text-white/80">{state.invoiceDate ? new Date(state.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</div>
        </div>
      </div>

      <div className="px-7 py-6">
        {/* Parties */}
        <div className={`grid gap-6 ${state.shipToEnabled ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">From</div>
            <div className="text-sm font-semibold">{state.seller.name || "Your Business Name"}</div>
            {state.seller.address && <div className="mt-0.5 whitespace-pre-line text-xs text-slate-600">{state.seller.address}</div>}
            {state.seller.state && <div className="text-xs text-slate-600">{state.seller.state}</div>}
            {state.seller.gstin && <div className="mt-1 text-xs"><strong>GSTIN:</strong> {state.seller.gstin}</div>}
            {state.seller.msme && <div className="text-xs"><strong>MSME:</strong> {state.seller.msme}</div>}
            {state.seller.mobile && <div className="text-xs">{state.seller.mobile}</div>}
            {state.seller.email && <div className="text-xs">{state.seller.email}</div>}
          </div>

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Bill To</div>
            <div className="text-sm font-semibold">{state.buyer.name || "Customer Name"}</div>
            {state.buyer.address && <div className="mt-0.5 whitespace-pre-line text-xs text-slate-600">{state.buyer.address}</div>}
            {state.buyer.state && <div className="text-xs text-slate-600">{state.buyer.state}</div>}
            {state.buyer.gstin && <div className="mt-1 text-xs"><strong>GSTIN:</strong> {state.buyer.gstin}</div>}
            {state.buyer.msme && <div className="text-xs"><strong>MSME:</strong> {state.buyer.msme}</div>}
            {state.buyer.mobile && <div className="text-xs">{state.buyer.mobile}</div>}
            {state.buyer.email && <div className="text-xs">{state.buyer.email}</div>}
          </div>

          {state.shipToEnabled && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ship To</div>
              <div className="text-sm font-semibold">{state.shipTo.name || "—"}</div>
              {state.shipTo.address && <div className="mt-0.5 whitespace-pre-line text-xs text-slate-600">{state.shipTo.address}</div>}
              {state.shipTo.state && <div className="text-xs text-slate-600">{state.shipTo.state}</div>}
              {state.shipTo.gstin && <div className="mt-1 text-xs"><strong>GSTIN:</strong> {state.shipTo.gstin}</div>}
            </div>
          )}
        </div>

        {/* Meta line */}
        <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-3">
          <div><span className="text-slate-500">Place of Supply:</span> <strong>{state.placeOfSupply || "—"}</strong></div>
          <div><span className="text-slate-500">Tax Type:</span> <strong>{showGst ? (t.intraState ? "CGST + SGST" : "IGST") : "—"}</strong></div>
          <div><span className="text-slate-500">Document:</span> <strong>{docTitle}</strong></div>
        </div>

        {/* Items table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-left text-slate-700">
                <th className="border border-slate-200 px-2 py-2">#</th>
                <th className="border border-slate-200 px-2 py-2">Description</th>
                <th className="border border-slate-200 px-2 py-2">HSN/SAC</th>
                <th className="border border-slate-200 px-2 py-2 text-right">Qty</th>
                <th className="border border-slate-200 px-2 py-2 text-right">Rate</th>
                <th className="border border-slate-200 px-2 py-2 text-right">Disc</th>
                <th className="border border-slate-200 px-2 py-2 text-right">Taxable</th>
                {showGst && t.intraState && (<>
                  <th className="border border-slate-200 px-2 py-2 text-right">CGST</th>
                  <th className="border border-slate-200 px-2 py-2 text-right">SGST</th>
                </>)}
                {showGst && !t.intraState && (
                  <th className="border border-slate-200 px-2 py-2 text-right">IGST</th>
                )}
                <th className="border border-slate-200 px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {t.rows.map((r, i) => (
                <tr key={r.item.id}>
                  <td className="border border-slate-200 px-2 py-2">{i + 1}</td>
                  <td className="border border-slate-200 px-2 py-2">{r.item.description || <span className="text-slate-400">Item description</span>}</td>
                  <td className="border border-slate-200 px-2 py-2">{r.item.hsn || "—"}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{r.item.qty || 0}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{formatNum(r.item.rate)}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{formatNum(r.item.discount)}</td>
                  <td className="border border-slate-200 px-2 py-2 text-right">{formatNum(r.totals.taxable)}</td>
                  {showGst && t.intraState && (<>
                    <td className="border border-slate-200 px-2 py-2 text-right">{formatNum(r.totals.cgst)} <span className="text-[10px] text-slate-500">({(r.item.gstRate/2)}%)</span></td>
                    <td className="border border-slate-200 px-2 py-2 text-right">{formatNum(r.totals.sgst)} <span className="text-[10px] text-slate-500">({(r.item.gstRate/2)}%)</span></td>
                  </>)}
                  {showGst && !t.intraState && (
                    <td className="border border-slate-200 px-2 py-2 text-right">{formatNum(r.totals.igst)} <span className="text-[10px] text-slate-500">({r.item.gstRate}%)</span></td>
                  )}
                  <td className="border border-slate-200 px-2 py-2 text-right font-semibold">{formatNum(r.totals.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tax summary + totals */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            {showGst && t.byRate.length > 0 && (
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">GST Summary</div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-600">
                      <th className="text-left">Rate</th>
                      <th className="text-right">Taxable</th>
                      {t.intraState ? <><th className="text-right">CGST</th><th className="text-right">SGST</th></> : <th className="text-right">IGST</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {t.byRate.map((b) => (
                      <tr key={b.rate}>
                        <td>{b.rate}%</td>
                        <td className="text-right">{formatNum(b.taxable)}</td>
                        {t.intraState ? <><td className="text-right">{formatNum(b.cgst)}</td><td className="text-right">{formatNum(b.sgst)}</td></> : <td className="text-right">{formatNum(b.igst)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {state.sellerType === "composition" && (
              <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <strong>Composition taxable person, not eligible to collect tax on supplies.</strong>
              </div>
            )}
            {state.sellerType === "unregistered" && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                This is a non-GST invoice issued by an unregistered person. GST is not applicable.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <Row label="Taxable Value" value={formatNum(t.summary.taxable)} />
            {showGst && t.intraState && (<>
              <Row label="CGST" value={formatNum(t.summary.cgst)} />
              <Row label="SGST" value={formatNum(t.summary.sgst)} />
            </>)}
            {showGst && !t.intraState && <Row label="IGST" value={formatNum(t.summary.igst)} />}
            <Row label="Round Off" value={formatNum(t.roundOff)} />
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
              <span>Grand Total</span>
              <span>₹ {formatNum(t.payable)}</span>
            </div>
          </div>
        </div>

        {/* Amount in words */}
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs">
          <span className="text-slate-500">Amount in words: </span>
          <strong>{numberToIndianWords(t.payable)}</strong>
        </div>

        {/* Transporter */}
        {transporterFilled && (
          <div className="mt-4 rounded-lg border border-slate-200 p-3 text-xs">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Transporter Details</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {state.transporter.name && <div><span className="text-slate-500">Name:</span> {state.transporter.name}</div>}
              {state.transporter.gstin && <div><span className="text-slate-500">GSTIN:</span> {state.transporter.gstin}</div>}
              {state.transporter.vehicle && <div><span className="text-slate-500">Vehicle:</span> {state.transporter.vehicle}</div>}
              {state.transporter.lr && <div><span className="text-slate-500">LR/GR:</span> {state.transporter.lr}</div>}
              {state.transporter.date && <div><span className="text-slate-500">Date:</span> {state.transporter.date}</div>}
              {state.transporter.mode && <div><span className="text-slate-500">Mode:</span> {state.transporter.mode}</div>}
              {state.transporter.ewb && <div><span className="text-slate-500">E-way Bill:</span> {state.transporter.ewb}</div>}
            </div>
          </div>
        )}

        {/* Notes & Terms & Signatory */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            {state.notes && (<>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Notes</div>
              <div className="whitespace-pre-line text-xs text-slate-700">{state.notes}</div>
            </>)}
            {state.terms && (
              <div className="mt-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Terms & Conditions</div>
                <div className="whitespace-pre-line text-xs text-slate-700">{state.terms}</div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end justify-end">
            <div className="mt-10 w-48 border-t border-slate-300 pt-2 text-center text-xs">
              For <strong>{state.seller.name || "Your Business"}</strong>
              <div className="mt-6 text-[11px] text-slate-600">{state.signatory || "Authorised Signatory"}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
          Generated with SimpliInvoice · simplifiedtaxindia.blogspot.com
        </div>
      </div>
    </div>
  );
};
