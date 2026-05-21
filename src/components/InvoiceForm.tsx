import { InvoiceState, LineItem, Party, ShipTo, Transporter, RegistrationType } from "@/lib/invoiceTypes";
import { INDIAN_STATES, GST_RATES, TRANSPORT_MODES } from "@/lib/india";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Building2, User2, Truck, Receipt, FileSignature } from "lucide-react";

interface Props {
  state: InvoiceState;
  setState: React.Dispatch<React.SetStateAction<InvoiceState>>;
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

export const InvoiceForm = ({ state, setState }: Props) => {
  const updateParty = (key: "seller" | "buyer", field: keyof Party, value: string) =>
    setState((s) => ({ ...s, [key]: { ...s[key], [field]: value } }));

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
          <Field label="Invoice Number"><Input placeholder="e.g. INV-2025-001" value={state.invoiceNumber} onChange={(e) => setState((s) => ({ ...s, invoiceNumber: e.target.value }))} /></Field>
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
      </SectionCard>

      {/* Buyer */}
      <SectionCard icon={User2} title="Bill To (Buyer)">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer Name"><Input placeholder="e.g. Customer Pvt Ltd" value={state.buyer.name} onChange={(e) => updateParty("buyer", "name", e.target.value)} /></Field>
          <Field label="GSTIN (optional)"><Input placeholder="GSTIN of customer" value={state.buyer.gstin} onChange={(e) => updateParty("buyer", "gstin", e.target.value.toUpperCase())} /></Field>
          <Field label="MSME / Udyam Number"><Input placeholder="UDYAM number (optional)" value={state.buyer.msme} onChange={(e) => updateParty("buyer", "msme", e.target.value)} /></Field>
          <Field label="State"><StateSelect value={state.buyer.state} onChange={(v) => updateParty("buyer", "state", v)} /></Field>
          <div className="sm:col-span-2"><Field label="Address"><Textarea rows={2} placeholder="Street, City, PIN" value={state.buyer.address} onChange={(e) => updateParty("buyer", "address", e.target.value)} /></Field></div>
          <Field label="Mobile"><Input placeholder="+91 90000 00000" value={state.buyer.mobile} onChange={(e) => updateParty("buyer", "mobile", e.target.value)} /></Field>
          <Field label="Email"><Input placeholder="customer@email.com" value={state.buyer.email} onChange={(e) => updateParty("buyer", "email", e.target.value)} /></Field>
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
        <div className="space-y-4">
          {state.items.map((it, idx) => (
            <div key={it.id} className="rounded-xl border border-border bg-secondary/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Item {idx + 1}</span>
                <Button variant="ghost" size="sm" onClick={() => removeItem(it.id)} disabled={state.items.length === 1} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
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
    </div>
  );
};
