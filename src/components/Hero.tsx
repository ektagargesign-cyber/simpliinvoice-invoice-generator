import { Sparkles, ShieldCheck, Zap, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section id="top" className="relative overflow-hidden bg-gradient-hero">
      <div className="container-app relative py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="accent-pill animate-fade-in-up">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            CA-backed · 100% Free · Browser-only privacy
          </span>
          <h1 className="mt-6 animate-fade-in-up font-display text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
            Premium <span className="text-gradient">GST invoices</span><br className="hidden sm:block" />
            for Indian businesses, in seconds.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl animate-fade-in-up text-base text-muted-foreground sm:text-lg">
            Create Tax Invoices, Bill of Supply and non-GST invoices with auto CGST/SGST/IGST,
            HSN/SAC, amount in words and a clean A4 print-ready preview — no signup, no data leaves your browser.
          </p>
          <div className="mt-8 flex animate-fade-in-up flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
              <a href="#invoice">Start creating invoice</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border bg-background/60 backdrop-blur">
              <a href="#how-to-use">How it works</a>
            </Button>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: ShieldCheck, label: "100% in-browser" },
              { icon: Zap, label: "Live calculations" },
              { icon: FileCheck2, label: "GST-compliant" },
              { icon: Sparkles, label: "Print-to-PDF ready" },
            ].map((f) => (
              <div key={f.label} className="surface-card flex flex-col items-center gap-2 px-3 py-4">
                <f.icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
