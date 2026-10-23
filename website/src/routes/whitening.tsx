import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { WhiteningPage } from "@/components/whitening/whitening-page";

export const Route = createFileRoute("/whitening")({
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-[#fffdf9] text-fg">
      <Header />
      <div className="pt-16">
        <WhiteningPage />
      </div>
      <Footer />
    </div>
  );
}
