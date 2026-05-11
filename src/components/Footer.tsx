import { FileText } from "lucide-react";

const cols = [
  { title: "Tool", links: [
    { label: "Invoice Generator", href: "#invoice" },
    { label: "How to Use", href: "#how-to-use" },
    { label: "Android App", href: "#android" },
  ]},
  { title: "Learn", links: [
    { label: "GST Invoice Guide", href: "#guide" },
    { label: "Tax Invoice vs BoS", href: "#tax-vs-bos" },
    { label: "CGST/SGST vs IGST", href: "#cgst-vs-igst" },
    { label: "Composition Rules", href: "#composition" },
  ]},
  { title: "Company", links: [
    { label: "About", href: "#about" },
    { label: "Contact", href: "#contact" },
    { label: "Blog", href: "https://simplifiedtaxindia.blogspot.com" },
  ]},
  { title: "Legal", links: [
    { label: "Privacy Policy", href: "#privacy" },
    { label: "Terms of Use", href: "#terms" },
    { label: "Disclaimer", href: "#disclaimer" },
  ]},
];

export const Footer = () => (
  <footer className="no-print border-t border-border bg-secondary/30">
    <div className="container-app py-12">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-bold">SimpliInvoice</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">by Simplified Tax India</div>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            A free, browser-based GST invoice generator for Indian small businesses, freelancers and traders.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.title}</div>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-foreground/80 hover:text-foreground" target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
        <div>© {new Date().getFullYear()} Simplified Tax India · SimpliInvoice. All rights reserved.</div>
        <div>Made with care for Indian businesses 🇮🇳</div>
      </div>
    </div>
  </footer>
);
