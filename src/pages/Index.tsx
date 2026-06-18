import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { InvoiceGenerator } from "@/components/InvoiceGenerator";
import { HowToUse, GstGuide, TaxVsBoS, CgstVsIgst, Composition, About, Contact, Privacy, Terms, Disclaimer } from "@/components/ContentSections";
import { BlogPromo } from "@/components/BlogPromo";
import { AndroidApp } from "@/components/AndroidApp";
import { Footer } from "@/components/Footer";
import { BulkInvoice } from "@/components/BulkInvoice"; // BULK FEATURE — remove this line to disable

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <InvoiceGenerator />
        <BulkInvoice /> {/* BULK FEATURE — remove this line to disable */}
        <HowToUse />
        <GstGuide />
        <TaxVsBoS />
        <CgstVsIgst />
        <Composition />
        <BlogPromo />
        <AndroidApp />
        <About />
        <Contact />
        <Privacy />
        <Terms />
        <Disclaimer />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
