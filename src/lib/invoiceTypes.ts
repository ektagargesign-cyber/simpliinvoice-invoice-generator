export type RegistrationType = "regular" | "composition" | "unregistered";

export interface Party {
  name: string;
  gstin: string;
  msme: string;
  address: string;
  state: string;
  mobile: string;
  email: string;
}

export interface ShipTo {
  name: string;
  address: string;
  state: string;
  gstin: string;
}

export interface LineItem {
  id: string;
  description: string;
  hsn: string;
  qty: number;
  rate: number;
  discount: number;
  gstRate: number;
}

export interface Transporter {
  name: string;
  gstin: string;
  vehicle: string;
  lr: string;
  date: string;
  mode: string;
  ewb: string;
}

export interface InvoiceState {
  sellerType: RegistrationType;
  buyerType: RegistrationType;
  seller: Party;
  buyer: Party;
  shipToEnabled: boolean;
  shipTo: ShipTo;
  invoiceNumber: string;
  invoiceDate: string;
  placeOfSupply: string;
  items: LineItem[];
  transporter: Transporter;
  notes: string;
  terms: string;
  signatory: string;
}

export interface ItemTotals {
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}
