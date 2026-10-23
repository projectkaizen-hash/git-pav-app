import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { ToothExtractionPage } from "@/components/tooth-extraction/extraction-page";

export const Route = createFileRoute("/tooth-extraction")({
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-[#fffdf9] text-fg">
      <Header />
      <ToothExtractionPage />
      <Footer />
    </div>
  );
}
