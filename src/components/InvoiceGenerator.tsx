import { useState, useEffect, useCallback } from "react";
import { InvoiceState } from "@/lib/invoiceTypes";
import { emptyState } from "@/lib/invoiceDefaults";
import { loadSellerProfile } from "@/lib/storage";
import { isConnected } from "@/lib/googleAuth";
import { syncNow } from "@/lib/driveSync";
import { InvoiceForm } from "./InvoiceForm";
import { InvoicePreview } from "./InvoicePreview";
import { GoogleSyncButton } from "./GoogleSyncButton";
import { Button } from "@/components/ui/button";
import { Printer, RotateCcw, Eye } from "lucide-react";
import { toast } from "sonner";

export const InvoiceGenerator = () => {
  const [state, setState] = useState<InvoiceState>(emptyState);
  // Bumped every time a sync changes local data, so child components
  // (InvoiceForm's buyers/catalog lists) know to re-read storage.
  const [syncKey, setSyncKey] = useState(0);

  const refreshSellerFromStorage = useCallback(() => {
    const savedSeller = loadSellerProfile();
    if (savedSeller) {
      setState((s) => ({ ...s, seller: savedSeller }));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      // If already connected from a previous session, quietly pull the
      // latest synced data before loading the seller profile — so opening
      // the app on a second device starts from up-to-date info, not
      // whatever was last saved locally on this one.
      if (isConnected()) {
        try {
          await syncNow();
          setSyncKey((k) => k + 1);
        } catch {
          // Silent — the app still works fully offline. The user can
          // retry any time via the "Sync Now" button.
        }
      }
      refreshSellerFromStorage();
    };
    init();
  }, [refreshSellerFromStorage]);

  const handleSynced = () => {
    refreshSellerFromStorage();
    setSyncKey((k) => k + 1);
  };

  const handlePrint = () => {
    const seller = state.seller.name.trim() || "Seller";
    const invoiceNo = (state.invoiceNumber.trim() || "Draft").replace(/\//g, "-");
    const customTitle = `${seller}_${invoiceNo}_SimpliInvoice_Free GST Invoice Generator`;
    const originalTitle = document.title;
    document.title = customTitle;
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
  };
  
  const handleReset = () => {
    if (confirm("Clear the current invoice? This cannot be undone.")) {
      setState({ ...emptyState, items: [{ ...emptyState.items[0], id: crypto.randomUUID() }] });
      toast.success("Invoice cleared");
      window.scrollTo({ top: document.getElementById("invoice")?.offsetTop ?? 0, behavior: "smooth" });
    }
  };

  return (
    <section id="invoice" className="container-app py-16 sm:py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="no-print">
          <span className="accent-pill"><Eye className="h-3.5 w-3.5 text-accent" /> Live preview</span>
          <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Invoice Generator</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">Fill the form on the left — your A4 invoice updates instantly on the right. When ready, hit Print to save as PDF.</p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <GoogleSyncButton onSynced={handleSynced} />
          <Button variant="outline" onClick={handleReset}><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
          <Button onClick={handlePrint} className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90">
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr] xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="no-print">
          <InvoiceForm state={state} setState={setState} syncKey={syncKey} />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <InvoicePreview state={state} />
        </div>
      </div>
    </section>
  );
};
