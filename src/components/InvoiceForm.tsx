import { useState, useEffect } from "react";
import { InvoiceState, LineItem, Party, ShipTo, Transporter, RegistrationType, BankDetails, ReceiptMode } from "@/lib/invoiceTypes";
import { INDIAN_STATES, GST_RATES, TRANSPORT_MODES } from "@/lib/india";
import { fileToResizedDataUrl } from "@/lib/imageUtils";
import {
  loadBuyers,
  saveBuyer,
  deleteBuyer,
  loadItemCatalog,
  saveItemToCatalog,
  deleteCatalogItem,
  saveSellerProfile,
  peekNextInvoiceNumber,
  commitNextInvoiceNumber,
  CatalogItem,
} from "@/lib/storage";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Building2, User2, Truck, Receipt, FileSignature, Save, BookmarkPlus, Sparkles, Image as ImageIcon, PenLine, Landmark, X } from "lucide-react";

const RECEIPT_MODES: ReceiptMode[] = ["Cash", "Bank Transfer", "UPI", "Cheque", "NEFT/RTGS", "Other"];

interface Props {
  state: InvoiceState;
  setState: React.Dispatch<React.SetStateAction<InvoiceState>>;
  syncKey?: number;
}

const RegSelect = ({ value, onChange, label }: { value: RegistrationType; onChange: (v: RegistrationType) => void; label: string }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
    <Select value={value} onValueChange={(v) => onChange(v as RegistrationType)}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="regular">Regular GST</SelectItem>
        <SelectItem value="composition">Composition</SelectItem>
        <SelectItem value="unregistered">Unregistered</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const StateSelect = ({ value, onChange, placeholder = "Select state" }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <Select value={value || undefined} onValueChange={onChange}>
    <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent className="max-h-72">
      {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
    </SelectContent>
  </Select>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</Label>
    {children}
  </div>
);

const SectionCard = ({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="surface-card p-5 sm:p-6">
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

export const InvoiceForm = ({ state, setState, syncKey }: Props) => {
  const [buyers, setBuyers] = useState<Party[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState<string>("");
  const [catalogPick, setCatalogPick] = useState<string>("");

  useEffect(() => {
    setBuyers(loadBuyers());
    setCatalog(loadItemCatalog());
  }, [syncKey]); // was: []

  const updateParty = (key: "seller" | "buyer", field: keyof Party, value: string) =>
    setState((s) => ({ ...s, [key]: { ...s[key], [field]: value } }));

  const updateBankDetails = (field: keyof BankDetails, value: string) =>
    setState((s) => ({
      ...s,
      seller: { ...s.seller, bankDetails: { ...s.seller.bankDetails, [field]: value } as BankDetails },
    }));

  const [logoUploading, setLogoUploading] = useState(false);
  const [signatureUploading, setSignatureUploading] = useState(false);
  const [upiQrUploading, setUpiQrUploading] = useState(false);

  const handleLogoUpload = async (file: File | undefined) => {
    if (!file) return;
    setLogoUploading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 300, 150);
      setState((s) => ({ ...s, seller: { ...s.seller, logoDataUrl: dataUrl } }));
    } catch {
      toast.error("Couldn't process that image — try a different file");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSignatureUpload = async (file: File | undefined) => {
    if (!file) return;
    setSignatureUploading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 250, 100);
      setState((s) => ({ ...s, seller: { ...s.seller, signatureDataUrl: dataUrl } }));
    } catch {
      toast.error("Couldn't process that image — try a different file");
    } finally {
      setSignatureUploading(false);
    }
  };

  const removeLogo = () => setState((s) => ({ ...s, seller: { ...s.seller, logoDataUrl: undefined } }));
  const removeSignature = () => setState((s) => ({ ...s, seller: { ...s.seller, signatureDataUrl: undefined } }));

  const handleUpiQrUpload = async (file: File | undefined) => {
    if (!file) return;
    setUpiQrUploading(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 200, 200);
      setState((s) => ({ ...s, seller: { ...s.seller, upiQrDataUrl: dataUrl } }));
    } catch {
      toast.error("Couldn't process that image — try a different file");
    } finally {
      setUpiQrUploading(false);
    }
  };
  const removeUpiQr = () => setState((s) => ({ ...s, seller: { ...s.seller, upiQrDataUrl: undefined } }));


  const updateShip = (field: keyof ShipTo, value: string) =>
    setState((s) => ({ ...s, shipTo: { ...s.shipTo, [field]: value } }));

  const updateTransporter = (field: keyof Transporter, value: string) =>
    setState((s) => ({ ...s, transporter: { ...s.transporter, [field]: value } }));

  const updateItem = (id: string, patch: Partial<LineItem>) =>
    setState((s) => ({ ...s, items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));

  const addItem = () =>
    setState((s) => ({
      ...s,
      items: [...s.items, { id: crypto.randomUUID(), description: "", hsn: "", qty: 1, rate: 0, discount: 0, gstRate: 18 }],
    }));

  const removeItem = (id: string) =>
    setState((s) => ({ ...s, items: s.items.filter((it) => it.id !== id) }));

  // ---- Seller profile ----
  const handleSaveSeller = () => {
    if (!state.seller.name.trim()) {
      toast.error("Add a business name before saving");
      return;
    }
    saveSellerProfile(state.seller);
    toast.success("Seller profile saved — it'll auto-load next time");
  };

  // ---- Saved buyers ----
  const handleSaveBuyer = () => {
    if (!state.buyer.name.trim()) {
      toast.error("Add a customer name before saving");
      return;
    }
    saveBuyer(state.buyer);
    setBuyers(loadBuyers());
    toast.success(`Saved "${state.buyer.name}" to your buyer directory`);
  };

  const handleSelectBuyer = (name: string) => {
    setSelectedBuyer(name);
    const found = buyers.find((b) => b.name === name);
    if (found) setState((s) => ({ ...s, buyer: found }));
  };

  const handleDeleteBuyer = (name: string) => {
    deleteBuyer(name);
    setBuyers(loadBuyers());
    if (selectedBuyer === name) setSelectedBuyer("");
    toast.success(`Removed "${name}" from saved customers`);
  };

  // ---- Invoice numbering ----
  const handleGenerateNumber = () => {
    const num = commitNextInvoiceNumber(state.seller.name);
    setState((s) => ({ ...s, invoiceNumber: num }));
  };

  // ---- Item catalog ----
  const handleSaveItemToCatalog = (it: LineItem) => {
    if (!it.description.trim()) {
      toast.error("Add a description before saving to catalog");
      return;
    }
    saveItemToCatalog({ description: it.description, hsn: it.hsn, rate: it.rate, gstRate: it.gstRate });
    setCatalog(loadItemCatalog());
    toast.success(`Saved "${it.description}" to your item catalog`);
  };

  const handleAddFromCatalog = (description: string) => {
    const item = catalog.find((c) => c.description === description);
    if (!item) return;
    setState((s) => ({
      ...s,
      items: [...s.items, { id: crypto.randomUUID(), description: item.description, hsn: item.hsn, qty: 1, rate: item.rate, discount: 0, gstRate: item.gstRate }],
    }));
    setCatalogPick("");
  };

  const handleDeleteCatalogItem = (description: string) => {
    deleteCatalogItem(description);
    setCatalog(loadItemCatalog());
  };

  const showGstCols = state.sellerType === "regular";

  return (
    <div className="space-y-6">
      {/* Registration */}
      <SectionCard icon={Receipt} title="Registration & Document Type" subtitle="The invoice format adapts to the seller's registration type.">
        <div className="grid gap-4 sm:grid-cols-2">
          <RegSelect label="Seller Registration" value={state.sellerType} onChange={(v) => setState((s) => ({ ...s, sellerType: v }))} />
          <RegSelect label="Buyer Registration" value={state.buyerType} onChange={(v) => setState((s) => ({ ...s, buyerType: v }))} />
        </div>
        <div className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          {state.sellerType === "regular" && <>Document: <strong className="text-foreground">Tax Invoice</strong> · GST columns visible · CGST+SGST or IGST auto-calculated.</>}
          {state.sellerType === "composition" && <>Document: <strong className="text-foreground">Bill of Supply</strong> · GST columns hidden · Composition note will appear on invoice.</>}
          {state.sellerType === "unregistered" && <>Document: <strong className="text-foreground">Non-GST Invoice</strong> · GSTIN optional · GST columns hidden.</>}
        </div>
      </SectionCard>

      {/* Invoice meta */}
      <SectionCard icon={FileSignature} title="Invoice Details">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Invoice Number">
            <div className="flex gap-2">
              <Input placeholder="e.g. INV-2025-001" value={state.invoiceNumber} onChange={(e) => setState((s) => ({ ...s, invoiceNumber: e.target.value }))} />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGenerateNumber}
                title={`Generate next number (${peekNextInvoiceNumber(state.seller.name)})`}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label="Invoice Date"><Input type="date" value={state.invoiceDate} onChange={(e) => setState((s) => ({ ...s, invoiceDate: e.target.value }))} /></Field>
          <Field label="Place of Supply"><StateSelect value={state.placeOfSupply} onChange={(v) => setState((s) => ({ ...s, placeOfSupply: v }))} placeholder="Select state of supply" /></Field>
        </div>
      </SectionCard>

      {/* Seller */}
      <SectionCard icon={Building2} title="Your Business (Seller)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business Name"><Input placeholder="e.g. Acme Traders" value={state.seller.name} onChange={(e) => updateParty("seller", "name", e.target.value)} /></Field>
          <Field label="GSTIN"><Input placeholder="22AAAAA0000A1Z5" value={state.seller.gstin} onChange={(e) => updateParty("seller", "gstin", e.target.value.toUpperCase())} /></Field>
          <Field label="MSME / Udyam Number"><Input placeholder="UDYAM-XX-00-0000000" value={state.seller.msme} onChange={(e) => updateParty("seller", "msme", e.target.value)} /></Field>
          <Field label="State"><StateSelect value={state.seller.state} onChange={(v) => updateParty("seller", "state", v)} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><Textarea rows={2} placeholder="Street, City, PIN" value={state.seller.address} onChange={(e) => updateParty("seller", "address", e.target.value)} /></Field></div>
          <Field label="Mobile"><Input placeholder="+91 90000 00000" value={state.seller.mobile} onChange={(e) => updateParty("seller", "mobile", e.target.value)} /></Field>
          <Field label="Email"><Input placeholder="hello@business.com" value={state.seller.email} onChange={(e) => updateParty("seller", "email", e.target.value)} /></Field>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Company Logo (optional)">
            {state.seller.logoDataUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                <img src={state.seller.logoDataUrl} alt="Logo preview" className="h-12 w-auto max-w-[120px] rounded object-contain" />
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo} className="text-destructive hover:text-destructive">
                  <X className="mr-1 h-3.5 w-3.5" /> Remove logo
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-sm text-muted-foreground hover:bg-secondary/50">
                <ImageIcon className="h-4 w-4" />
                {logoUploading ? "Processing…" : "Upload logo (PNG/JPG)"}
                <input type="file" accept="image/*" className="hidden" disabled={logoUploading} onChange={(e) => handleLogoUpload(e.target.files?.[0])} />
              </label>
            )}
          </Field>
          <Field label="Authorised Signature (optional)">
            {state.seller.signatureDataUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                <img src={state.seller.signatureDataUrl} alt="Signature preview" className="h-10 w-auto max-w-[140px] rounded object-contain" />
                <Button type="button" variant="ghost" size="sm" onClick={removeSignature} className="text-destructive hover:text-destructive">
                  <X className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-sm text-muted-foreground hover:bg-secondary/50">
                <PenLine className="h-4 w-4" />
                {signatureUploading ? "Processing…" : "Upload signature (PNG/JPG)"}
                <input type="file" accept="image/*" className="hidden" disabled={signatureUploading} onChange={(e) => handleSignatureUpload(e.target.files?.[0])} />
              </label>
            )}
          </Field>

          <Field label="UPI QR Code (optional)">
            {state.seller.upiQrDataUrl ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/30 p-2.5">
                <img src={state.seller.upiQrDataUrl} alt="UPI QR preview" className="h-14 w-14 rounded object-contain" />
                <Button type="button" variant="ghost" size="sm" onClick={removeUpiQr} className="text-destructive hover:text-destructive">
                  <X className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 p-3 text-sm text-muted-foreground hover:bg-secondary/50">
                <ImageIcon className="h-4 w-4" />
                {upiQrUploading ? "Processing…" : "Upload UPI QR image (PNG/JPG)"}
                <input type="file" accept="image/*" className="hidden" disabled={upiQrUploading} onChange={(e) => handleUpiQrUpload(e.target.files?.[0])} />
              </label>
            )}
          </Field>
        </div>

        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveSeller}>
            <Save className="mr-2 h-4 w-4" /> Save as my default seller profile
          </Button>
        </div>
      </SectionCard>

      {/* Bank Details */}
      <SectionCard icon={Landmark} title="Bank Details (optional)" subtitle="Shown on the invoice if Account Number is filled in. Saved with your seller profile.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account Name"><Input value={state.seller.bankDetails?.accountName || ""} onChange={(e) => updateBankDetails("accountName", e.target.value)} /></Field>
          <Field label="Account Number"><Input value={state.seller.bankDetails?.accountNumber || ""} onChange={(e) => updateBankDetails("accountNumber", e.target.value)} /></Field>
          <Field label="IFSC Code"><Input value={state.seller.bankDetails?.ifsc || ""} onChange={(e) => updateBankDetails("ifsc", e.target.value.toUpperCase())} /></Field>
          <Field label="Bank Name"><Input value={state.seller.bankDetails?.bankName || ""} onChange={(e) => updateBankDetails("bankName", e.target.value)} /></Field>
          <Field label="Branch"><Input value={state.seller.bankDetails?.branch || ""} onChange={(e) => updateBankDetails("branch", e.target.value)} /></Field>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">Use the "Save as my default seller profile" button above — bank details are part of your seller profile.</div>
      </SectionCard>

      {/* Buyer */}
      <SectionCard icon={User2} title="Bill To (Buyer)">
        {buyers.length > 0 && (
          <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-border bg-secondary/40 p-3.5">
            <div className="min-w-[220px] flex-1">
              <Field label="Load a saved customer">
                <Select value={selectedBuyer || undefined} onValueChange={handleSelectBuyer}>
                  <SelectTrigger><SelectValue placeholder="Choose a saved customer" /></SelectTrigger>
                  <SelectContent>
                    {buyers.map((b) => <SelectItem key={b.name} value={b.name}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {selectedBuyer && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteBuyer(selectedBuyer)}
                className="text-destructive hover:text-destructive"
                title="Remove from saved customers"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer Name"><Input placeholder="e.g. Customer Pvt Ltd" value={state.buyer.name} onChange={(e) => updateParty("buyer", "name", e.target.value)} /></Field>
          <Field label="GSTIN (optional)"><Input placeholder="GSTIN of customer" value={state.buyer.gstin} onChange={(e) => updateParty("buyer", "gstin", e.target.value.toUpperCase())} /></Field>
          <Field label="MSME / Udyam Number"><Input placeholder="UDYAM number (optional)" value={state.buyer.msme} onChange={(e) => updateParty("buyer", "msme", e.target.value)} /></Field>
          <Field label="State"><StateSelect value={state.buyer.state} onChange={(v) => updateParty("buyer", "state", v)} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><Textarea rows={2} placeholder="Street, City, PIN" value={state.buyer.address} onChange={(e) => updateParty("buyer", "address", e.target.value)} /></Field></div>
          <Field label="Mobile"><Input placeholder="+91 90000 00000" value={state.buyer.mobile} onChange={(e) => updateParty("buyer", "mobile", e.target.value)} /></Field>
          <Field label="Email"><Input placeholder="customer@email.com" value={state.buyer.email} onChange={(e) => updateParty("buyer", "email", e.target.value)} /></Field>
        </div>

        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" onClick={handleSaveBuyer}>
            <BookmarkPlus className="mr-2 h-4 w-4" /> Save this customer for next time
          </Button>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-secondary/40 p-3.5">
          <div>
            <div className="text-sm font-medium">Different Ship To address?</div>
            <div className="text-xs text-muted-foreground">Show a separate shipping address on the invoice.</div>
          </div>
          <Switch checked={state.shipToEnabled} onCheckedChange={(v) => setState((s) => ({ ...s, shipToEnabled: v }))} />
        </div>

        {state.shipToEnabled && (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Ship To Name"><Input value={state.shipTo.name} onChange={(e) => updateShip("name", e.target.value)} /></Field>
            <Field label="Ship To GSTIN (optional)"><Input value={state.shipTo.gstin} onChange={(e) => updateShip("gstin", e.target.value.toUpperCase())} /></Field>
            <div className="sm:col-span-2"><Field label="Ship To Address"><Textarea rows={2} value={state.shipTo.address} onChange={(e) => updateShip("address", e.target.value)} /></Field></div>
            <Field label="Ship To State"><StateSelect value={state.shipTo.state} onChange={(v) => updateShip("state", v)} /></Field>
          </div>
        )}
      </SectionCard>

      {/* Items */}
      <SectionCard icon={Receipt} title="Line Items" subtitle="Taxable value = Qty × Rate − Discount.">
        {catalog.length > 0 && (
          <div className="mb-4 space-y-2">
            <Field label="Quick add from catalog">
              <Select value={catalogPick || undefined} onValueChange={handleAddFromCatalog}>
                <SelectTrigger><SelectValue placeholder="Pick a saved item to add as a new line" /></SelectTrigger>
                <SelectContent>
                  {catalog.map((c) => <SelectItem key={c.description} value={c.description}>{c.description}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {catalog.map((c) => (
                <span key={c.description} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs">
                  {c.description}
                  <button type="button" onClick={() => handleDeleteCatalogItem(c.description)} className="text-muted-foreground hover:text-destructive" title="Remove from catalog">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="space-y-4">
          {state.items.map((it, idx) => (
            <div key={it.id} className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleSaveItemToCatalog(it)} title="Save to catalog">
                    <BookmarkPlus className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(it.id)} disabled={state.items.length === 1} className="text-destructive hover:text-destructive" title="Remove line">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-6"><Field label="Description"><Input placeholder="Product or service" value={it.description} onChange={(e) => updateItem(it.id, { description: e.target.value })} /></Field></div>
                <div className="sm:col-span-2"><Field label="HSN/SAC"><Input placeholder="e.g. 998314" value={it.hsn} onChange={(e) => updateItem(it.id, { hsn: e.target.value })} /></Field></div>
                <div className="sm:col-span-1"><Field label="Qty"><Input type="number" min={0} step="any" value={it.qty} onChange={(e) => updateItem(it.id, { qty: Number(e.target.value) })} /></Field></div>
                <div className="sm:col-span-1"><Field label="Rate"><Input type="number" min={0} step="any" value={it.rate} onChange={(e) => updateItem(it.id, { rate: Number(e.target.value) })} /></Field></div>
                <div className="sm:col-span-1"><Field label="Disc"><Input type="number" min={0} step="any" value={it.discount} onChange={(e) => updateItem(it.id, { discount: Number(e.target.value) })} /></Field></div>
                {showGstCols && (
                  <div className="sm:col-span-1">
                    <Field label="GST %">
                      <Select value={String(it.gstRate)} onValueChange={(v) => updateItem(it.id, { gstRate: Number(v) })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{GST_RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addItem} className="w-full border-dashed">
            <Plus className="mr-2 h-4 w-4" /> Add another line item
          </Button>
        </div>
      </SectionCard>

      {/* Transporter */}
      <SectionCard icon={Truck} title="Transporter Details (optional)" subtitle="Hidden on invoice if all fields are empty.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Transporter Name"><Input value={state.transporter.name} onChange={(e) => updateTransporter("name", e.target.value)} /></Field>
          <Field label="Transporter GSTIN"><Input value={state.transporter.gstin} onChange={(e) => updateTransporter("gstin", e.target.value.toUpperCase())} /></Field>
          <Field label="Vehicle Number"><Input placeholder="MH 12 AB 1234" value={state.transporter.vehicle} onChange={(e) => updateTransporter("vehicle", e.target.value.toUpperCase())} /></Field>
          <Field label="LR / GR Number"><Input value={state.transporter.lr} onChange={(e) => updateTransporter("lr", e.target.value)} /></Field>
          <Field label="Transport Date"><Input type="date" value={state.transporter.date} onChange={(e) => updateTransporter("date", e.target.value)} /></Field>
          <Field label="Mode of Transport">
            <Select value={state.transporter.mode || undefined} onValueChange={(v) => updateTransporter("mode", v)}>
              <SelectTrigger><SelectValue placeholder="Select mode" /></SelectTrigger>
              <SelectContent>{TRANSPORT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2"><Field label="E-way Bill Number (optional)"><Input value={state.transporter.ewb} onChange={(e) => updateTransporter("ewb", e.target.value)} /></Field></div>
        </div>
      </SectionCard>

      {/* Notes / terms */}
      <SectionCard icon={FileSignature} title="Notes, Terms & Signatory">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notes"><Textarea rows={4} placeholder="Any additional information for the customer" value={state.notes} onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))} /></Field>
          <Field label="Terms & Conditions"><Textarea rows={4} value={state.terms} onChange={(e) => setState((s) => ({ ...s, terms: e.target.value }))} /></Field>
          <Field label="Authorised Signatory Label"><Input value={state.signatory} onChange={(e) => setState((s) => ({ ...s, signatory: e.target.value }))} /></Field>
        </div>
      </SectionCard>

      {/* Payment received */}
      <SectionCard icon={Receipt} title="Payment Received (optional)" subtitle="Per-invoice — resets with the rest of the invoice on Reset.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount Received">
            <Input
              type="number"
              min={0}
              step="any"
              placeholder="0.00"
              value={state.amountReceived || ""}
              onChange={(e) => {
                const amount = Number(e.target.value);
                setState((s) => ({
                  ...s,
                  amountReceived: amount,
                  // Default to Cash the moment a real amount is entered, but only
                  // if the user hasn't already picked a mode. Clearing the amount
                  // back to 0 resets mode to NA (unset) rather than leaving a
                  // stale "Cash" sitting on a ₹0 invoice.
                  receiptMode: amount > 0 ? (s.receiptMode || "Cash") : "",
                }));
              }}
            />
          </Field>
          <Field label="Mode of Receipt">
            <Select
              value={state.receiptMode || undefined}
              onValueChange={(v) => setState((s) => ({ ...s, receiptMode: v as ReceiptMode }))}
              disabled={!state.amountReceived}
            >
              <SelectTrigger><SelectValue placeholder="NA" /></SelectTrigger>
              <SelectContent>
                {RECEIPT_MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </SectionCard>
    </div>
  );
};
