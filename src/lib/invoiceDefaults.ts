import { InvoiceState } from "@/lib/invoiceTypes";

export const emptyState: InvoiceState = {
  sellerType: "regular",
  buyerType: "regular",
  seller: { name: "", gstin: "", msme: "", address: "", state: "", mobile: "", email: "" },
  buyer: { name: "", gstin: "", msme: "", address: "", state: "", mobile: "", email: "" },
  shipToEnabled: false,
  shipTo: { name: "", address: "", state: "", gstin: "" },
  invoiceNumber: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  placeOfSupply: "",
  items: [
    { id: crypto.randomUUID(), description: "", hsn: "", qty: 1, rate: 0, discount: 0, gstRate: 18 },
  ],
  transporter: { name: "", gstin: "", vehicle: "", lr: "", date: "", mode: "", ewb: "" },
  notes: "",
  terms: "1. Payment due within 15 days of invoice date.\n2. Interest @ 18% p.a. on overdue payments.\n3. Subject to local jurisdiction.",
  signatory: "Authorised Signatory",
  amountReceived: 0,
  receiptMode: "",
};
