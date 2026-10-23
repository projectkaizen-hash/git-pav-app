import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { CustomGrillzPage } from "@/components/custom-grillz/grillz-page";

export const Route = createFileRoute("/custom-grillz")({
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-[#fffdf9] text-fg">
      <Header />
      <CustomGrillzPage />
      <Footer />
    </div>
  );
}
