import { Smartphone, WifiOff, Zap, Star } from "lucide-react";

const APP_URL = "https://play.google.com/store/apps/details?id=com.simplifiedtaxindia.simpliinvoice";

export const AndroidApp = () => (
  <section id="android" className="bg-gradient-hero py-16">
    <div className="container-app">
      <div className="surface-card overflow-hidden">
        <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <span className="accent-pill"><Smartphone className="h-3.5 w-3.5 text-accent" /> Mobile</span>
            <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
              Get the <span className="text-gradient">SimpliInvoice</span> Android app
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Use SimpliInvoice on Android for a faster offline invoicing experience.
              Generate, save and share GST invoices straight from your phone — even without internet.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: WifiOff, label: "Works offline" },
                { icon: Zap, label: "Faster on mobile" },
                { icon: Star, label: "Free download" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-background/60 p-3 text-center backdrop-blur">
                  <f.icon className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-medium">{f.label}</span>
                </div>
              ))}
            </div>
            <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-foreground px-5 py-3 text-background shadow-glow transition-transform hover:-translate-y-0.5">
              <svg viewBox="0 0 512 512" className="h-7 w-7" aria-hidden>
                <path fill="#34A853" d="M325.3 234.3 104.7 13.7c-3.3-3.3-7.7-5.1-12.4-5.1L325.3 234.3z" />
                <path fill="#FBBC04" d="M407.7 234.3 91.4 8.6 91.3 8.5l234 225.8 82.4 82.5c8.7-8.5 8.7-22.4 0-30.5z" />
                <path fill="#EA4335" d="M91.4 8.6c-2.4 1.4-4.4 3.4-5.7 5.8L91.4 8.6z" />
                <path fill="#4285F4" d="M85.7 14.4C84.3 16.9 83.5 19.7 83.5 22.5v467c0 2.8.8 5.6 2.2 8.1l239.6-239.3L85.7 14.4z" />
                <path fill="#FBBC04" d="M325.3 277.7 91.4 503.4c1.3 2.4 3.3 4.4 5.7 5.8l316.3-225.7c8.7-8.1 8.7-22 0-30.5l-87.7-87.5z" opacity="0.001" />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase tracking-wider opacity-70">Get it on</div>
                <div className="font-display text-lg font-semibold">Google Play</div>
              </div>
            </a>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute -inset-6 rounded-[3rem] bg-gradient-primary opacity-30 blur-2xl" />
              <div className="relative h-[440px] w-[220px] animate-float rounded-[2.5rem] border-[10px] border-foreground bg-background p-2 shadow-lg-soft">
                <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground" />
                <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.8rem] bg-gradient-hero p-3">
                  <div className="mt-7 flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-gradient-primary" />
                    <div className="text-[10px] font-bold">SimpliInvoice</div>
                  </div>
                  <div className="mt-3 rounded-xl bg-background p-2.5 shadow-sm-soft">
                    <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Tax Invoice</div>
                    <div className="mt-1 text-[10px] font-semibold">INV-2025-001</div>
                    <div className="mt-2 h-1.5 w-3/4 rounded bg-muted" />
                    <div className="mt-1 h-1.5 w-1/2 rounded bg-muted" />
                  </div>
                  <div className="mt-2 flex-1 rounded-xl bg-background p-2.5 shadow-sm-soft">
                    <div className="space-y-1.5">
                      {[1,2,3].map((i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="h-1.5 w-2/3 rounded bg-muted" />
                          <div className="h-1.5 w-8 rounded bg-accent/60" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 rounded-lg bg-gradient-primary p-2 text-center text-[9px] font-bold text-primary-foreground">
                      ₹ 11,800
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);
