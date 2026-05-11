import { useState } from "react";
import { Menu, X, FileText } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "#invoice", label: "Generator" },
  { href: "#how-to-use", label: "How to Use" },
  { href: "#guide", label: "GST Guide" },
  { href: "#tax-vs-bos", label: "Tax Invoice vs BoS" },
  { href: "#cgst-vs-igst", label: "CGST vs IGST" },
  { href: "#composition", label: "Composition" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="no-print sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-app flex h-16 items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-base font-bold">SimpliInvoice</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Simplified Tax India</div>
          </div>
        </a>

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild size="sm" className="hidden bg-gradient-primary text-primary-foreground shadow-md-soft hover:opacity-90 sm:inline-flex">
            <a href="#invoice">Create Invoice</a>
          </Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border/60 lg:hidden", open ? "block" : "hidden")}>
        <div className="container-app grid grid-cols-2 gap-1 py-3">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
};
