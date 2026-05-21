import { ArrowRight, BookOpen, Coins, ScrollText, Wallet } from "lucide-react";

const cards = [
  { icon: BookOpen, title: "GST basics", desc: "Plain-English guides to GST registration, returns, ITC and rates for Indian businesses." },
  { icon: Coins, title: "Income tax updates", desc: "Latest changes to income tax slabs, deductions, TDS and ITR filing — explained simply." },
  { icon: ScrollText, title: "Compliance guides", desc: "Step-by-step compliance checklists for proprietors, LLPs and Pvt Ltd companies." },
  { icon: Wallet, title: "Small business finance", desc: "Practical money tips, MSME schemes and bookkeeping basics for Indian founders." },
];

export const BlogPromo = () => (
  <section id="blog" className="container-app py-16">
    <div className="surface-card overflow-hidden p-8 sm:p-12">
      <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <span className="accent-pill"><BookOpen className="h-3.5 w-3.5 text-accent" /> Learn More from Simplified Tax India</span>
          <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
            Free, simple <span className="text-gradient">GST & tax guides</span> for Indian businesses
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Explore simple GST, tax and compliance guides written for Indian small businesses and professionals.
          </p>
          <a href="https://simplifiedtaxindia.blogspot.com" target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:opacity-90">
            Visit Simplified Tax India Blog <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((c) => (
            <div key={c.title} className="rounded-xl border border-border bg-background/60 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md-soft">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <c.icon className="h-4.5 w-4.5" />
              </div>
              <div className="mt-3 font-display text-sm font-semibold">{c.title}</div>
              <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);
