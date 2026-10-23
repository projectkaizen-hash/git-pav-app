import { createFileRoute } from "@tanstack/react-router";
import { Header } from "@/components/home/header";
import { Footer } from "@/components/home/footer";
import { CosmeticPage } from "@/components/cosmetic/cosmetic-page";

export const Route = createFileRoute("/cosmetic")({
  component: Page,
});

function Page() {
  return (
    <div className="min-h-screen bg-[#fffdf9] text-fg">
      <Header />
      <CosmeticPage />
      <Footer />
    </div>
  );
}
