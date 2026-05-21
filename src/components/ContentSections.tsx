import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookOpen, ListChecks, Scale, Map, Shield, Mail, FileWarning, Info } from "lucide-react";

const SectionHead = ({ icon: Icon, eyebrow, title, lead }: { icon: any; eyebrow: string; title: string; lead?: string }) => (
  <div className="mx-auto mb-8 max-w-3xl text-center">
    <span className="accent-pill"><Icon className="h-3.5 w-3.5 text-accent" /> {eyebrow}</span>
    <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">{title}</h2>
    {lead && <p className="mt-3 text-muted-foreground">{lead}</p>}
  </div>
);

export const HowToUse = () => (
  <section id="how-to-use" className="container-app py-16">
    <SectionHead icon={ListChecks} eyebrow="Getting started" title="How to use SimpliInvoice" lead="A quick walkthrough — most users finish their first invoice in under two minutes." />
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { n: "01", t: "Pick registration type", d: "Choose Regular GST, Composition or Unregistered for the seller. The document type updates automatically." },
        { n: "02", t: "Add business & customer", d: "Fill seller and buyer details. Toggle Ship To if the goods are delivered to a different address." },
        { n: "03", t: "Add line items", d: "Enter description, HSN/SAC, qty, rate, discount and GST rate. Totals calculate live." },
        { n: "04", t: "Print or save PDF", d: "Click Print to send to your printer or use 'Save as PDF' from the print dialog." },
      ].map((s) => (
        <div key={s.n} className="surface-card p-5">
          <div className="text-xs font-semibold tracking-widest text-accent">{s.n}</div>
          <div className="mt-2 font-display text-lg font-semibold">{s.t}</div>
          <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
        </div>
      ))}
    </div>
  </section>
);

export const GstGuide = () => (
  <section id="guide" className="bg-secondary/40 py-16">
    <div className="container-app">
      <SectionHead icon={BookOpen} eyebrow="Free guide" title="GST Invoice Guide for Indian businesses" lead="The essentials a small business owner, freelancer or trader should know before issuing an invoice." />
      <div className="mx-auto max-w-3xl">
        <Accordion type="single" collapsible className="surface-card divide-y divide-border">
          {[
            {
              q: "What is a GST invoice and what must it contain?",
              a: "A GST invoice is a document issued by a registered supplier when goods or services are sold. As per Rule 46 of the CGST Rules, it must include: supplier name, address & GSTIN; invoice number and date; recipient name, address & GSTIN (if registered); HSN/SAC code; description, quantity, rate; taxable value; rate and amount of CGST/SGST/IGST; place of supply; and the signature or digital signature of the supplier or authorised signatory.",
            },
            {
              q: "Who needs to issue a tax invoice?",
              a: "Any person registered under GST (other than composition dealers) must issue a tax invoice for taxable supplies. Composition dealers issue a Bill of Supply instead. Unregistered persons may issue a simple non-GST invoice without GSTIN or tax columns.",
            },
            {
              q: "When should the invoice be issued?",
              a: "For goods, the tax invoice must be issued before or at the time of removal/delivery. For services, within 30 days of supply (45 days for banks/insurers/NBFCs).",
            },
            {
              q: "Is HSN/SAC mandatory?",
              a: "From April 2021, HSN/SAC reporting on invoices is mandatory for most taxpayers. Businesses with aggregate turnover up to ₹5 crore must use 4-digit HSN; above ₹5 crore must use 6-digit HSN. SAC codes apply to services.",
            },
            {
              q: "Do I need to mention place of supply?",
              a: "Yes. Place of supply determines whether CGST+SGST or IGST applies. If the place of supply is in the same state as the supplier, charge CGST+SGST. If different, charge IGST.",
            },
          ].map((f, i) => (
            <AccordionItem key={i} value={String(i)} className="border-0 px-5">
              <AccordionTrigger className="text-left font-medium">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export const TaxVsBoS = () => (
  <section id="tax-vs-bos" className="container-app py-16">
    <SectionHead icon={Scale} eyebrow="Document types" title="Tax Invoice vs Bill of Supply" lead="Two different documents, used by two different categories of registered persons." />
    <div className="grid gap-5 md:grid-cols-2">
      <div className="surface-card p-6">
        <h3 className="font-display text-xl font-semibold">Tax Invoice</h3>
        <p className="mt-1 text-sm text-muted-foreground">Issued by a Regular GST registered supplier for taxable supplies of goods or services.</p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>• Mandatory CGST + SGST (intra-state) or IGST (inter-state) columns</li>
          <li>• Recipient can claim Input Tax Credit (ITC) if GSTIN is shown</li>
          <li>• Must contain HSN/SAC, place of supply, signatory</li>
          <li>• Issued even when buyer is a composition dealer or unregistered</li>
        </ul>
      </div>
      <div className="surface-card p-6">
        <h3 className="font-display text-xl font-semibold">Bill of Supply</h3>
        <p className="mt-1 text-sm text-muted-foreground">Issued by composition dealers and suppliers of exempt goods/services. No GST is charged.</p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>• No CGST/SGST/IGST columns</li>
          <li>• Must clearly state: <em>"Composition taxable person, not eligible to collect tax on supplies."</em></li>
          <li>• Buyer cannot claim ITC against a Bill of Supply</li>
          <li>• Required by composition dealers under Section 10 of the CGST Act</li>
        </ul>
      </div>
    </div>
  </section>
);

export const CgstVsIgst = () => (
  <section id="cgst-vs-igst" className="bg-secondary/40 py-16">
    <div className="container-app">
      <SectionHead icon={Map} eyebrow="Tax components" title="CGST + SGST vs IGST — explained simply" lead="The split depends only on the supplier's state and the place of supply." />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="surface-card p-6">
          <h3 className="font-display text-xl font-semibold">Same state (Intra-state)</h3>
          <p className="mt-1 text-sm text-muted-foreground">When the supplier and the place of supply are in the same state or UT, GST is split equally between Central GST and State/UT GST.</p>
          <div className="mt-4 rounded-lg bg-background p-4 text-sm">
            Example: ₹10,000 sale at 18% GST<br />
            <strong>CGST 9% = ₹900</strong> · <strong>SGST 9% = ₹900</strong> · Total = ₹11,800
          </div>
        </div>
        <div className="surface-card p-6">
          <h3 className="font-display text-xl font-semibold">Different states (Inter-state)</h3>
          <p className="mt-1 text-sm text-muted-foreground">When the supplier and the place of supply are in different states or UTs, the whole GST is charged as Integrated GST.</p>
          <div className="mt-4 rounded-lg bg-background p-4 text-sm">
            Example: ₹10,000 sale at 18% GST<br />
            <strong>IGST 18% = ₹1,800</strong> · Total = ₹11,800
          </div>
        </div>
      </div>
    </div>
  </section>
);

export const Composition = () => (
  <section id="composition" className="container-app py-16">
    <SectionHead icon={Shield} eyebrow="Composition scheme" title="Composition Dealer Invoice Rules" lead="If you opted for the composition scheme under Section 10, follow these invoicing rules." />
    <div className="surface-card mx-auto max-w-3xl p-6">
      <ul className="space-y-3 text-sm">
        <li>• Composition dealers <strong>cannot collect GST</strong> from customers.</li>
        <li>• Issue a <strong>Bill of Supply</strong> instead of a Tax Invoice.</li>
        <li>• Mandatory note on every Bill of Supply: <em>"Composition taxable person, not eligible to collect tax on supplies."</em></li>
        <li>• Cannot claim Input Tax Credit on purchases.</li>
        <li>• Must pay GST out of own pocket at composition rates (1% / 5% / 6% depending on category).</li>
        <li>• File quarterly CMP-08 and annual GSTR-4.</li>
      </ul>
    </div>
  </section>
);

export const About = () => (
  <section id="about" className="bg-secondary/40 py-16">
    <div className="container-app">
      <SectionHead icon={Info} eyebrow="About" title="About SimpliInvoice" lead="A free, modern tool from Simplified Tax India to help small businesses focus on the work, not the paperwork." />
      <div className="mx-auto max-w-3xl space-y-4 text-sm text-muted-foreground">
        <p>SimpliInvoice is a 100% browser-based GST invoicing tool. It is designed for Indian small businesses, freelancers, consultants, traders and service providers who need a clean, GST-compliant invoice without the complexity (or cost) of full ERP software.</p>
        <p>Built by the team behind <strong className="text-foreground">Simplified Tax India</strong>, our blog dedicated to making GST, income tax and compliance easy for everyday business owners. We are not a registered GST suvidha provider — we simply build helpful, free tools.</p>
        <p>This is V1 — single-invoice, browser-only. Multi-invoice management, customer database and recurring invoices are on the roadmap.</p>
      </div>
    </div>
  </section>
);

export const Contact = () => (
  <section id="contact" className="container-app py-16">
    <SectionHead icon={Mail} eyebrow="Get in touch" title="Contact us" />
    <div className="surface-card mx-auto max-w-2xl p-6 text-center">
      <p className="text-sm text-muted-foreground">For feedback, bug reports or feature requests, write to us via the Simplified Tax India blog.</p>
      <a href="https://simplifiedtaxindia.blogspot.com" target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-lg bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md-soft hover:opacity-90">
        Visit Simplified Tax India →
      </a>
    </div>
  </section>
);

export const Privacy = () => (
  <section id="privacy" className="bg-secondary/40 py-16">
    <div className="container-app">
      <SectionHead icon={Shield} eyebrow="Privacy" title="Privacy Policy" />
      <div className="mx-auto max-w-3xl space-y-3 text-sm text-muted-foreground">
        <p><strong className="text-foreground">No data leaves your browser.</strong> SimpliInvoice does not have a backend, database or login. All invoice information you type stays on your device until you close the tab.</p>
        <p>We do not collect, store, share or sell any personal or business information entered into the form.</p>
        <p>SimpliInvoice may use trusted third-party services such as Vercel, Google Analytics or Google AdSense in the future to improve performance, understand traffic and support the platform. These services may use cookies or collect limited technical/browser information as per their own privacy policies.</p>

<p>External links, including Play Store links and blog resources, may lead to third-party websites governed by their own privacy practices.</p>
      </div>
    </div>
  </section>
);

export const Terms = () => (
  <section id="terms" className="container-app py-16">
    <SectionHead icon={FileWarning} eyebrow="Legal" title="Terms of Use" />
    <div className="mx-auto max-w-3xl space-y-3 text-sm text-muted-foreground">
      <p>SimpliInvoice is provided "as is" for informational and convenience purposes. By using the tool you agree to verify all generated invoices against the latest GST law and your own books before issuing them to customers.</p>
      <p>You are solely responsible for the accuracy of GSTIN, HSN/SAC, place of supply, tax rates and totals on invoices you generate. Simplified Tax India is not liable for any loss arising from the use of this tool.</p>
      <p>You may use SimpliInvoice freely for personal and commercial purposes. Reverse engineering, scraping or rebranding the tool without permission is not allowed.</p>
    </div>
  </section>
);

export const Disclaimer = () => (
  <section id="disclaimer" className="bg-secondary/40 py-16">
    <div className="container-app">
      <SectionHead icon={FileWarning} eyebrow="Disclaimer" title="Disclaimer" />
      <div className="mx-auto max-w-3xl space-y-3 text-sm text-muted-foreground">
        <p>The content and tool on SimpliInvoice are intended to provide general guidance, not professional tax advice. GST law and rates change frequently.</p>
        <p>For decisions specific to your business, please consult a qualified Chartered Accountant or tax practitioner. Simplified Tax India and the SimpliInvoice tool are not a substitute for professional advice.</p>
      </div>
    </div>
  </section>
);
