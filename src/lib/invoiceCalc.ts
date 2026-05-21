import { InvoiceState, ItemTotals, LineItem } from "./invoiceTypes";

export function computeItemTaxable(it: LineItem): number {
  const base = (Number(it.qty) || 0) * (Number(it.rate) || 0);
  const disc = Number(it.discount) || 0;
  return Math.max(0, base - disc);
}

export function computeItemTotals(
  it: LineItem,
  intraState: boolean,
  collectGst: boolean
): ItemTotals {
  const taxable = computeItemTaxable(it);
  if (!collectGst) return { taxable, cgst: 0, sgst: 0, igst: 0, total: taxable };
  const tax = (taxable * (Number(it.gstRate) || 0)) / 100;
  if (intraState) {
    const half = tax / 2;
    return { taxable, cgst: half, sgst: half, igst: 0, total: taxable + tax };
  }
  return { taxable, cgst: 0, sgst: 0, igst: tax, total: taxable + tax };
}

export function isIntraState(sellerState: string, placeOfSupply: string): boolean {
  if (!sellerState || !placeOfSupply) return true;
  return sellerState.trim().toLowerCase() === placeOfSupply.trim().toLowerCase();
}

export function shouldCollectGst(sellerType: InvoiceState["sellerType"]): boolean {
  return sellerType === "regular";
}

export function getDocumentTitle(sellerType: InvoiceState["sellerType"]): string {
  if (sellerType === "regular") return "Tax Invoice";
  if (sellerType === "composition") return "Bill of Supply";
  return "Invoice";
}

export function computeInvoiceTotals(state: InvoiceState) {
  const intra = isIntraState(state.seller.state, state.placeOfSupply);
  const collect = shouldCollectGst(state.sellerType);
  const rows = state.items.map((it) => ({
    item: it,
    totals: computeItemTotals(it, intra, collect),
  }));
  const sum = rows.reduce(
    (acc, r) => ({
      taxable: acc.taxable + r.totals.taxable,
      cgst: acc.cgst + r.totals.cgst,
      sgst: acc.sgst + r.totals.sgst,
      igst: acc.igst + r.totals.igst,
      total: acc.total + r.totals.total,
    }),
    { taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 }
  );

  // Group GST by rate for summary
  const byRate = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
  rows.forEach((r) => {
    const k = r.item.gstRate || 0;
    const cur = byRate.get(k) || { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
    cur.taxable += r.totals.taxable;
    cur.cgst += r.totals.cgst;
    cur.sgst += r.totals.sgst;
    cur.igst += r.totals.igst;
    byRate.set(k, cur);
  });

  const grand = Math.round(sum.total * 100) / 100;
  return {
    rows,
    intraState: intra,
    collectGst: collect,
    summary: sum,
    grand,
    roundOff: Math.round(grand) - grand,
    payable: Math.round(grand),
    byRate: Array.from(byRate.entries()).map(([rate, v]) => ({ rate, ...v })),
  };
}

export const formatINR = (n: number): string =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);

export const formatNum = (n: number): string =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n || 0);
